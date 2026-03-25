/**
 * OpenAPI document used by Swagger UI.
 * Includes example request/response payloads to make the API self-descriptive.
 */
function successResponse(description, data, options = {}) {
    return {
        description,
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
                example: {
                    success: true,
                    ...(options.message ? { message: options.message } : {}),
                    data,
                    ...(options.meta ? { meta: options.meta } : {}),
                },
            },
        },
    };
}
function errorResponse(description, code, message, details) {
    return {
        description,
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                    success: false,
                    error: {
                        code,
                        message,
                        ...(details !== undefined ? { details } : {}),
                    },
                },
            },
        },
    };
}
function jsonRequestBody(schemaRef, example) {
    return {
        required: true,
        content: {
            'application/json': {
                schema: { $ref: schemaRef },
                ...(example !== undefined ? { example } : {}),
            },
        },
    };
}
const responseRef = (name) => ({ $ref: `#/components/responses/${name}` });
const ids = {
    employee: '6a2f08f2-cc8c-4f40-8a5f-9d4d70600111',
    manager: '5fd12b26-4be2-4578-8bdb-8710f4520222',
    admin: '3f2f7a2f-4d8b-4b65-8af7-bad0aa1b0333',
    leaveRequest: 'd9cb2645-faf9-43a5-82c6-6d0e6d950444',
    holiday: '58bb1e48-8b2c-4c97-8de7-c1e60e5f0666',
    holidayLog: '3bc35713-97ef-4ff4-9988-5003f40b0777',
    deviceChange: '0fd9cf67-6d40-4235-a2d2-0867f73a0888',
    regularization: '5a38b5e7-03ad-4ecf-a6b2-bdb65dc10999',
    punch: 'bcda6533-7f0d-4582-aa64-c39457df0a10',
};
const employeeUser = {
    id: ids.employee,
    fullName: 'Aarav Mehta',
    email: 'aarav.mehta@acme.com',
    roles: ['EMPLOYEE'],
};
const managerUser = {
    id: ids.manager,
    fullName: 'Priya Sharma',
    email: 'priya.sharma@acme.com',
    roles: ['MANAGER'],
};
const authMobileData = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mobile-access-token',
    refreshToken: 'eyJ1c2VySWQiOiI2YTJmMDhmMi1jYzhjLTRmNDAtOGE1Zi05ZDRkNzA2MDAxMTEiLCJ0b2tlbiI6Ii4uLiJ9',
    user: employeeUser,
};
const authWebData = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.web-access-token',
    refreshToken: 'eyJ1c2VySWQiOiI1ZmQxMmIyNi00YmUyLTQ1NzgtOGJkYi04NzEwZjQ1MjAyMjIiLCJ0b2tlbiI6Ii4uLiJ9',
    user: managerUser,
};
const refreshData = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.rotated-access-token',
    refreshToken: 'eyJ1c2VySWQiOiI2YTJmMDhmMi1jYzhjLTRmNDAtOGE1Zi05ZDRkNzA2MDAxMTEiLCJ0b2tlbiI6InJvdGF0ZWQifQ',
};
const punchInData = {
    id: ids.punch,
    userId: ids.employee,
    attendanceDate: '2026-03-18T00:00:00.000Z',
    punchInAt: '2026-03-18T03:16:44.000Z',
    punchOutAt: null,
    workedMinutes: null,
    createdAt: '2026-03-18T03:16:44.000Z',
    updatedAt: '2026-03-18T03:16:44.000Z',
};
const punchOutData = {
    ...punchInData,
    punchOutAt: '2026-03-18T12:05:11.000Z',
    workedMinutes: 528,
    updatedAt: '2026-03-18T12:05:11.000Z',
};
const attendanceOverviewData = {
    range: {
        startDate: '2026-03-01',
        endDate: '2026-03-18',
        appliedEndDate: '2026-03-17',
        currentDateExcluded: true,
    },
    summary: {
        presentDays: 10,
        halfDays: 2,
        absentDays: 1,
        leaveDays: 1,
        holidayDays: 1,
        weeklyOffDays: 2,
        attendancePercentage: 84.62,
    },
    days: [
        {
            date: '2026-03-17',
            dayType: 'workingDay',
            attendanceState: 'present',
            punchInAt: '2026-03-17T03:21:00.000Z',
            punchOutAt: '2026-03-17T12:02:00.000Z',
            workedMinutes: 521,
            flags: [],
            holiday: null,
            leaveRequest: null,
            regularization: null,
        },
        {
            date: '2026-03-18',
            dayType: 'workingDay',
            attendanceState: 'working',
            punchInAt: '2026-03-18T03:16:44.000Z',
            punchOutAt: null,
            workedMinutes: null,
            flags: [],
            holiday: null,
            leaveRequest: null,
            regularization: null,
        },
    ],
};
const leaveRequestData = {
    id: ids.leaveRequest,
    userId: ids.employee,
    startDate: '2026-03-24T00:00:00.000Z',
    endDate: '2026-03-25T00:00:00.000Z',
    workingDayCount: 2,
    reason: 'Family function',
    status: 'PENDING',
    actionByUserId: null,
    actionAt: null,
    actionNote: null,
    createdAt: '2026-03-18T06:00:00.000Z',
    updatedAt: '2026-03-18T06:00:00.000Z',
};
const leaveRequestWithRelations = {
    ...leaveRequestData,
    user: {
        id: ids.employee,
        fullName: 'Aarav Mehta',
        email: 'aarav.mehta@acme.com',
    },
    actionBy: {
        id: ids.manager,
        fullName: 'Priya Sharma',
    },
};
const deviceChangeRequestData = {
    id: ids.deviceChange,
    userId: ids.employee,
    currentDeviceIdSnapshot: 'android-old-0b1a',
    requestedDeviceId: 'android-new-4f8c',
    reason: 'Old phone damaged',
    status: 'PENDING',
    actionByUserId: null,
    actionAt: null,
    actionNote: null,
    createdAt: '2026-03-18T06:22:10.000Z',
    updatedAt: '2026-03-18T06:22:10.000Z',
};
const holidayData = {
    id: ids.holiday,
    title: 'Independence Day',
    description: 'National holiday',
    startDate: '2026-08-15T00:00:00.000Z',
    endDate: '2026-08-15T00:00:00.000Z',
    isDeleted: false,
    createdByUserId: ids.admin,
    updatedByUserId: null,
    createdAt: '2026-03-18T05:10:00.000Z',
    updatedAt: '2026-03-18T05:10:00.000Z',
};
const myProfileData = {
    ...employeeUser,
    manager: {
        id: ids.manager,
        fullName: 'Priya Sharma',
        email: 'priya.sharma@acme.com',
    },
    attendanceProfile: {
        boundDeviceId: 'android-new-4f8c',
        officeLatitude: 12.9716,
        officeLongitude: 77.5946,
        officeRadiusMeters: 150,
    },
};
const mobileDashboardData = {
    user: {
        id: ids.employee,
        fullName: 'Aarav Mehta',
        email: 'aarav.mehta@acme.com',
        roles: ['EMPLOYEE'],
        manager: { id: ids.manager, fullName: 'Priya Sharma' },
    },
    todayStatus: {
        date: '2026-03-18',
        status: 'working',
        punchInAt: '2026-03-18T03:16:44.000Z',
    },
    monthSummary: {
        presentDays: 10,
        halfDays: 2,
        absentDays: 1,
        leaveDays: 1,
        holidayDays: 1,
        weeklyOffDays: 2,
        attendancePercentage: 84.62,
    },
    last7ClosedDays: [
        { date: '2026-03-17', status: 'present', workedMinutes: 521 },
        { date: '2026-03-16', status: 'halfDay', workedMinutes: 270 },
    ],
    pendingLeaves: [
        {
            id: ids.leaveRequest,
            userId: ids.employee,
            startDate: '2026-03-24T00:00:00.000Z',
            endDate: '2026-03-25T00:00:00.000Z',
            status: 'PENDING',
            workingDayCount: 2,
            reason: 'Family function',
        },
    ],
    upcomingHolidays: [
        {
            id: ids.holiday,
            title: 'Independence Day',
            startDate: '2026-08-15T00:00:00.000Z',
            endDate: '2026-08-15T00:00:00.000Z',
        },
    ],
};
const webDashboardData = {
    range: {
        startDate: '2026-03-01',
        endDate: '2026-03-18',
        appliedEndDate: '2026-03-17',
        currentDateExcluded: true,
    },
    headcount: 24,
    attendanceSummary: {
        presentDays: 286,
        halfDays: 18,
        absentDays: 9,
        leaveDays: 11,
        holidayDays: 24,
        weeklyOffDays: 48,
        attendancePercentage: 94.57,
    },
    pendingLeaveCount: 3,
    pendingDeviceChangeCount: 1,
    upcomingHolidays: [
        {
            id: ids.holiday,
            title: 'Independence Day',
            startDate: '2026-08-15T00:00:00.000Z',
            endDate: '2026-08-15T00:00:00.000Z',
        },
    ],
};
const webAttendanceItems = [
    {
        user: {
            id: ids.employee,
            fullName: 'Aarav Mehta',
            email: 'aarav.mehta@acme.com',
        },
        summary: {
            presentDays: 10,
            halfDays: 2,
            absentDays: 1,
            leaveDays: 1,
            holidayDays: 1,
            weeklyOffDays: 2,
            totalWorkedMinutes: 5940,
            attendancePercentage: 84.62,
        },
    },
];
const webAttendanceMeta = {
    total: 24,
    page: 1,
    limit: 20,
    totalPages: 2,
    range: {
        startDate: '2026-03-01',
        endDate: '2026-03-18',
        appliedEndDate: '2026-03-17',
        currentDateExcluded: true,
    },
    aggregate: {
        presentDays: 286,
        halfDays: 18,
        absentDays: 9,
        leaveDays: 11,
        holidayDays: 24,
        weeklyOffDays: 48,
        totalWorkedMinutes: 171960,
        attendancePercentage: 94.57,
    },
};
const webAttendanceRecordItems = [
    {
        user: {
            id: ids.employee,
            fullName: 'Aarav Mehta',
            email: 'aarav.mehta@acme.com',
        },
        date: '2026-03-18',
        dayType: 'workingDay',
        attendanceState: 'working',
        punchInAt: '2026-03-18T03:16:44.000Z',
        punchOutAt: null,
        workedMinutes: null,
        location: {
            latitude: 12.9716,
            longitude: 77.5946,
        },
        flags: [],
        holiday: null,
        leaveRequest: null,
        regularization: null,
    },
    {
        user: {
            id: ids.employee,
            fullName: 'Aarav Mehta',
            email: 'aarav.mehta@acme.com',
        },
        date: '2026-03-14',
        dayType: 'workingDay',
        attendanceState: 'halfDay',
        punchInAt: '2026-03-14T03:30:00.000Z',
        punchOutAt: '2026-03-14T08:00:00.000Z',
        workedMinutes: 270,
        location: {
            latitude: 12.9716,
            longitude: 77.5946,
        },
        flags: ['regularized'],
        holiday: null,
        leaveRequest: null,
        regularization: {
            id: ids.regularization,
            overrideStatus: 'HALF_DAY',
            reason: 'Left office early with manager approval',
        },
    },
];
const webAttendanceRecordMeta = {
    total: 58,
    page: 1,
    limit: 20,
    totalPages: 3,
    range: {
        startDate: '2026-03-01',
        endDate: '2026-03-18',
        requestedEndDate: '2026-03-18',
        futureDatesTrimmed: false,
    },
};
export const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'Attendance System API',
        version: '1.0.0',
        description: 'Backend API for attendance management with mobile and web portals. Includes sample payloads for faster integration.',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    tags: [
        { name: 'Mobile Auth', description: 'Public authentication endpoints for mobile app.' },
        { name: 'Mobile Self-Service', description: 'Employee self-service endpoints for mobile app.' },
        { name: 'Web Auth', description: 'Public authentication endpoints for web portal.' },
        { name: 'Web Management', description: 'Manager/admin workflows for web portal.' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        parameters: {
            XDeviceId: {
                name: 'x-device-id',
                in: 'header',
                required: true,
                description: 'Bound device identifier used for mobile punch endpoints.',
                schema: { type: 'string' },
                example: 'android-new-4f8c',
            },
            UserId: {
                name: 'userId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                example: ids.employee,
            },
            LeaveRequestId: {
                name: 'leaveRequestId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                example: ids.leaveRequest,
            },
            RequestId: {
                name: 'requestId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                example: ids.deviceChange,
            },
            HolidayId: {
                name: 'holidayId',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'uuid' },
                example: ids.holiday,
            },
            DatePath: {
                name: 'date',
                in: 'path',
                required: true,
                schema: { type: 'string', format: 'date' },
                example: '2026-03-14',
            },
            StartDate: {
                name: 'startDate',
                in: 'query',
                schema: { type: 'string', format: 'date' },
                example: '2026-03-01',
            },
            EndDate: {
                name: 'endDate',
                in: 'query',
                schema: { type: 'string', format: 'date' },
                example: '2026-03-31',
            },
            IncludeHolidayHistory: {
                name: 'includeHolidayHistory',
                in: 'query',
                schema: { type: 'boolean' },
                example: true,
            },
            Page: {
                name: 'page',
                in: 'query',
                schema: { type: 'integer', minimum: 1, default: 1 },
                example: 1,
            },
            Limit: {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                example: 20,
            },
            Search: {
                name: 'search',
                in: 'query',
                schema: { type: 'string' },
                example: 'aarav',
            },
            AttendanceRecordStatus: {
                name: 'status',
                in: 'query',
                description: 'Optional derived attendance status filter. Use `regularized` to fetch rows with a regularization entry.',
                schema: {
                    type: 'string',
                    enum: ['present', 'halfDay', 'absent', 'working', 'onLeave', 'holiday', 'weeklyOff', 'regularized'],
                },
                example: 'present',
            },
        },
        responses: {
            ValidationError: errorResponse('Request validation failed', 'BAD_REQUEST', 'Validation failed', [
                { path: 'startDate', message: 'Invalid date format' },
            ]),
            BadRequestError: errorResponse('Bad request', 'BAD_REQUEST', 'Invalid request parameters'),
            DeviceHeaderMissingError: errorResponse('Missing device header', 'BAD_REQUEST', 'x-device-id header is required'),
            UnauthorizedError: errorResponse('Unauthorized', 'UNAUTHORIZED', 'Unauthorized'),
            ForbiddenError: errorResponse('Forbidden', 'FORBIDDEN', 'Forbidden'),
            NotFoundError: errorResponse('Resource not found', 'NOT_FOUND', 'Resource not found'),
            ConflictError: errorResponse('Conflict', 'CONFLICT', 'Resource state conflict'),
            InternalError: errorResponse('Internal server error', 'INTERNAL_ERROR', 'Internal server error'),
        },
        schemas: {
            SuccessResponse: {
                type: 'object',
                required: ['success', 'data'],
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', nullable: true, example: 'Operation completed' },
                    data: { description: 'Endpoint-specific payload. Can be object, array, or null.', nullable: true },
                    meta: {
                        type: 'object',
                        additionalProperties: true,
                        nullable: true,
                        description: 'Optional pagination or aggregate metadata.',
                    },
                },
            },
            ErrorResponse: {
                type: 'object',
                required: ['success', 'error'],
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        required: ['code', 'message'],
                        properties: {
                            code: { type: 'string', example: 'BAD_REQUEST' },
                            message: { type: 'string', example: 'Validation failed' },
                            details: { nullable: true },
                        },
                    },
                },
            },
            GoogleLoginMobile: {
                type: 'object',
                required: ['googleToken', 'deviceId'],
                properties: {
                    googleToken: { type: 'string', minLength: 1, example: 'google-id-token-from-mobile-client' },
                    deviceId: { type: 'string', minLength: 1, example: 'android-new-4f8c' },
                },
            },
            GoogleLoginWeb: {
                type: 'object',
                required: ['googleToken'],
                properties: {
                    googleToken: { type: 'string', minLength: 1, example: 'google-id-token-from-web-client' },
                },
            },
            RefreshToken: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: {
                        type: 'string',
                        minLength: 1,
                        example: 'eyJ1c2VySWQiOiI2YTJmMDhmMi1jYzhjLTRmNDAtOGE1Zi05ZDRkNzA2MDAxMTEiLCJ0b2tlbiI6Ii4uLiJ9',
                    },
                },
            },
            DeviceChangeViaGoogle: {
                type: 'object',
                required: ['googleToken', 'deviceId', 'reason'],
                properties: {
                    googleToken: { type: 'string', minLength: 1, example: 'google-id-token-from-mobile-client' },
                    deviceId: { type: 'string', minLength: 1, example: 'android-new-4f8c' },
                    reason: { type: 'string', minLength: 1, example: 'Old phone lost, requesting new binding' },
                },
            },
            PunchIn: {
                type: 'object',
                required: ['latitude', 'longitude'],
                properties: {
                    latitude: { type: 'number', minimum: -90, maximum: 90, example: 12.9716 },
                    longitude: { type: 'number', minimum: -180, maximum: 180, example: 77.5946 },
                },
            },
            CreateLeaveRequest: {
                type: 'object',
                required: ['startDate', 'endDate', 'reason'],
                properties: {
                    startDate: { type: 'string', format: 'date', example: '2026-03-24' },
                    endDate: { type: 'string', format: 'date', example: '2026-03-25' },
                    reason: { type: 'string', minLength: 1, example: 'Family function' },
                },
            },
            CreateUser: {
                type: 'object',
                required: ['fullName', 'email', 'roles'],
                properties: {
                    fullName: { type: 'string', maxLength: 120, example: 'Aarav Mehta' },
                    email: { type: 'string', format: 'email', maxLength: 150, example: 'aarav.mehta@acme.com' },
                    roles: {
                        type: 'array',
                        minItems: 1,
                        items: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
                        example: ['EMPLOYEE'],
                    },
                    managerUserId: { type: 'string', format: 'uuid', nullable: true, example: ids.manager },
                },
            },
            UpdateUser: {
                type: 'object',
                properties: {
                    fullName: { type: 'string', maxLength: 120, example: 'Aarav Mehta' },
                    roles: {
                        type: 'array',
                        minItems: 1,
                        items: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
                        example: ['EMPLOYEE'],
                    },
                    managerUserId: { type: 'string', format: 'uuid', nullable: true, example: ids.manager },
                    isActive: { type: 'boolean', example: true },
                },
            },
            AttendanceProfile: {
                type: 'object',
                required: ['officeLatitude', 'officeLongitude', 'officeRadiusMeters'],
                properties: {
                    officeLatitude: { type: 'number', minimum: -90, maximum: 90, example: 12.9716 },
                    officeLongitude: { type: 'number', minimum: -180, maximum: 180, example: 77.5946 },
                    officeRadiusMeters: { type: 'integer', minimum: 1, maximum: 10000, example: 150 },
                },
            },
            Regularization: {
                type: 'object',
                required: ['overrideStatus', 'reason'],
                properties: {
                    overrideStatus: { type: 'string', enum: ['PRESENT', 'HALF_DAY', 'ABSENT'], example: 'PRESENT' },
                    overridePunchInAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-03-14T03:30:00.000Z' },
                    overridePunchOutAt: { type: 'string', format: 'date-time', nullable: true, example: '2026-03-14T12:15:00.000Z' },
                    reason: { type: 'string', minLength: 1, example: 'Biometric device outage at office gate' },
                },
            },
            CreateHoliday: {
                type: 'object',
                required: ['title', 'startDate', 'endDate'],
                properties: {
                    title: { type: 'string', maxLength: 120, example: 'Independence Day' },
                    description: { type: 'string', nullable: true, example: 'National holiday' },
                    startDate: { type: 'string', format: 'date', example: '2026-08-15' },
                    endDate: { type: 'string', format: 'date', example: '2026-08-15' },
                },
            },
            UpdateHoliday: {
                type: 'object',
                required: ['reason'],
                properties: {
                    title: { type: 'string', maxLength: 120, example: 'Independence Day (Observed)' },
                    description: { type: 'string', nullable: true, example: 'Company-wide holiday' },
                    startDate: { type: 'string', format: 'date', example: '2026-08-15' },
                    endDate: { type: 'string', format: 'date', example: '2026-08-15' },
                    reason: { type: 'string', minLength: 1, example: 'Updated title per HR circular' },
                },
            },
            DeviceChangeRequest: {
                type: 'object',
                required: ['requestedDeviceId', 'reason'],
                properties: {
                    requestedDeviceId: { type: 'string', minLength: 1, example: 'android-new-4f8c' },
                    reason: { type: 'string', minLength: 1, example: 'Old phone damaged' },
                },
            },
            ActionNoteOptional: {
                type: 'object',
                properties: {
                    actionNote: { type: 'string', example: 'Approved after verification' },
                },
            },
            ActionNoteRequired: {
                type: 'object',
                required: ['actionNote'],
                properties: {
                    actionNote: { type: 'string', minLength: 1, example: 'Insufficient supporting details' },
                },
            },
            DeleteReason: {
                type: 'object',
                required: ['reason'],
                properties: {
                    reason: { type: 'string', minLength: 1, example: 'Holiday cancelled by government notification' },
                },
            },
        },
    },
    paths: {
        // ─── Mobile Auth ───
        '/mobile/auth/google/login': {
            post: {
                tags: ['Mobile Auth'],
                summary: 'Login via Google (mobile)',
                description: 'Authenticates an employee for mobile portal using Google token + device identity.',
                requestBody: jsonRequestBody('#/components/schemas/GoogleLoginMobile', {
                    googleToken: 'google-id-token-from-mobile-client',
                    deviceId: 'android-new-4f8c',
                }),
                responses: {
                    '200': successResponse('Login successful', authMobileData, { message: 'Login successful' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/mobile/auth/refresh': {
            post: {
                tags: ['Mobile Auth'],
                summary: 'Refresh access token (mobile)',
                requestBody: jsonRequestBody('#/components/schemas/RefreshToken', {
                    refreshToken: 'eyJ1c2VySWQiOiI2YTJmMDhmMi1jYzhjLTRmNDAtOGE1Zi05ZDRkNzA2MDAxMTEiLCJ0b2tlbiI6Ii4uLiJ9',
                }),
                responses: {
                    '200': successResponse('Token refreshed', refreshData),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                },
            },
        },
        '/mobile/auth/logout': {
            post: {
                tags: ['Mobile Auth'],
                summary: 'Logout (mobile)',
                description: 'Revokes refresh token. Endpoint is idempotent for malformed/expired tokens after validation.',
                requestBody: jsonRequestBody('#/components/schemas/RefreshToken', {
                    refreshToken: 'eyJ1c2VySWQiOiI2YTJmMDhmMi1jYzhjLTRmNDAtOGE1Zi05ZDRkNzA2MDAxMTEiLCJ0b2tlbiI6Ii4uLiJ9',
                }),
                responses: {
                    '200': successResponse('Logged out', null, { message: 'Logged out' }),
                    '400': responseRef('ValidationError'),
                },
            },
        },
        '/mobile/auth/device-change-request': {
            post: {
                tags: ['Mobile Auth'],
                summary: 'Request mobile device change via Google auth',
                description: 'Public fallback endpoint for employees who cannot login due to device mismatch.',
                requestBody: jsonRequestBody('#/components/schemas/DeviceChangeViaGoogle', {
                    googleToken: 'google-id-token-from-mobile-client',
                    deviceId: 'android-new-4f8c',
                    reason: 'Old phone lost, requesting new binding',
                }),
                responses: {
                    '200': successResponse('Device change request submitted', deviceChangeRequestData, {
                        message: 'Device change request submitted',
                    }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        // ─── Mobile Self-Service ───
        '/mobile/me/profile': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'Get own profile',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': successResponse('Profile data', myProfileData),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/mobile/me/dashboard': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'Get mobile dashboard',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': successResponse('Dashboard data', mobileDashboardData),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/mobile/me/attendance/overview': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'Get attendance overview',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { $ref: '#/components/parameters/IncludeHolidayHistory' },
                ],
                responses: {
                    '200': successResponse('Attendance overview', attendanceOverviewData),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/mobile/me/attendance/punch-in': {
            post: {
                tags: ['Mobile Self-Service'],
                summary: 'Punch in',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/XDeviceId' }],
                requestBody: jsonRequestBody('#/components/schemas/PunchIn', {
                    latitude: 12.9716,
                    longitude: 77.5946,
                }),
                responses: {
                    '201': successResponse('Punched in', punchInData, { message: 'Punched in' }),
                    '400': responseRef('DeviceHeaderMissingError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '409': responseRef('ConflictError'),
                },
            },
        },
        '/mobile/me/attendance/punch-out': {
            post: {
                tags: ['Mobile Self-Service'],
                summary: 'Punch out',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/XDeviceId' }],
                responses: {
                    '200': successResponse('Punched out', punchOutData, { message: 'Punched out' }),
                    '400': responseRef('DeviceHeaderMissingError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '409': responseRef('ConflictError'),
                },
            },
        },
        '/mobile/me/leave-requests': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'List own leave requests',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
                        example: 'PENDING',
                    },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Leave requests', [leaveRequestData], {
                        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
            post: {
                tags: ['Mobile Self-Service'],
                summary: 'Create leave request',
                security: [{ bearerAuth: [] }],
                requestBody: jsonRequestBody('#/components/schemas/CreateLeaveRequest', {
                    startDate: '2026-03-24',
                    endDate: '2026-03-25',
                    reason: 'Family function',
                }),
                responses: {
                    '201': successResponse('Leave request created', {
                        ...leaveRequestData,
                        workingDates: ['2026-03-24', '2026-03-25'],
                    }, { message: 'Leave request created' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '409': responseRef('ConflictError'),
                },
            },
        },
        '/mobile/me/leave-requests/{leaveRequestId}': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'Get leave request detail',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/LeaveRequestId' }],
                responses: {
                    '200': successResponse('Leave request detail', leaveRequestWithRelations),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/mobile/me/leave-requests/{leaveRequestId}/cancel': {
            patch: {
                tags: ['Mobile Self-Service'],
                summary: 'Cancel leave request',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/LeaveRequestId' }],
                responses: {
                    '200': successResponse('Leave request cancelled', {
                        ...leaveRequestData,
                        status: 'CANCELLED',
                        actionByUserId: ids.employee,
                        actionAt: '2026-03-18T10:00:00.000Z',
                    }, { message: 'Leave request cancelled' }),
                    '400': responseRef('BadRequestError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/mobile/me/device-change-requests': {
            get: {
                tags: ['Mobile Self-Service'],
                summary: 'List own device change requests',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] }, example: 'PENDING' },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Device change requests', [deviceChangeRequestData], {
                        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
            post: {
                tags: ['Mobile Self-Service'],
                summary: 'Create device change request',
                security: [{ bearerAuth: [] }],
                requestBody: jsonRequestBody('#/components/schemas/DeviceChangeRequest', {
                    requestedDeviceId: 'android-new-4f8c',
                    reason: 'Old phone damaged',
                }),
                responses: {
                    '201': successResponse('Device change request created', deviceChangeRequestData, {
                        message: 'Device change request created',
                    }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        // ─── Web Auth ───
        '/web/auth/google/login': {
            post: {
                tags: ['Web Auth'],
                summary: 'Login via Google (web)',
                requestBody: jsonRequestBody('#/components/schemas/GoogleLoginWeb', {
                    googleToken: 'google-id-token-from-web-client',
                }),
                responses: {
                    '200': successResponse('Login successful', authWebData, { message: 'Login successful' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/auth/refresh': {
            post: {
                tags: ['Web Auth'],
                summary: 'Refresh access token (web)',
                requestBody: jsonRequestBody('#/components/schemas/RefreshToken', {
                    refreshToken: 'eyJ1c2VySWQiOiI1ZmQxMmIyNi00YmUyLTQ1NzgtOGJkYi04NzEwZjQ1MjAyMjIiLCJ0b2tlbiI6Ii4uLiJ9',
                }),
                responses: {
                    '200': successResponse('Token refreshed', refreshData),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                },
            },
        },
        '/web/auth/logout': {
            post: {
                tags: ['Web Auth'],
                summary: 'Logout (web)',
                requestBody: jsonRequestBody('#/components/schemas/RefreshToken', {
                    refreshToken: 'eyJ1c2VySWQiOiI1ZmQxMmIyNi00YmUyLTQ1NzgtOGJkYi04NzEwZjQ1MjAyMjIiLCJ0b2tlbiI6Ii4uLiJ9',
                }),
                responses: {
                    '200': successResponse('Logged out', null, { message: 'Logged out' }),
                    '400': responseRef('ValidationError'),
                },
            },
        },
        // ─── Web Management ───
        '/web/me/profile': {
            get: {
                tags: ['Web Management'],
                summary: 'Get own profile (web)',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': successResponse('Profile', {
                        ...managerUser,
                        manager: null,
                        attendanceProfile: {
                            boundDeviceId: null,
                            officeLatitude: null,
                            officeLongitude: null,
                            officeRadiusMeters: null,
                        },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/dashboard/overview': {
            get: {
                tags: ['Web Management'],
                summary: 'Dashboard overview',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                ],
                responses: {
                    '200': successResponse('Dashboard data', webDashboardData),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/users': {
            get: {
                tags: ['Web Management'],
                summary: 'List users',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/Search' },
                    {
                        name: 'role',
                        in: 'query',
                        schema: { type: 'string', enum: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
                        example: 'EMPLOYEE',
                    },
                    { name: 'isActive', in: 'query', schema: { type: 'boolean' }, example: true },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Users list', [
                        {
                            id: ids.employee,
                            fullName: 'Aarav Mehta',
                            email: 'aarav.mehta@acme.com',
                            roles: ['EMPLOYEE'],
                            isActive: true,
                            managerUserId: ids.manager,
                            manager: { id: ids.manager, fullName: 'Priya Sharma' },
                            createdAt: '2026-02-12T04:30:00.000Z',
                        },
                    ], {
                        meta: { total: 24, page: 1, limit: 20, totalPages: 2 },
                    }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
            post: {
                tags: ['Web Management'],
                summary: 'Create user',
                security: [{ bearerAuth: [] }],
                requestBody: jsonRequestBody('#/components/schemas/CreateUser', {
                    fullName: 'Aarav Mehta',
                    email: 'aarav.mehta@acme.com',
                    roles: ['EMPLOYEE'],
                    managerUserId: ids.manager,
                }),
                responses: {
                    '201': successResponse('User created', {
                        id: ids.employee,
                        fullName: 'Aarav Mehta',
                        email: 'aarav.mehta@acme.com',
                        roles: ['EMPLOYEE'],
                        managerUserId: ids.manager,
                        isActive: true,
                        createdAt: '2026-03-18T04:22:00.000Z',
                        updatedAt: '2026-03-18T04:22:00.000Z',
                        manager: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'User created' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '409': responseRef('ConflictError'),
                },
            },
        },
        '/web/users/{userId}': {
            get: {
                tags: ['Web Management'],
                summary: 'Get user',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/UserId' }],
                responses: {
                    '200': successResponse('User detail', {
                        id: ids.employee,
                        fullName: 'Aarav Mehta',
                        email: 'aarav.mehta@acme.com',
                        roles: ['EMPLOYEE'],
                        managerUserId: ids.manager,
                        isActive: true,
                        createdAt: '2026-02-12T04:30:00.000Z',
                        updatedAt: '2026-03-18T04:22:00.000Z',
                        manager: {
                            id: ids.manager,
                            fullName: 'Priya Sharma',
                            email: 'priya.sharma@acme.com',
                        },
                        attendanceProfile: {
                            userId: ids.employee,
                            boundDeviceId: 'android-new-4f8c',
                            officeLatitude: 12.9716,
                            officeLongitude: 77.5946,
                            officeRadiusMeters: 150,
                            updatedByUserId: ids.manager,
                            updatedAt: '2026-03-17T10:00:00.000Z',
                        },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
            patch: {
                tags: ['Web Management'],
                summary: 'Update user',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/UserId' }],
                requestBody: jsonRequestBody('#/components/schemas/UpdateUser', {
                    fullName: 'Aarav R. Mehta',
                    isActive: true,
                }),
                responses: {
                    '200': successResponse('User updated', {
                        id: ids.employee,
                        fullName: 'Aarav R. Mehta',
                        email: 'aarav.mehta@acme.com',
                        roles: ['EMPLOYEE'],
                        managerUserId: ids.manager,
                        isActive: true,
                        createdAt: '2026-02-12T04:30:00.000Z',
                        updatedAt: '2026-03-18T11:11:00.000Z',
                        manager: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'User updated' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/users/{userId}/attendance-profile': {
            get: {
                tags: ['Web Management'],
                summary: 'Get attendance profile',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/UserId' }],
                responses: {
                    '200': successResponse('Attendance profile', {
                        userId: ids.employee,
                        boundDeviceId: 'android-new-4f8c',
                        officeLatitude: 12.9716,
                        officeLongitude: 77.5946,
                        officeRadiusMeters: 150,
                        updatedByUserId: ids.manager,
                        updatedAt: '2026-03-17T10:00:00.000Z',
                        updatedBy: { id: ids.manager, fullName: 'Priya Sharma' },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
            put: {
                tags: ['Web Management'],
                summary: 'Update attendance profile',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/UserId' }],
                requestBody: jsonRequestBody('#/components/schemas/AttendanceProfile', {
                    officeLatitude: 12.9716,
                    officeLongitude: 77.5946,
                    officeRadiusMeters: 150,
                }),
                responses: {
                    '200': successResponse('Profile updated', {
                        userId: ids.employee,
                        boundDeviceId: 'android-new-4f8c',
                        officeLatitude: 12.9716,
                        officeLongitude: 77.5946,
                        officeRadiusMeters: 150,
                        updatedByUserId: ids.manager,
                        updatedAt: '2026-03-18T08:45:00.000Z',
                        updatedBy: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'Attendance profile updated' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/attendance/overview': {
            get: {
                tags: ['Web Management'],
                summary: 'Attendance overview (multi-user)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { $ref: '#/components/parameters/Search' },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Attendance overview', webAttendanceItems, { meta: webAttendanceMeta }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/attendance/records': {
            get: {
                tags: ['Web Management'],
                summary: 'Attendance records (row-level)',
                description: 'Returns one row per user per date. `location` is populated from the user attendance profile office coordinates when configured.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { $ref: '#/components/parameters/AttendanceRecordStatus' },
                    { $ref: '#/components/parameters/Search' },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Attendance records', webAttendanceRecordItems, { meta: webAttendanceRecordMeta }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/users/{userId}/attendance/overview': {
            get: {
                tags: ['Web Management'],
                summary: 'User attendance overview (day-wise)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/UserId' },
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { $ref: '#/components/parameters/IncludeHolidayHistory' },
                ],
                responses: {
                    '200': successResponse('User attendance detail', attendanceOverviewData),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/users/{userId}/attendance-regularizations/{date}': {
            put: {
                tags: ['Web Management'],
                summary: 'Create/update regularization',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/UserId' },
                    { $ref: '#/components/parameters/DatePath' },
                ],
                requestBody: jsonRequestBody('#/components/schemas/Regularization', {
                    overrideStatus: 'PRESENT',
                    overridePunchInAt: '2026-03-14T03:30:00.000Z',
                    overridePunchOutAt: '2026-03-14T12:15:00.000Z',
                    reason: 'Biometric device outage at office gate',
                }),
                responses: {
                    '200': successResponse('Regularization saved', {
                        id: ids.regularization,
                        userId: ids.employee,
                        attendanceDate: '2026-03-14T00:00:00.000Z',
                        overrideStatus: 'PRESENT',
                        overridePunchInAt: '2026-03-14T03:30:00.000Z',
                        overridePunchOutAt: '2026-03-14T12:15:00.000Z',
                        overrideWorkedMinutes: 525,
                        reason: 'Biometric device outage at office gate',
                        actionByUserId: ids.manager,
                        createdAt: '2026-03-18T08:55:00.000Z',
                        updatedAt: '2026-03-18T08:55:00.000Z',
                        actionBy: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'Regularization saved' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
            delete: {
                tags: ['Web Management'],
                summary: 'Delete regularization',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/UserId' },
                    { $ref: '#/components/parameters/DatePath' },
                ],
                responses: {
                    '200': successResponse('Regularization deleted', null, { message: 'Regularization deleted' }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/leave-requests': {
            get: {
                tags: ['Web Management'],
                summary: 'List leave requests',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
                        example: 'PENDING',
                    },
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { $ref: '#/components/parameters/Search' },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Leave requests list', [leaveRequestWithRelations], {
                        meta: { total: 7, page: 1, limit: 20, totalPages: 1 },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/leave-requests/{leaveRequestId}': {
            get: {
                tags: ['Web Management'],
                summary: 'Get leave request',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/LeaveRequestId' }],
                responses: {
                    '200': successResponse('Leave request detail', leaveRequestWithRelations),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/leave-requests/{leaveRequestId}/approve': {
            patch: {
                tags: ['Web Management'],
                summary: 'Approve leave request',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/LeaveRequestId' }],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ActionNoteOptional' },
                            example: { actionNote: 'Approved for medical reason' },
                        },
                    },
                },
                responses: {
                    '200': successResponse('Leave approved', {
                        ...leaveRequestWithRelations,
                        status: 'APPROVED',
                        actionByUserId: ids.manager,
                        actionAt: '2026-03-18T09:15:00.000Z',
                        actionNote: 'Approved for medical reason',
                    }, { message: 'Leave request approved' }),
                    '400': responseRef('BadRequestError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/leave-requests/{leaveRequestId}/reject': {
            patch: {
                tags: ['Web Management'],
                summary: 'Reject leave request',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/LeaveRequestId' }],
                requestBody: jsonRequestBody('#/components/schemas/ActionNoteRequired', {
                    actionNote: 'Business-critical release week, please re-apply next cycle',
                }),
                responses: {
                    '200': successResponse('Leave rejected', {
                        ...leaveRequestWithRelations,
                        status: 'REJECTED',
                        actionByUserId: ids.manager,
                        actionAt: '2026-03-18T09:20:00.000Z',
                        actionNote: 'Business-critical release week, please re-apply next cycle',
                    }, { message: 'Leave request rejected' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/device-change-requests': {
            get: {
                tags: ['Web Management'],
                summary: 'List device change requests',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'status',
                        in: 'query',
                        schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
                        example: 'PENDING',
                    },
                    { $ref: '#/components/parameters/Search' },
                    { $ref: '#/components/parameters/Page' },
                    { $ref: '#/components/parameters/Limit' },
                ],
                responses: {
                    '200': successResponse('Device change requests', [
                        {
                            ...deviceChangeRequestData,
                            user: {
                                id: ids.employee,
                                fullName: 'Aarav Mehta',
                                email: 'aarav.mehta@acme.com',
                            },
                            actionBy: null,
                        },
                    ], {
                        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
        },
        '/web/device-change-requests/{requestId}/approve': {
            patch: {
                tags: ['Web Management'],
                summary: 'Approve device change',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/RequestId' }],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ActionNoteOptional' },
                            example: { actionNote: 'Verified by IT desk' },
                        },
                    },
                },
                responses: {
                    '200': successResponse('Device change approved', {
                        ...deviceChangeRequestData,
                        status: 'APPROVED',
                        actionByUserId: ids.manager,
                        actionAt: '2026-03-18T10:10:00.000Z',
                        actionNote: 'Verified by IT desk',
                        user: { id: ids.employee, fullName: 'Aarav Mehta' },
                        actionBy: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'Device change approved' }),
                    '400': responseRef('BadRequestError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/device-change-requests/{requestId}/reject': {
            patch: {
                tags: ['Web Management'],
                summary: 'Reject device change',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/RequestId' }],
                requestBody: jsonRequestBody('#/components/schemas/ActionNoteRequired', {
                    actionNote: 'Device serial photo is unclear, please resubmit',
                }),
                responses: {
                    '200': successResponse('Device change rejected', {
                        ...deviceChangeRequestData,
                        status: 'REJECTED',
                        actionByUserId: ids.manager,
                        actionAt: '2026-03-18T10:11:00.000Z',
                        actionNote: 'Device serial photo is unclear, please resubmit',
                        user: { id: ids.employee, fullName: 'Aarav Mehta' },
                        actionBy: { id: ids.manager, fullName: 'Priya Sharma' },
                    }, { message: 'Device change rejected' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/holidays': {
            get: {
                tags: ['Web Management'],
                summary: 'List holidays',
                security: [{ bearerAuth: [] }],
                parameters: [
                    { $ref: '#/components/parameters/StartDate' },
                    { $ref: '#/components/parameters/EndDate' },
                    { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' }, example: false },
                ],
                responses: {
                    '200': successResponse('Holidays list', [
                        {
                            ...holidayData,
                            createdBy: { id: ids.admin, fullName: 'Rohit Nair' },
                            updatedBy: null,
                        },
                    ]),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                },
            },
            post: {
                tags: ['Web Management'],
                summary: 'Create holiday (admin only)',
                security: [{ bearerAuth: [] }],
                requestBody: jsonRequestBody('#/components/schemas/CreateHoliday', {
                    title: 'Independence Day',
                    description: 'National holiday',
                    startDate: '2026-08-15',
                    endDate: '2026-08-15',
                }),
                responses: {
                    '201': successResponse('Holiday created', holidayData, { message: 'Holiday created' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '409': responseRef('ConflictError'),
                },
            },
        },
        '/web/holidays/{holidayId}': {
            get: {
                tags: ['Web Management'],
                summary: 'Get holiday',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/HolidayId' }],
                responses: {
                    '200': successResponse('Holiday detail', {
                        ...holidayData,
                        createdBy: { id: ids.admin, fullName: 'Rohit Nair' },
                        updatedBy: null,
                    }),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
            patch: {
                tags: ['Web Management'],
                summary: 'Update holiday (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/HolidayId' }],
                requestBody: jsonRequestBody('#/components/schemas/UpdateHoliday', {
                    title: 'Independence Day (Observed)',
                    reason: 'Updated title per HR circular',
                }),
                responses: {
                    '200': successResponse('Holiday updated', {
                        ...holidayData,
                        title: 'Independence Day (Observed)',
                        updatedByUserId: ids.admin,
                        updatedAt: '2026-03-18T11:30:00.000Z',
                    }, { message: 'Holiday updated' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                    '409': responseRef('ConflictError'),
                },
            },
            delete: {
                tags: ['Web Management'],
                summary: 'Delete holiday (admin only)',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/HolidayId' }],
                requestBody: jsonRequestBody('#/components/schemas/DeleteReason', {
                    reason: 'Holiday cancelled by government notification',
                }),
                responses: {
                    '200': successResponse('Holiday deleted', null, { message: 'Holiday deleted' }),
                    '400': responseRef('ValidationError'),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
        '/web/holidays/{holidayId}/history': {
            get: {
                tags: ['Web Management'],
                summary: 'Get holiday change history',
                security: [{ bearerAuth: [] }],
                parameters: [{ $ref: '#/components/parameters/HolidayId' }],
                responses: {
                    '200': successResponse('Holiday history', [
                        {
                            id: ids.holidayLog,
                            holidayId: ids.holiday,
                            changeType: 'UPDATED',
                            reason: 'Updated title per HR circular',
                            changedByUserId: ids.admin,
                            changedAt: '2026-03-18T11:30:00.000Z',
                            snapshotBefore: {
                                title: 'Independence Day',
                                description: 'National holiday',
                                startDate: '2026-08-15',
                                endDate: '2026-08-15',
                                isDeleted: false,
                            },
                            snapshotAfter: {
                                title: 'Independence Day (Observed)',
                                description: 'National holiday',
                                startDate: '2026-08-15',
                                endDate: '2026-08-15',
                                isDeleted: false,
                            },
                            changedBy: {
                                id: ids.admin,
                                fullName: 'Rohit Nair',
                            },
                        },
                    ]),
                    '401': responseRef('UnauthorizedError'),
                    '403': responseRef('ForbiddenError'),
                    '404': responseRef('NotFoundError'),
                },
            },
        },
    },
};
//# sourceMappingURL=openapi.js.map
