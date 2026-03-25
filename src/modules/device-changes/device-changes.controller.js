import { sendSuccess, sendCreated } from '../../common/response.js';
import * as dcService from './device-changes.service.js';
// HTTP handlers for device change workflow.
export async function createDeviceChangeRequest(req, res) {
    const result = await dcService.createDeviceChangeRequest(req.user.sub, req.body);
    sendCreated(res, result, 'Device change request created');
}
export async function getMyDeviceChangeRequests(req, res) {
    const filters = {
        status: req.query.status,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    };
    const result = await dcService.getMyDeviceChangeRequests(req.user.sub, filters);
    sendSuccess(res, result.items, result.meta);
}
export async function listDeviceChangeRequestsWeb(req, res) {
    const filters = {
        status: req.query.status,
        search: req.query.search,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    };
    const result = await dcService.listDeviceChangeRequestsWeb(req.user.roles, req.user.sub, filters);
    sendSuccess(res, result.items, result.meta);
}
export async function approveDeviceChange(req, res) {
    const result = await dcService.approveDeviceChange(req.user.roles, req.user.sub, req.params.requestId, req.body?.actionNote);
    sendSuccess(res, result, undefined, 'Device change approved');
}
export async function rejectDeviceChange(req, res) {
    const result = await dcService.rejectDeviceChange(req.user.roles, req.user.sub, req.params.requestId, req.body.actionNote);
    sendSuccess(res, result, undefined, 'Device change rejected');
}
//# sourceMappingURL=device-changes.controller.js.map