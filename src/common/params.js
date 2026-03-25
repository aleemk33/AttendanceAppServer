/** Safely extract a string param from Express 5 request.params (which can be string | string[]). */
export function param(req, name) {
    const val = req.params[name];
    if (Array.isArray(val))
        return val[0] ?? '';
    return val ?? '';
}
//# sourceMappingURL=params.js.map