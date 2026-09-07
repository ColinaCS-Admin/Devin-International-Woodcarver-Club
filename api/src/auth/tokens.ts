import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
  sub: string;
  alias: string;
  roles: string[];
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.accessTokenTtl,
    audience: 'woodcarver-api',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Pick<TokenPayload, 'sub'>): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.refreshTokenTtl,
    audience: 'woodcarver-refresh',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret, {
    audience: 'woodcarver-api',
  }) as TokenPayload;
}

export function verifyRefreshToken(token: string): Pick<TokenPayload, 'sub'> {
  return jwt.verify(token, config.jwtSecret, {
    audience: 'woodcarver-refresh',
  }) as Pick<TokenPayload, 'sub'>;
}

export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
