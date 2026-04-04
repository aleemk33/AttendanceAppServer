import { BadRequestError } from "../common/errors.js";

/**
 * Middleware that validates presence of X-Device-Id header.
 * Used for mobile endpoints that require device identification.
 *
 * Sets req.deviceId for use in downstream handlers.
 */
export function requireDeviceId(req, _res, next) {
  const deviceId = req.headers["x-device-id"];
  if (!deviceId) {
    throw new BadRequestError("x-device-id header is required");
  }
  req.deviceId = deviceId;
  next();
}
