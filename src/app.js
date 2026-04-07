import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './middlewares/error-handler.js';
import mobileRoutes from './routes/mobile/index.js';
import webRoutes from './routes/web/index.js';
import { sendSuccess } from './common/response.js';
/**
 * Creates the full Express application with:
 * - cross-cutting middleware (security, compression, CORS, logging)
 * - public utility routes (`/health`)
 * - versioned API route groups (`/api/v1/mobile`, `/api/v1/web`)
 * - terminal error handler
 */
export function createApp() {
    const app = express();
    const e = env();
    // Security headers and payload compression are safe defaults for all routes.
    app.use(helmet());
    app.use(compression());
    // Web client uses cookies/credentials in some deployments, so credentials are enabled.
    app.use(cors({ origin: e.CORS_WEB_ORIGIN, credentials: true }));
    app.use(express.json());
    // Disable HTTP request logging in tests to keep test output clean and deterministic.
    if (e.NODE_ENV !== 'test') {
        app.use(pinoHttp({ logger }));
    }
    // Lightweight liveness endpoint used by probes/monitoring.
    app.get('/health', (_req, res) => {
        sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
    });
    // Keep portal routes isolated so auth/authorization policies can differ cleanly.
    app.use('/api/v1/mobile', mobileRoutes);
    app.use('/api/v1/web', webRoutes);
    // Must be the last middleware so it can catch downstream sync/async errors.
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map
