/**
 * Sends a standardized success response.
 * Use this helper instead of `res.json` directly so API shape stays consistent.
 */
export function sendSuccess(res, data, meta, message, statusCode = 200) {
    const body = { success: true, data };
    if (message)
        body.message = message;
    if (meta)
        body.meta = meta;
    res.status(statusCode).json(body);
}
// Convenience wrapper for HTTP 201.
export function sendCreated(res, data, message) {
    sendSuccess(res, data, undefined, message, 201);
}
// Centralized error payload helper used by error middleware and a few direct checks.
export function sendError(res, statusCode, code, message, details) {
    const body = {
        success: false,
        error: { code, message },
    };
    if (details !== undefined)
        body.error.details = details;
    res.status(statusCode).json(body);
}
//# sourceMappingURL=response.js.map