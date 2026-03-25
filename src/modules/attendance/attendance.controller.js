import { sendSuccess, sendCreated } from '../../common/response.js';
import * as attendanceService from './attendance.service.js';
export async function punchIn(req, res) {
    // Device ID is supplied as a header so client payload shape stays stable.
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'x-device-id header is required' } });
        return;
    }
    const punch = await attendanceService.punchIn(req.user.sub, req.body.latitude, req.body.longitude, deviceId);
    sendCreated(res, punch, 'Punched in');
}
export async function punchOut(req, res) {
    const deviceId = req.headers['x-device-id'];
    if (!deviceId) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'x-device-id header is required' } });
        return;
    }
    const punch = await attendanceService.punchOut(req.user.sub, deviceId);
    sendSuccess(res, punch, undefined, 'Punched out');
}
export async function myAttendanceOverview(req, res) {
    const { startDate, endDate, includeHolidayHistory } = req.query;
    const result = await attendanceService.getUserAttendanceOverview(req.user.sub, startDate, endDate, includeHolidayHistory === 'true');
    sendSuccess(res, result);
}
export async function webUserAttendanceOverview(req, res) {
    const { startDate, endDate, includeHolidayHistory } = req.query;
    const result = await attendanceService.getUserAttendanceOverview(req.params.userId, startDate, endDate, includeHolidayHistory === 'true');
    sendSuccess(res, result);
}
export async function webAttendanceOverview(req, res) {
    // Query values are strings by default; normalize numeric pagination manually.
    const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    };
    const result = await attendanceService.getWebAttendanceOverview(req.user.roles, req.user.sub, filters);
    sendSuccess(res, result.items, { ...result.meta, range: result.range, aggregate: result.aggregate });
}
export async function webAttendanceRecords(req, res) {
    const result = await attendanceService.getWebAttendanceRecords(req.user.roles, req.user.sub, req.query);
    sendSuccess(res, result.items, { ...result.meta, range: result.range });
}
export async function upsertRegularization(req, res) {
    const result = await attendanceService.upsertRegularization(req.user.roles, req.user.sub, req.params.userId, req.params.date, req.body);
    sendSuccess(res, result, undefined, 'Regularization saved');
}
export async function deleteRegularization(req, res) {
    await attendanceService.deleteRegularization(req.user.roles, req.user.sub, req.params.userId, req.params.date);
    sendSuccess(res, null, undefined, 'Regularization deleted');
}
//# sourceMappingURL=attendance.controller.js.map
