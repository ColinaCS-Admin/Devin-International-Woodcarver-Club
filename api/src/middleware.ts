import type { NextFunction, Request, Response } from 'express';
import { HttpError, forbidden, unauthorized } from './errors.js';
import { verifyAccessToken, type TokenPayload } from './auth/tokens.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized('Missing bearer token'));
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function requireRole(role: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!req.user.roles.includes(role)) {
      next(forbidden(`Requires the ${role} role`));
      return;
    }
    next();
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).type('application/problem+json').json({
      type: 'about:blank',
      title: error.title,
      status: error.status,
      detail: error.detail,
      errors: error.errors,
    });
    return;
  }
  console.error(error);
  res.status(500).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
  });
}
