import { Router } from 'express';
import { authenticate, requirePortal, requireRoles } from '../../middlewares/index.js';
import { validate } from '../../middlewares/validate.js';
import { authController, googleLoginMobileSchema, refreshTokenSchema, deviceChangeRequestSchema } from '../../modules/auth/index.js';
import { usersController } from '../../modules/users/index.js';
import { attendanceController, punchInSchema } from '../../modules/attendance/index.js';
import { leavesController, createLeaveRequestSchema } from '../../modules/leaves/index.js';
import { deviceChangesController, createDeviceChangeSchema } from '../../modules/device-changes/index.js';
import { dashboardController } from '../../modules/dashboard/index.js';
import { Portal, Role } from '@prisma/client';
const router = Router();
// Public auth endpoints (no bearer token required).
router.post('/auth/google/login', validate(googleLoginMobileSchema), authController.mobileGoogleLogin);
router.post('/auth/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/auth/logout', validate(refreshTokenSchema), authController.logoutHandler);
router.post('/auth/device-change-request', validate(deviceChangeRequestSchema), authController.requestDeviceChange);
// Protected zone: token must be MOBILE portal + EMPLOYEE role.
router.use(authenticate, requirePortal(Portal.MOBILE), requireRoles(Role.EMPLOYEE));
// Profile
router.get('/me/profile', usersController.getMyProfile);
// Dashboard
router.get('/me/dashboard', dashboardController.mobileDashboard);
// Attendance
router.get('/me/attendance/overview', attendanceController.myAttendanceOverview);
router.post('/me/attendance/punch-in', validate(punchInSchema), attendanceController.punchIn);
router.post('/me/attendance/punch-out', attendanceController.punchOut);
// Leave requests
router.get('/me/leave-requests', leavesController.getMyLeaveRequests);
router.get('/me/leave-requests/:leaveRequestId', leavesController.getMyLeaveRequest);
router.post('/me/leave-requests', validate(createLeaveRequestSchema), leavesController.createLeaveRequest);
router.patch('/me/leave-requests/:leaveRequestId/cancel', leavesController.cancelLeaveRequest);
// Device change requests
router.get('/me/device-change-requests', deviceChangesController.getMyDeviceChangeRequests);
router.post('/me/device-change-requests', validate(createDeviceChangeSchema), deviceChangesController.createDeviceChangeRequest);
export default router;
//# sourceMappingURL=index.js.map