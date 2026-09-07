import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../asyncHandler.js';
import { hashPassword, passwordPolicyErrors, verifyPassword } from '../auth/password.js';
import {
  createResetToken,
  hashResetToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../auth/tokens.js';
import { config } from '../config.js';
import { query } from '../db.js';
import { unauthorized, unprocessable } from '../errors.js';
import { findMemberByIdentifier } from '../members/repository.js';
import { parse } from '../validation.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RESET_TOKEN_MINUTES = 30;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const REFRESH_COOKIE = 'woodcarver_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ identifier: z.string().min(1), password: z.string().min(1) }),
      req.body,
    );

    const member = await findMemberByIdentifier(body.identifier);
    if (!member?.password_hash) {
      throw unauthorized();
    }
    if (member.locked_until && member.locked_until > new Date()) {
      throw unauthorized('Account temporarily locked. Try again later.');
    }

    const valid = await verifyPassword(body.password, member.password_hash);
    if (!valid) {
      const attempts = member.failed_attempts + 1;
      await query(
        `UPDATE woodcarver.member_credential
            SET failed_attempts = $2::int,
                locked_until = CASE WHEN $2::int >= $3::int
                                    THEN now() + ($4::text || ' minutes')::interval END
          WHERE member_id = $1`,
        [member.member_id, attempts, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES],
      );
      throw unauthorized();
    }

    if (member.active_ind !== 'Y') {
      throw unauthorized('Account is not active. Contact an administrator.');
    }

    await query(
      `UPDATE woodcarver.member_credential SET failed_attempts = 0, locked_until = NULL
        WHERE member_id = $1`,
      [member.member_id],
    );

    const payload = {
      sub: String(member.member_id),
      alias: member.member_alias,
      roles: member.roles,
    };
    res.cookie(REFRESH_COOKIE, signRefreshToken({ sub: payload.sub }), refreshCookieOptions());
    res.json({ accessToken: signAccessToken(payload), roles: member.roles });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!token) throw unauthorized('Missing refresh token');

    let sub: string;
    try {
      sub = verifyRefreshToken(token).sub;
    } catch {
      throw unauthorized('Invalid refresh token');
    }

    const result = await query<{ member_alias: string; active_ind: string; roles: string[] }>(
      `SELECT m.member_alias,
              m.active_ind,
              COALESCE(ARRAY(SELECT role_code FROM woodcarver.member_role mr
                              WHERE mr.member_id = m.member_id), '{}') AS roles
         FROM woodcarver.member m WHERE m.member_id = $1`,
      [sub],
    );
    const member = result.rows[0];
    if (!member || member.active_ind !== 'Y') throw unauthorized('Account is not active');

    res.json({
      accessToken: signAccessToken({ sub, alias: member.member_alias, roles: member.roles }),
      roles: member.roles,
    });
  }),
);

authRouter.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.status(204).send();
});

authRouter.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(z.object({ identifier: z.string().min(1) }), req.body);
    const member = await findMemberByIdentifier(body.identifier);

    if (member) {
      const { token, tokenHash } = createResetToken();
      await query(
        `INSERT INTO woodcarver.password_reset_token (token_hash, member_id, expires_at)
         VALUES ($1, $2, now() + ($3::text || ' minutes')::interval)`,
        [tokenHash, member.member_id, RESET_TOKEN_MINUTES],
      );
      // Delivery is handled by the notification service; the token is never returned
      // in the response so the endpoint cannot be used to enumerate accounts.
      console.info(
        `[password-reset] issued token for member ${member.member_id}` +
          (config.isProduction ? '' : `: ${token}`),
      );
    }

    res.status(202).json({
      message: 'If the account exists, password reset instructions have been sent.',
    });
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = parse(
      z.object({ token: z.string().min(1), newPassword: z.string().min(1) }),
      req.body,
    );

    const policyErrors = passwordPolicyErrors(body.newPassword);
    if (policyErrors.length > 0) throw unprocessable({ newPassword: policyErrors });

    const result = await query<{ member_id: string }>(
      `UPDATE woodcarver.password_reset_token
          SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING member_id`,
      [hashResetToken(body.token)],
    );
    const row = result.rows[0];
    if (!row) throw unauthorized('Reset token is invalid or has expired');

    await query(
      `UPDATE woodcarver.member_credential
          SET password_hash = $2, password_set_at = now(), failed_attempts = 0, locked_until = NULL
        WHERE member_id = $1`,
      [row.member_id, await hashPassword(body.newPassword)],
    );

    res.status(204).send();
  }),
);
