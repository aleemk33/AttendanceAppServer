/**
 * Base application error with stable API-facing error `code`.
 * Any error extending AppError will be serialized by the global error handler.
 */
export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
export class BadRequestError extends AppError {
    constructor(message, details) {
        super(400, 'BAD_REQUEST', message, details);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, 'UNAUTHORIZED', message);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, 'FORBIDDEN', message);
    }
}
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(404, 'NOT_FOUND', `${resource} not found`);
    }
}
export class ConflictError extends AppError {
    constructor(message) {
        super(409, 'CONFLICT', message);
    }
}
//# sourceMappingURL=errors.js.map