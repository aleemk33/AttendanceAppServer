import { BadRequestError } from '../common/errors.js';

/**
 * Middleware to extract and validate the x-device-id header.
 * Used by mobile endpoints that require device binding (punch-in/punch-out).
 */
export function requireDeviceId(req, _res, next) {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) {
    throw new BadRequestError('x-device-id header is required');
  }
  req.deviceId = deviceId;
  next();
}
