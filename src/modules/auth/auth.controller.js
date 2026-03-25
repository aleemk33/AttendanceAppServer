import { sendSuccess } from '../../common/response.js';
import * as authService from './auth.service.js';
// Controller layer is intentionally thin: parse request -> service -> standardized response.
export async function mobileGoogleLogin(req, res) {
    const { googleToken, deviceId } = req.body;
    const result = await authService.loginMobile(googleToken, deviceId);
    sendSuccess(res, result, undefined, 'Login successful');
}
export async function webGoogleLogin(req, res) {
    const { googleToken } = req.body;
    const result = await authService.loginWeb(googleToken);
    sendSuccess(res, result, undefined, 'Login successful');
}
export async function refreshToken(req, res) {
    const { refreshToken } = req.body;
    // Variable name mirrors API contract, even though it shadows function name.
    const result = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, result);
}
export async function logoutHandler(req, res) {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    sendSuccess(res, null, undefined, 'Logged out');
}
export async function requestDeviceChange(req, res) {
    const { googleToken, deviceId, reason } = req.body;
    const result = await authService.requestDeviceChangeViaGoogle(googleToken, deviceId, reason);
    sendSuccess(res, result, undefined, 'Device change request submitted');
}
//# sourceMappingURL=auth.controller.js.map