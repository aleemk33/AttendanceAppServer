import { Router } from 'express';
import { authenticate, requirePortal, requireRoles } from '../../middlewares/index.js';
import { validate } from '../../middlewares/validate.js';
import { authController, googleLoginWebSchema, refreshTokenSchema } from '../../modules/auth/index.js';
import { usersController, createUserSchema, updateUserSchema, listUsersQuerySchema, attendanceProfileSchema } from '../../modules/users/index.js';
import { attendanceController, regularizationSchema, webAttendanceRecordsQuerySchema } from '../../modules/attendance/index.js';
import { leavesController, leaveActionSchema, leaveRejectSchema } from '../../modules/leaves/index.js';
import { deviceChangesController, deviceChangeActionSchema, deviceChangeRejectSchema } from '../../modules/device-changes/index.js';
import { holidaysController, createHolidaySchema, updateHolidaySchema, deleteHolidaySchema } from '../../modules/holidays/index.js';
import { dashboardController } from '../../modules/dashboard/index.js';
import { Portal, Role } from '@prisma/client';
const router = Router();
// Public auth endpoints (login / refresh / logout).
router.post('/auth/google/login', validate(googleLoginWebSchema), authController.webGoogleLogin);
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/auth/logout', validate(refreshTokenSchema), authController.logoutHandler);
// Protected zone: token must be WEB portal. Fine-grained roles applied per route.
router.use(authenticate, requirePortal(Portal.WEB));
// Profile
router.get('/me/profile', usersController.getMyProfile);
// Dashboard
router.get('/dashboard/overview', requireRoles(Role.MANAGER, Role.ADMIN), dashboardController.webDashboard);
// Users
router.get('/users', requireRoles(Role.MANAGER, Role.ADMIN), validate(listUsersQuerySchema, 'query'), usersController.listUsers);
router.post('/users', requireRoles(Role.MANAGER, Role.ADMIN), validate(createUserSchema), usersController.createUser);
router.get('/users/:userId', requireRoles(Role.MANAGER, Role.ADMIN), usersController.getUser);
router.patch('/users/:userId', requireRoles(Role.MANAGER, Role.ADMIN), validate(updateUserSchema), usersController.updateUser);
// Attendance profiles
router.get('/users/:userId/attendance-profile', requireRoles(Role.MANAGER, Role.ADMIN), usersController.getAttendanceProfile);
router.put('/users/:userId/attendance-profile', requireRoles(Role.MANAGER, Role.ADMIN), validate(attendanceProfileSchema), usersController.updateAttendanceProfile);
// Attendance overview
router.get('/attendance/overview', requireRoles(Role.MANAGER, Role.ADMIN), attendanceController.webAttendanceOverview);
router.get('/attendance/records', requireRoles(Role.MANAGER, Role.ADMIN), validate(webAttendanceRecordsQuerySchema, 'query'), attendanceController.webAttendanceRecords);
router.get('/users/:userId/attendance/overview', requireRoles(Role.MANAGER, Role.ADMIN), attendanceController.webUserAttendanceOverview);
// Regularizations
router.put('/users/:userId/attendance-regularizations/:date', requireRoles(Role.MANAGER, Role.ADMIN), validate(regularizationSchema), attendanceController.upsertRegularization);
router.delete('/users/:userId/attendance-regularizations/:date', requireRoles(Role.MANAGER, Role.ADMIN), attendanceController.deleteRegularization);
// Leave requests
router.get('/leave-requests', requireRoles(Role.MANAGER, Role.ADMIN), leavesController.listLeaveRequestsWeb);
router.get('/leave-requests/:leaveRequestId', requireRoles(Role.MANAGER, Role.ADMIN), leavesController.getLeaveRequestWeb);
router.patch('/leave-requests/:leaveRequestId/approve', requireRoles(Role.MANAGER, Role.ADMIN), validate(leaveActionSchema), leavesController.approveLeaveRequest);
router.patch('/leave-requests/:leaveRequestId/reject', requireRoles(Role.MANAGER, Role.ADMIN), validate(leaveRejectSchema), leavesController.rejectLeaveRequest);
// Device change requests
router.get('/device-change-requests', requireRoles(Role.MANAGER, Role.ADMIN), deviceChangesController.listDeviceChangeRequestsWeb);
router.patch('/device-change-requests/:requestId/approve', requireRoles(Role.MANAGER, Role.ADMIN), validate(deviceChangeActionSchema), deviceChangesController.approveDeviceChange);
router.patch('/device-change-requests/:requestId/reject', requireRoles(Role.MANAGER, Role.ADMIN), validate(deviceChangeRejectSchema), deviceChangesController.rejectDeviceChange);
// Holidays: read for manager/admin, mutate/delete for admin only.
router.get('/holidays', requireRoles(Role.MANAGER, Role.ADMIN), holidaysController.listHolidays);
router.get('/holidays/:holidayId', requireRoles(Role.MANAGER, Role.ADMIN), holidaysController.getHoliday);
router.get('/holidays/:holidayId/history', requireRoles(Role.MANAGER, Role.ADMIN), holidaysController.getHolidayHistory);
router.post('/holidays', requireRoles(Role.ADMIN), validate(createHolidaySchema), holidaysController.createHoliday);
router.patch('/holidays/:holidayId', requireRoles(Role.ADMIN), validate(updateHolidaySchema), holidaysController.updateHoliday);
router.delete('/holidays/:holidayId', requireRoles(Role.ADMIN), validate(deleteHolidaySchema), holidaysController.deleteHoliday);
export default router;
//# sourceMappingURL=index.js.map
