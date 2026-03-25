import { BadRequestError } from "../common/errors.js";
/**
 * Runtime schema validation middleware.
 * Successful parses overwrite request data with normalized/coerced values.
 */
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const formatted = result.error.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      throw new BadRequestError("Validation failed", formatted);
    }
    // Preserve validated/coerced data (numbers/booleans/date strings) for handlers.
    // For 'query' and 'params', use defineProperty to shadow the getter with validated data.
    if (source === "query" || source === "params") {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      req[source] = result.data;
    }
    next();
  };
}
//# sourceMappingURL=validate.js.map
