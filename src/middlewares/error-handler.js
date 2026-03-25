import { AppError } from '../common/errors.js';
import { sendError } from '../common/response.js';
import { logger } from '../config/logger.js';
export function errorHandler(err, req, res, _next) {
    // Controlled/domain errors are sent as-is to keep API contracts stable.
    if (err instanceof AppError) {
        sendError(res, err.statusCode, err.code, err.message, err.details);
        return;
    }
    // Unknown errors are logged with request context, but response stays generic.
    logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
    sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
}
//# sourceMappingURL=error-handler.js.map