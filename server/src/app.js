import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requireSameOrigin } from './middleware/requireSameOrigin.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

// Builds the Express application. It is separate from server.js (which starts listening)
// so the same app can be tested without opening a real network port.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // In production the app sits behind a host proxy (HTTPS terminates there).
  // Trusting one proxy hop lets Express see the real protocol and client address.
  app.set('trust proxy', env.isProduction ? 1 : false);

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api', requireSameOrigin);
  app.use('/api', apiRouter);
  app.use('/api', notFound);

  // Production: Express also serves the built React app, so the frontend and API
  // share one origin. In development, Vite serves the frontend instead.
  if (env.isProduction) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
