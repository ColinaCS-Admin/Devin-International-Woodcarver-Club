import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware.js';
import { authRouter } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { referenceRouter } from './routes/reference.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/members', membersRouter);
  app.use('/api/v1', referenceRouter);

  app.use(errorHandler);
  return app;
}
