import pino from 'pino';
import { env } from './env.js';
function createLogger() {
    const e = env();
    return pino({
        // Runtime log verbosity is fully environment-driven.
        level: e.LOG_LEVEL,
        // Never emit credentials/tokens in logs.
        redact: {
            paths: [
                "req.headers.authorization",
                "req.headers.Authorization",
                "req.headers.cookie",
                "req.headers.Cookie",
                "res.headers['set-cookie']",
                "res.headers['Set-Cookie']",
            ],
            censor: "[REDACTED]",
        },
        // Pretty transport is development-only to avoid performance penalty in prod.
        transport: e.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    });
}
export const logger = createLogger();
//# sourceMappingURL=logger.js.map
