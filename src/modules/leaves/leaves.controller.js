import { sendSuccess, sendCreated } from '../../common/response.js';
import * as leavesService from './leaves.service.js';
// Thin transport/controller wrapper around leave domain rules.
export async function createLeaveRequest(req, res) {
    const result = await leavesService.createLeaveRequest(req.user.sub, req.body);
    sendCreated(res, result, 'Leave request created');
}
export async function getMyLeaveRequests(req, res) {
    // Manual parsing remains here since mobile endpoint doesn't have validation wired
    const filters = {
        status: req.query.status,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
    };
    const result = await leavesService.getMyLeaveRequests(req.user.sub, filters);
    sendSuccess(res, result.items, result.meta);
}
export async function getMyLeaveRequest(req, res) {
    const result = await leavesService.getLeaveRequestById(req.user.sub, req.params.leaveRequestId);
    sendSuccess(res, result);
}
export async function cancelLeaveRequest(req, res) {
    const result = await leavesService.cancelLeaveRequest(req.user.sub, req.params.leaveRequestId);
    sendSuccess(res, result, undefined, 'Leave request cancelled');
}
export async function listLeaveRequestsWeb(req, res) {
    // Query is validated by middleware (page/limit are already numbers)
    const result = await leavesService.listLeaveRequestsWeb(req.user.roles, req.user.sub, req.query);
    sendSuccess(res, result.items, result.meta);
}
export async function getLeaveRequestWeb(req, res) {
    const result = await leavesService.getLeaveRequestById(null, req.params.leaveRequestId);
    sendSuccess(res, result);
}
export async function approveLeaveRequest(req, res) {
    const result = await leavesService.approveLeaveRequest(req.user.roles, req.user.sub, req.params.leaveRequestId, req.body?.actionNote);
    sendSuccess(res, result, undefined, 'Leave request approved');
}
export async function rejectLeaveRequest(req, res) {
    const result = await leavesService.rejectLeaveRequest(req.user.roles, req.user.sub, req.params.leaveRequestId, req.body.actionNote);
    sendSuccess(res, result, undefined, 'Leave request rejected');
}