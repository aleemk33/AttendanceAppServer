# Backend Route Guide

This guide explains the server routes in business terms so you can understand the system without reading the implementation details.

## Shared Patterns

- Route groups:
  - Mobile APIs live under `/api/v1/mobile`
  - Web APIs live under `/api/v1/web`
  - Utility routes live at `/health` and `/docs`
- Standard success response shape: `{ success: true, data, message?, meta? }`
- Standard error response shape: `{ success: false, error: { code, message, details? } }`
- Mobile protected routes require:
  - `Authorization: Bearer <accessToken>`
  - token portal = `MOBILE`
  - user role includes `EMPLOYEE`
- Web protected routes require:
  - `Authorization: Bearer <accessToken>`
  - token portal = `WEB`
  - route-level role checks, usually `MANAGER` or `ADMIN`
- Business date logic uses the configured business timezone, which defaults to `Asia/Kolkata`.
- Weekly off means:
  - every Sunday
  - 2nd and 4th Saturday of the month
- Important data relationships:
  - `users` is the main user table
  - `users.managerUserId` links an employee to a manager
  - `attendance_profiles` is a one-to-one profile per user and stores the bound mobile device plus office geofence settings
  - `refresh_tokens` stores hashed session tokens
  - `attendance_punches` stores one attendance row per user per date
  - `attendance_regularizations` stores manager/admin overrides for a user's date
  - `leave_requests` stores employee leave workflows
  - `device_change_requests` stores mobile device rebinding workflows
  - `holidays` stores holiday ranges
  - `holiday_change_logs` stores holiday audit history
- Query validation is inconsistent across modules. Where a route reads query params directly, the inputs below are based on controller/service behavior from the code.

## Route Inventory

### Utility

- `GET /health`
- `GET /docs` and related Swagger UI asset requests under `/docs/*`

### Mobile Public Routes

- `POST /api/v1/mobile/auth/google/login`
- `POST /api/v1/mobile/auth/refresh`
- `POST /api/v1/mobile/auth/logout`
- `POST /api/v1/mobile/auth/device-change-request`

### Mobile Protected Routes

- `GET /api/v1/mobile/me/profile`
- `GET /api/v1/mobile/me/dashboard`
- `GET /api/v1/mobile/me/attendance/overview`
- `POST /api/v1/mobile/me/attendance/punch-in`
- `POST /api/v1/mobile/me/attendance/punch-out`
- `GET /api/v1/mobile/me/leave-requests`
- `GET /api/v1/mobile/me/leave-requests/:leaveRequestId`
- `POST /api/v1/mobile/me/leave-requests`
- `PATCH /api/v1/mobile/me/leave-requests/:leaveRequestId/cancel`
- `GET /api/v1/mobile/me/device-change-requests`
- `POST /api/v1/mobile/me/device-change-requests`

### Web Public Routes

- `POST /api/v1/web/auth/google/login`
- `POST /api/v1/web/auth/refresh`
- `POST /api/v1/web/auth/logout`

### Web Protected Routes

- `GET /api/v1/web/me/profile`
- `GET /api/v1/web/dashboard/overview`
- `GET /api/v1/web/users`
- `POST /api/v1/web/users`
- `GET /api/v1/web/users/:userId`
- `PATCH /api/v1/web/users/:userId`
- `GET /api/v1/web/users/:userId/attendance-profile`
- `PUT /api/v1/web/users/:userId/attendance-profile`
- `GET /api/v1/web/attendance/overview`
- `GET /api/v1/web/attendance/records`
- `GET /api/v1/web/users/:userId/attendance/overview`
- `PUT /api/v1/web/users/:userId/attendance-regularizations/:date`
- `DELETE /api/v1/web/users/:userId/attendance-regularizations/:date`
- `GET /api/v1/web/leave-requests`
- `GET /api/v1/web/leave-requests/:leaveRequestId`
- `PATCH /api/v1/web/leave-requests/:leaveRequestId/approve`
- `PATCH /api/v1/web/leave-requests/:leaveRequestId/reject`
- `GET /api/v1/web/device-change-requests`
- `PATCH /api/v1/web/device-change-requests/:requestId/approve`
- `PATCH /api/v1/web/device-change-requests/:requestId/reject`
- `GET /api/v1/web/holidays`
- `GET /api/v1/web/holidays/:holidayId`
- `GET /api/v1/web/holidays/:holidayId/history`
- `POST /api/v1/web/holidays`
- `PATCH /api/v1/web/holidays/:holidayId`
- `DELETE /api/v1/web/holidays/:holidayId`

## Utility Routes

### `GET /health`

1. Route
- HTTP method: `GET`
- API path: `/health`

2. What this route does
- Returns a simple liveness response.
- Use it for monitoring, health checks, or load-balancer probes.

3. What the client needs to send
- Authentication required: No
- Headers: None required
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Builds a small response containing `status: ok` and the current timestamp.
- Returns it immediately.

5. Database/Data usage
- No database access.

6. Result
- Success: a JSON object with health status and timestamp.
- Important errors: only unexpected server failures.

7. Short summary
- This route does not touch data; it simply confirms the server is alive and returns the current time.

### `GET /docs`

1. Route
- HTTP method: `GET` for the main docs page
- API path: `/docs`

2. What this route does
- Serves the Swagger/OpenAPI documentation UI.
- Use it when you want to browse the API interactively in the browser.

3. What the client needs to send
- Authentication required: No
- Headers: Normal browser headers are enough
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Loads the generated OpenAPI document.
- Serves Swagger UI and related static assets under the `/docs` path.

5. Database/Data usage
- No business-table reads or writes.
- It uses the generated OpenAPI document in memory.

6. Result
- Success: HTML and Swagger assets for the API documentation UI.
- Important errors: only unexpected setup/runtime failures.

7. Short summary
- This route does not run business logic; it exposes the generated API documentation UI for manual exploration.

## Mobile Public Routes

### `POST /api/v1/mobile/auth/google/login`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/auth/google/login`

2. What this route does
- Logs an employee into the mobile portal.
- Use it when the mobile app wants to start a session and enforce the bound-device rule.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `googleToken` required, `deviceId` required

4. Main logic
- Verifies the Google token and checks that the email belongs to the allowed company domain.
- Finds the internal user account and rejects missing or inactive users.
- Confirms the user is allowed on the mobile portal, which means the user must have the `EMPLOYEE` role.
- Loads the attendance profile to enforce device binding.
- If the user has no attendance profile or no bound device yet, it creates or updates the profile and binds the current device.
- If another device is already bound, it blocks login and tells the user to request a device change.
- Creates a mobile access token and a new refresh-token session.

5. Database/Data usage
- Reads `users` to find the matching internal account.
- Reads and may create or update `attendance_profiles` to store the bound device.
- Creates a `refresh_tokens` row for the new mobile session.

6. Result
- Success: access token, refresh token, and a small user profile.
- Important errors: invalid Google token, wrong email domain, user missing or inactive, role not allowed on mobile, or device mismatch.

7. Short summary
- This route verifies Google identity, checks that the user is an active employee, enforces the bound-device rule, stores session state, and returns login tokens.

### `POST /api/v1/mobile/auth/refresh`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/auth/refresh`

2. What this route does
- Rotates a refresh token and issues a new access token.
- Use it when the mobile app needs to renew an expired or expiring access token.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `refreshToken` required

4. Main logic
- Decodes the opaque refresh token payload.
- Hashes the embedded raw token and looks it up in stored sessions.
- Rejects missing, revoked, expired, or tampered tokens.
- Loads the user and rejects missing or inactive accounts.
- Revokes the old refresh token and creates a new refresh token.
- Issues a new access token for the same portal.

5. Database/Data usage
- Reads `refresh_tokens` to validate the session token.
- Reads `users` to verify the account is still active.
- Updates the old `refresh_tokens` row to mark it revoked and used.
- Creates a new `refresh_tokens` row for the rotated session.

6. Result
- Success: new access token and new refresh token.
- Important errors: invalid refresh token, expired or revoked token, token tampering, or inactive user.

7. Short summary
- This route validates the supplied refresh token, confirms the user is still active, revokes the old session token, creates a new one, and returns a fresh token pair.

### `POST /api/v1/mobile/auth/logout`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/auth/logout`

2. What this route does
- Logs a session out by revoking its refresh token.
- Use it when the mobile client wants to end a session cleanly.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `refreshToken` required

4. Main logic
- Tries to decode the refresh token.
- If the token is malformed, it still returns success so logout stays idempotent from the client point of view.
- If decoding succeeds, it hashes the raw token and revokes matching active refresh-token rows.

5. Database/Data usage
- Updates `refresh_tokens` to mark the matching session as revoked.

6. Result
- Success: `null` data and a logout message.
- Important errors: malformed refresh tokens do not cause an error here; only unexpected server failures matter.

7. Short summary
- This route best-effort revokes the supplied refresh token and returns success even if the token is already invalid.

### `POST /api/v1/mobile/auth/device-change-request`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/auth/device-change-request`

2. What this route does
- Creates a device-change request without requiring an existing mobile session.
- Use it when a user cannot log in because the currently bound device no longer matches the phone they are using.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `googleToken` required, `deviceId` required, `reason` required

4. Main logic
- Verifies Google identity and checks the company email domain.
- Finds the internal user and rejects missing or inactive users.
- Loads the current attendance profile so it can snapshot the old bound device.
- Automatically closes any older pending device-change requests for that user by marking them rejected.
- Creates a new pending device-change request with the requested device and the reason.
- Unlike mobile login, the code does not perform a separate employee-role check here.

5. Database/Data usage
- Reads `users` and `attendance_profiles`.
- Updates existing `device_change_requests` rows from `PENDING` to `REJECTED`.
- Creates a new `device_change_requests` row.

6. Result
- Success: the newly created pending device-change request.
- Important errors: invalid Google token, wrong email domain, or user missing/inactive.

7. Short summary
- This route re-verifies Google identity, snapshots the user’s current bound device, closes older pending device-change requests, creates a new pending request, and returns it.

## Mobile Protected Routes

### `GET /api/v1/mobile/me/profile`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/profile`

2. What this route does
- Returns the authenticated employee's profile.
- Use it when the mobile app needs the logged-in user's own profile, manager summary, and attendance profile basics.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Uses the authenticated user ID from the access token.
- Loads the user record.
- Includes the manager summary and basic attendance profile settings.
- Fails if the user no longer exists.

5. Database/Data usage
- Reads `users`.
- Reads related manager data from `users`.
- Reads selected fields from `attendance_profiles`.

6. Result
- Success: the logged-in user's profile, manager info, and attendance profile settings.
- Important errors: user not found or expired/invalid token.

7. Short summary
- This route reads the logged-in user, attaches manager and attendance-profile details, and returns the combined profile.

### `GET /api/v1/mobile/me/dashboard`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/dashboard`

2. What this route does
- Returns a mobile dashboard summary for the logged-in employee.
- Use it to show today's status, month summary, recent history, pending leaves, and upcoming holidays on the mobile home screen.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Loads a small user card with manager info.
- Checks today's attendance punch record.
- Then decides today's status with precedence from the code: punch state first, then weekly off, then holiday, then approved leave.
- Builds month-to-date attendance totals using closed days only, so the current day is excluded from percentage math.
- Considers regularizations before raw punches when computing closed-day summaries.
- Builds the last 7 closed working-day statuses.
- Loads a short list of pending leave requests and upcoming holidays.

5. Database/Data usage
- Reads `users`.
- Reads today's row from `attendance_punches`.
- Reads monthly `attendance_punches`, `attendance_regularizations`, approved `leave_requests`, and `holidays`.
- Reads pending `leave_requests` and upcoming `holidays` for small side lists.

6. Result
- Success: dashboard object with user card, `todayStatus`, `monthSummary`, `last7ClosedDays`, `pendingLeaves`, and `upcomingHolidays`.
- Important errors: invalid token, or user missing.

7. Short summary
- This route combines the employee’s profile, today’s attendance state, closed-day monthly totals, recent day history, pending leave requests, and upcoming holidays into one dashboard response.

### `GET /api/v1/mobile/me/attendance/overview`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/attendance/overview`

2. What this route does
- Returns a detailed day-by-day attendance timeline and summary for the logged-in employee.
- Use it when the mobile app needs attendance history for a month or a custom date range.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `startDate` optional, `endDate` optional, `includeHolidayHistory` optional and only `"true"` turns it on
- Body fields: None

4. Main logic
- Chooses a default range from the first day of the current month through today when dates are omitted.
- Keeps today in the returned timeline, but clamps the summary calculation to yesterday if the requested end date reaches today or later.
- Bulk-loads punches, regularizations, leaves, and holidays for the range.
- For each day, decides the final attendance state with this precedence: weekly off or holiday, then approved leave, then regularization, then raw punch data, then absent.
- Marks incomplete punches as half days and can add flags such as missing punch-in or missing punch-out.
- Optionally adds holiday change-log history for holidays overlapping the range.

5. Database/Data usage
- Reads `attendance_punches` for the user and date range.
- Reads `attendance_regularizations` for the user and date range.
- Reads `leave_requests` that overlap the range.
- Reads `holidays` that overlap the range.
- Optionally reads `holiday_change_logs`.

6. Result
- Success: `range`, `summary`, `days`, and optionally `holidayHistory`.
- Important errors: invalid token or unexpected server failures. The code does not explicitly check that the user still exists before building the timeline.

7. Short summary
- This route builds a per-day attendance view from punches, regularizations, leave, and holiday data, computes a closed-day summary, and can also include holiday audit history.

### `POST /api/v1/mobile/me/attendance/punch-in`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/me/attendance/punch-in`

2. What this route does
- Records the start of the employee's workday.
- Use it when the mobile app marks the user's punch-in from the office location.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`, `x-device-id` required, `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `latitude` required, `longitude` required

4. Main logic
- Requires the `x-device-id` header.
- Loads the attendance profile and rejects users with no bound device.
- Confirms that the header device matches the bound device.
- Rejects punch-in on weekly offs, holidays, or days covered by approved leave.
- Rejects punch-in if the office geofence is not configured.
- Calculates distance from the office using stored office coordinates and radius, and rejects attempts outside the allowed radius.
- Checks for an existing attendance row for today and rejects if a punch-in already exists.
- Updates an existing blank row or creates a new row for today's punch-in time.

5. Database/Data usage
- Reads `attendance_profiles` for bound device and geofence settings.
- Reads `holidays` for today's date.
- Reads `leave_requests` for approved leave covering today.
- Reads and creates or updates `attendance_punches` for today's date.

6. Result
- Success: the attendance punch row with `punchInAt` set.
- Important errors: missing `x-device-id`, no bound device, device mismatch, weekly off, holiday, approved leave, geofence missing, too far from office, or already punched in.

7. Short summary
- This route checks the bound device, confirms the user is at the office on a valid working day, prevents duplicates, writes today’s punch-in, and returns the attendance row.

### `POST /api/v1/mobile/me/attendance/punch-out`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/me/attendance/punch-out`

2. What this route does
- Records the end of the employee's workday.
- Use it when the mobile app marks punch-out for the current day.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`, `x-device-id` required
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Requires the `x-device-id` header.
- Loads the attendance profile and confirms the same bound device is being used.
- Loads today's attendance row.
- Rejects the request if there is no punch-in for today.
- Rejects the request if a punch-out already exists.
- Calculates worked minutes from punch-in time to now.
- Updates today's attendance row with `punchOutAt` and `workedMinutes`.

5. Database/Data usage
- Reads `attendance_profiles`.
- Reads and updates today's `attendance_punches` row.

6. Result
- Success: the updated attendance row with punch-out time and worked minutes.
- Important errors: missing `x-device-id`, no bound device, device mismatch, no punch-in record, or already punched out.

7. Short summary
- This route verifies the bound device, ensures a valid open attendance row exists for today, computes worked time, saves punch-out, and returns the updated row.

### `GET /api/v1/mobile/me/leave-requests`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/leave-requests`

2. What this route does
- Lists the authenticated employee's own leave requests.
- Use it for the employee leave history screen.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `status` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Filters leave requests by the current user ID.
- Optionally filters by leave status.
- Orders results newest first.
- Includes the actor who approved, rejected, or cancelled the request if one exists.
- Applies pagination.

5. Database/Data usage
- Counts matching `leave_requests`.
- Reads paginated `leave_requests` and joins `actionBy` from `users`.

6. Result
- Success: paginated list of the employee's leave requests plus pagination metadata.
- Important errors: mainly invalid token or unexpected server failures.

7. Short summary
- This route fetches the current employee’s leave requests, optionally filters by status, joins action metadata, paginates the results, and returns them.

### `GET /api/v1/mobile/me/leave-requests/:leaveRequestId`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/leave-requests/:leaveRequestId`

2. What this route does
- Returns one leave request owned by the authenticated employee.
- Use it to show a leave-request detail page.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `leaveRequestId` required
- Query params: None
- Body fields: None

4. Main logic
- Loads the leave request by ID.
- Includes the requester and any action actor.
- Checks ownership and blocks access if the request belongs to someone else.

5. Database/Data usage
- Reads `leave_requests`.
- Joins related `user` and `actionBy` records from `users`.

6. Result
- Success: the full leave-request record with related user/action info.
- Important errors: leave request not found or not owned by the current user.

7. Short summary
- This route finds one leave request, ensures it belongs to the logged-in employee, attaches related user/action info, and returns it.

### `POST /api/v1/mobile/me/leave-requests`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/me/leave-requests`

2. What this route does
- Creates a new leave request for the authenticated employee.
- Use it when the employee wants to apply for leave.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `startDate` required, `endDate` required, `reason` required

4. Main logic
- Validates that `startDate` is not after `endDate`.
- Rejects leave that starts in the past.
- Loads holidays in the selected range.
- Calculates working days by excluding weekly offs and holidays.
- Rejects the request if the selected range has zero working days.
- Finds overlapping pending or approved leave requests.
- Checks overlap only on real working dates, so overlap on non-working days alone does not block the request.
- Creates a pending leave request with the computed working-day count.

5. Database/Data usage
- Reads `holidays` for the selected range.
- Reads existing `leave_requests` for overlap detection.
- Creates a new `leave_requests` row.

6. Result
- Success: the created leave request, plus the computed working dates.
- Important errors: invalid date order, past start date, no working days in range, or overlap with existing pending/approved leave.

7. Short summary
- This route validates the date range, removes non-working days, checks for overlapping effective leave days, creates a pending leave request, and returns it.

### `PATCH /api/v1/mobile/me/leave-requests/:leaveRequestId/cancel`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/mobile/me/leave-requests/:leaveRequestId/cancel`

2. What this route does
- Cancels the employee's own pending leave request.
- Use it when the employee wants to withdraw a leave request before it is approved or rejected.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `leaveRequestId` required
- Query params: None
- Body fields: None

4. Main logic
- Loads the leave request by ID.
- Ensures it belongs to the current user.
- Allows cancellation only if the current status is `PENDING`.
- Updates the request to `CANCELLED` and stores who cancelled it and when.

5. Database/Data usage
- Reads `leave_requests`.
- Updates the matching `leave_requests` row.

6. Result
- Success: the updated leave request in `CANCELLED` state.
- Important errors: leave request not found, not owned by the current user, or request not pending.

7. Short summary
- This route checks ownership and pending status, marks the leave request cancelled, records the action time/user, and returns the updated record.

### `GET /api/v1/mobile/me/device-change-requests`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/mobile/me/device-change-requests`

2. What this route does
- Lists the authenticated employee's device-change requests.
- Use it to show the device-change request history in the mobile app.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `status` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Filters device-change requests by the current user ID.
- Optionally filters by request status.
- Orders results newest first.
- Includes the acting approver/rejector when present.
- Applies pagination.

5. Database/Data usage
- Counts matching `device_change_requests`.
- Reads paginated `device_change_requests` and joins `actionBy` from `users`.

6. Result
- Success: paginated list of the user's device-change requests plus pagination metadata.
- Important errors: mainly invalid token or unexpected server failures.

7. Short summary
- This route fetches the current user’s device-change requests, optionally filters by status, joins action metadata, paginates the list, and returns it.

### `POST /api/v1/mobile/me/device-change-requests`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/mobile/me/device-change-requests`

2. What this route does
- Creates a new device-change request for the authenticated employee.
- Use it when an employee is still logged in and wants to request a new bound device.

3. What the client needs to send
- Authentication required: Yes, mobile bearer token for an `EMPLOYEE`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `requestedDeviceId` required, `reason` required

4. Main logic
- Loads the current attendance profile so it can snapshot the existing bound device.
- Marks any previous pending device-change requests for that user as rejected.
- Creates a new pending device-change request with the new device ID and reason.

5. Database/Data usage
- Reads `attendance_profiles`.
- Updates older `device_change_requests` rows from `PENDING` to `REJECTED`.
- Creates a new `device_change_requests` row.

6. Result
- Success: the created pending device-change request.
- Important errors: mostly unexpected server failures or invalid token.

7. Short summary
- This route snapshots the user’s current device binding, auto-closes older pending requests, creates a fresh pending device-change request, and returns it.

## Web Public Routes

### `POST /api/v1/web/auth/google/login`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/web/auth/google/login`

2. What this route does
- Logs a manager or admin into the web portal.
- Use it when the web client wants to start an authenticated browser session.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `googleToken` required

4. Main logic
- Verifies the Google token and allowed company email domain.
- Finds the internal user and rejects missing or inactive users.
- Confirms the user has a web-allowed role, meaning `MANAGER` or `ADMIN`.
- Creates a web access token and a new refresh-token session.

5. Database/Data usage
- Reads `users` to find the account.
- Creates a `refresh_tokens` row for the web session.

6. Result
- Success: access token, refresh token, and a small user profile.
- Important errors: invalid Google token, wrong email domain, missing/inactive user, or role not allowed on web.

7. Short summary
- This route verifies Google identity, checks that the user is an active manager or admin, creates web session tokens, and returns them.

### `POST /api/v1/web/auth/refresh`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/web/auth/refresh`

2. What this route does
- Rotates a web refresh token and issues a new access token.
- Use it when the web client needs to renew authentication without forcing a fresh login.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `refreshToken` required

4. Main logic
- Decodes and validates the opaque refresh token.
- Finds the stored session row by hashed token.
- Rejects revoked, expired, or tampered tokens.
- Verifies that the user still exists and is active.
- Revokes the old refresh token, creates a new one, and issues a fresh access token for the same portal.

5. Database/Data usage
- Reads `refresh_tokens`.
- Reads `users`.
- Updates the old `refresh_tokens` row.
- Creates a new `refresh_tokens` row.

6. Result
- Success: new access token and new refresh token.
- Important errors: invalid token, expired or revoked token, payload mismatch, or inactive user.

7. Short summary
- This route validates the stored web session, rotates the refresh token, creates a fresh access token, and returns the new pair.

### `POST /api/v1/web/auth/logout`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/web/auth/logout`

2. What this route does
- Logs a web session out by revoking its refresh token.
- Use it when the web client wants to end the current session.

3. What the client needs to send
- Authentication required: No
- Headers: `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `refreshToken` required

4. Main logic
- Tries to decode the supplied refresh token.
- If decoding fails, it still returns success to keep logout idempotent.
- If decoding works, it revokes any matching non-revoked refresh-token row.

5. Database/Data usage
- Updates `refresh_tokens` to revoke the matching session.

6. Result
- Success: `null` data and a logout message.
- Important errors: malformed refresh tokens do not return an application error here.

7. Short summary
- This route best-effort revokes the supplied web refresh token and returns success even when the token is already invalid.

## Web Protected Routes

### `GET /api/v1/web/me/profile`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/me/profile`

2. What this route does
- Returns the authenticated web user's own profile.
- Use it when the web UI needs the logged-in manager/admin profile plus manager and attendance-profile basics.

3. What the client needs to send
- Authentication required: Yes, web bearer token
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: None
- Body fields: None

4. Main logic
- Uses the authenticated user ID from the token.
- Loads the user, manager summary, and attendance-profile basics.
- Returns the combined record if the user still exists.

5. Database/Data usage
- Reads `users`.
- Joins manager data from `users`.
- Reads selected fields from `attendance_profiles`.

6. Result
- Success: the current user's profile.
- Important errors: invalid token or user not found.

7. Short summary
- This route looks up the authenticated web user, attaches manager and attendance-profile details, and returns that profile.

### `GET /api/v1/web/dashboard/overview`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/dashboard/overview`

2. What this route does
- Returns a high-level dashboard for a manager or admin.
- Use it for summary cards such as headcount, pending approvals, upcoming holidays, and range-based attendance totals.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `startDate` optional, `endDate` optional
- Body fields: None

4. Main logic
- Builds the caller's scope: admins can see all active users, while non-admin managers can see only direct reports.
- Counts active users in scope.
- Counts pending leave requests and pending device-change requests in scope.
- Loads a short list of upcoming holidays.
- Builds a date range and excludes the current day from aggregate attendance percentages when the requested end reaches today or later.
- Loads punches, regularizations, approved leave, and holidays for all users in scope.
- Aggregates present, half-day, absent, leave, holiday, and weekly-off counts across the scoped users.

5. Database/Data usage
- Counts and reads `users` in the caller's scope.
- Counts scoped `leave_requests` and `device_change_requests` with pending status.
- Reads upcoming `holidays`.
- Reads scoped `attendance_punches`, `attendance_regularizations`, approved `leave_requests`, and overlapping `holidays` for the selected range.

6. Result
- Success: headcount, attendance summary, pending counts, upcoming holidays, and range metadata.
- Important errors: invalid token or unexpected server failures.

7. Short summary
- This route scopes the caller to either the whole organization or direct reports, counts pending workflows, aggregates attendance for the selected range, and returns a dashboard summary.

### `GET /api/v1/web/users`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/users`

2. What this route does
- Lists users visible to the caller.
- Use it for the web user-management table.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `search` optional, `role` optional, `isActive` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Builds the caller scope: admins see all users, non-admin managers see direct reports only.
- Applies text search across full name and email.
- Applies optional role and active/inactive filters.
- Counts the total and loads one page of users.
- Includes a small manager summary for each user.

5. Database/Data usage
- Counts matching `users`.
- Reads paginated `users` and joins manager info from `users`.

6. Result
- Success: paginated users plus pagination metadata.
- Important errors: validation failures on bad query values or invalid token.

7. Short summary
- This route filters the visible user set by scope and query filters, reads one page of users with manager info, and returns the paginated list.

### `POST /api/v1/web/users`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/web/users`

2. What this route does
- Creates a new user account.
- Use it when a manager or admin onboards a new employee or another allowed user.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `fullName` required, `email` required, `roles` required, `managerUserId` optional or `null`

4. Main logic
- Validates that the chosen role combination is allowed. The code blocks mixing `ADMIN` with `EMPLOYEE` or `MANAGER`.
- If the caller is a manager without admin rights, it restricts creation to `EMPLOYEE` only and forces `managerUserId` to the caller.
- Checks for duplicate email before inserting.
- If a manager is assigned, confirms that the referenced user actually has the `MANAGER` role.
- Creates the user record.
- Creates an empty attendance profile immediately so later attendance/device settings have a stable profile row.

5. Database/Data usage
- Reads `users` to check for duplicate email.
- Reads `users` again if `managerUserId` is provided.
- Creates a `users` row.
- Creates an `attendance_profiles` row.

6. Result
- Success: the created user, including a manager summary.
- Important errors: invalid role mix, manager not allowed to create non-employees, duplicate email, invalid manager ID, validation errors, or invalid token.

7. Short summary
- This route validates roles and manager assignment, prevents duplicate email, creates the user, creates an empty attendance profile for that user, and returns the new account.

### `GET /api/v1/web/users/:userId`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/users/:userId`

2. What this route does
- Returns full details for one user.
- Use it for a user detail page in the web portal.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `userId` required
- Query params: None
- Body fields: None

4. Main logic
- Loads the user by ID.
- Includes the manager record and attendance profile.
- If the caller is a non-admin manager, it checks that the target user is a direct report.
- Rejects access outside that scope.

5. Database/Data usage
- Reads `users`.
- Joins manager data from `users`.
- Joins `attendance_profiles`.

6. Result
- Success: full user record with manager and attendance-profile details.
- Important errors: user not found, manager trying to access someone outside direct reports, or invalid token.

7. Short summary
- This route loads one user with related manager/profile data, enforces manager scope, and returns the user record.

### `PATCH /api/v1/web/users/:userId`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/users/:userId`

2. What this route does
- Updates mutable fields on a user account.
- Use it when the web UI edits a user profile, status, or role assignment.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `userId` required
- Query params: None
- Body fields: `fullName` optional, `roles` optional, `managerUserId` optional or `null`, `isActive` optional

4. Main logic
- Loads the target user.
- If the caller is a non-admin manager, it only allows updates for direct reports.
- Non-admin managers cannot change roles or reassign the manager.
- Validates any new role combination.
- If a new manager is supplied, confirms that the referenced user has the `MANAGER` role.
- Updates only the fields that were actually provided.

5. Database/Data usage
- Reads `users` to find the target user.
- Reads `users` again if a new `managerUserId` is provided.
- Updates the matching `users` row.

6. Result
- Success: the updated user record, including a manager summary.
- Important errors: user not found, manager scope violation, manager attempting forbidden changes, invalid role mix, invalid manager ID, validation errors, or invalid token.

7. Short summary
- This route checks update permissions, validates roles and manager assignment, applies the allowed field changes, and returns the updated user.

### `GET /api/v1/web/users/:userId/attendance-profile`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/users/:userId/attendance-profile`

2. What this route does
- Returns the attendance profile for a user.
- Use it when a manager or admin needs the user's geofence and bound-device settings.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `userId` required
- Query params: None
- Body fields: None

4. Main logic
- Verifies that the target user exists.
- If the caller is a non-admin manager, checks that the target user is a direct report.
- Tries to load the attendance profile and the user who last updated it.
- If the profile row does not exist, it creates an empty one and returns it.

5. Database/Data usage
- Reads `users` to confirm the target exists and check scope.
- Reads `attendance_profiles` and joins `updatedBy` from `users`.
- May create a new `attendance_profiles` row if missing.

6. Result
- Success: the attendance profile, including updater info.
- Important errors: user not found, manager scope violation, or invalid token.

7. Short summary
- This route ensures the target user exists and is in scope, loads or auto-creates the attendance profile, and returns it with updater info.

### `PUT /api/v1/web/users/:userId/attendance-profile`

1. Route
- HTTP method: `PUT`
- API path: `/api/v1/web/users/:userId/attendance-profile`

2. What this route does
- Creates or updates the attendance profile geofence for a user.
- Use it when the web UI configures office coordinates and allowed radius for attendance punch-in.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `userId` required
- Query params: None
- Body fields: `officeLatitude` required, `officeLongitude` required, `officeRadiusMeters` required

4. Main logic
- Verifies that the target user exists.
- Enforces manager direct-report scope when the caller is not an admin.
- Upserts the attendance profile so the route works for both first-time setup and later edits.
- Stores `updatedByUserId` for audit visibility.

5. Database/Data usage
- Reads `users` to verify existence and scope.
- Creates or updates `attendance_profiles`.

6. Result
- Success: the saved attendance profile, including updater info.
- Important errors: user not found, manager scope violation, validation failures, or invalid token.

7. Short summary
- This route checks user scope, upserts the office geofence settings into the attendance profile, records who changed it, and returns the profile.

### `GET /api/v1/web/attendance/overview`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/attendance/overview`

2. What this route does
- Returns per-user attendance summaries for a date range, plus an aggregate summary.
- Use it for the web attendance overview table.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `startDate` optional, `endDate` optional, `search` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Builds the visible user scope, with managers limited to direct reports.
- Defaults the date range to the current month through today.
- Uses yesterday as the aggregate end date when the range reaches today or later.
- Counts all matching users, then loads only the requested user page.
- Bulk-loads punches, regularizations, approved leave, and holidays for the users on that page.
- Builds per-user summaries with the same precedence rules used by single-user attendance logic.
- Computes an aggregate by summing the page items.
- Because the aggregate is built from the paged user list, it reflects the current page, not the full matching population.

5. Database/Data usage
- Counts and reads paginated `users`.
- Reads `attendance_punches`, `attendance_regularizations`, approved `leave_requests`, and overlapping `holidays` for the paged users.

6. Result
- Success: paginated attendance summaries, aggregate totals, and range metadata.
- Important errors: query validation failures or invalid token.

7. Short summary
- This route finds the visible users for the requested page, computes attendance summaries for those users from punches, leave, regularizations, and holidays, adds a page-level aggregate, and returns the result.

### `GET /api/v1/web/attendance/records`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/attendance/records`

2. What this route does
- Returns row-level attendance records for every user-date combination in the selected range.
- Use it for detailed attendance tables, filtering, and export-style views.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `startDate` optional, `endDate` optional, `status` optional, `search` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Builds the visible user scope, with managers limited to direct reports.
- Defaults the range to the current month through today.
- Trims a future `endDate` back to today.
- Loads the scoped users, including office coordinates from their attendance profiles.
- Bulk-loads punches, regularizations, leave, and holidays for the range.
- Builds one logical row per user per date, using the same attendance-state precedence as the single-user overview.
- Optionally filters rows by derived status such as `present`, `halfDay`, `absent`, `working`, `onLeave`, `holiday`, `weeklyOff`, or `regularized`.
- Sorts rows by newest date first, then by user name/email, and paginates in memory.

5. Database/Data usage
- Reads `users` and selected `attendance_profiles` fields.
- Reads matching `attendance_punches`, `attendance_regularizations`, `leave_requests`, and `holidays`.

6. Result
- Success: paginated row-level attendance data and range metadata.
- Important errors: query validation failures or invalid token.

7. Short summary
- This route expands the selected date range into per-user day rows, derives each row’s attendance status from related data, filters and paginates those rows, and returns them.

### `GET /api/v1/web/users/:userId/attendance/overview`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/users/:userId/attendance/overview`

2. What this route does
- Returns the day-by-day attendance overview for a specific user.
- Use it when the web UI needs the full attendance timeline for one employee.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `userId` required
- Query params: `startDate` optional, `endDate` optional, `includeHolidayHistory` optional and only `"true"` turns it on
- Body fields: None

4. Main logic
- Builds the same single-user attendance overview used by the mobile self route.
- Defaults the range to the current month through today when dates are omitted.
- Includes today in the timeline but excludes it from summary percentages when the requested range reaches today or later.
- Loads punches, regularizations, overlapping leave, and overlapping holidays for the target user.
- Builds per-day status with the same precedence: weekly off or holiday, then approved leave, then regularization, then punches, then absent.
- Optionally adds holiday history.
- From the code, this route does not apply an extra manager-to-direct-report scope check inside the service.
- From the code, it also does not explicitly verify that the `userId` belongs to an existing user before building the overview.

5. Database/Data usage
- Reads `attendance_punches`, `attendance_regularizations`, `leave_requests`, and `holidays` for the target user and date range.
- Optionally reads `holiday_change_logs`.

6. Result
- Success: `range`, `summary`, `days`, and optionally `holidayHistory`.
- Important errors: invalid token or unexpected server failures. There is no explicit not-found check for the target user in this route's service logic.

7. Short summary
- This route builds a single user’s attendance timeline from punches, regularizations, leave, and holiday data, computes the summary, and returns it, without an extra manager-scope check in the service.

### `PUT /api/v1/web/users/:userId/attendance-regularizations/:date`

1. Route
- HTTP method: `PUT`
- API path: `/api/v1/web/users/:userId/attendance-regularizations/:date`

2. What this route does
- Creates or updates a manual attendance override for a past date.
- Use it when a manager or admin needs to correct an attendance outcome that raw punch data does not reflect properly.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `userId` required, `date` required in `YYYY-MM-DD` form
- Query params: None
- Body fields: `overrideStatus` required, `reason` required, `overridePunchInAt` optional, `overridePunchOutAt` optional

4. Main logic
- Verifies that the target user exists.
- Enforces manager direct-report scope when the caller is not an admin.
- Rejects regularization for weekly offs and holidays.
- Rejects regularization for today or future dates; only closed past dates are allowed.
- If both override punch times are provided, calculates override worked minutes from them.
- Upserts the regularization row so the same route handles both create and update.
- Stores who made the change.

5. Database/Data usage
- Reads `users` to verify existence and scope.
- Reads `holidays` for the target date.
- Creates or updates `attendance_regularizations`.

6. Result
- Success: the saved regularization, including the acting user.
- Important errors: user not found, manager scope violation, holiday or weekly-off date, non-past date, validation errors, or invalid token.

7. Short summary
- This route checks that the target user/date can be regularized, calculates override worked time when needed, upserts the regularization record, and returns it.

### `DELETE /api/v1/web/users/:userId/attendance-regularizations/:date`

1. Route
- HTTP method: `DELETE`
- API path: `/api/v1/web/users/:userId/attendance-regularizations/:date`

2. What this route does
- Deletes an existing attendance regularization.
- Use it when a manager or admin wants to remove a manual attendance override.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `userId` required, `date` required in `YYYY-MM-DD` form
- Query params: None
- Body fields: None

4. Main logic
- Verifies that the target user exists.
- Enforces manager direct-report scope when the caller is not an admin.
- Looks for a regularization row for the exact user and date.
- Rejects the request if no such regularization exists.
- Hard-deletes the regularization row.

5. Database/Data usage
- Reads `users` to verify existence and scope.
- Reads `attendance_regularizations` to find the target row.
- Deletes the matching `attendance_regularizations` row.

6. Result
- Success: `null` data with a deletion message.
- Important errors: user not found, manager scope violation, regularization not found, or invalid token.

7. Short summary
- This route checks user scope, finds the exact regularization row for the requested date, deletes it, and returns success.

### `GET /api/v1/web/leave-requests`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/leave-requests`

2. What this route does
- Lists leave requests for review in the web portal.
- Use it for manager/admin approval queues and leave listing screens.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `status` optional, `startDate` optional, `endDate` optional, `search` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Builds the caller scope: admins see all leave requests, non-admin managers see only direct reports.
- Optionally filters by leave status.
- Optionally filters by request start date and end date.
- Optionally filters by employee name or email.
- Orders results newest first, includes requester and action actor info, and paginates.

5. Database/Data usage
- Counts matching `leave_requests`.
- Reads paginated `leave_requests`.
- Joins requester and action user data from `users`.

6. Result
- Success: paginated leave-request list plus pagination metadata.
- Important errors: invalid token or unexpected server failures.

7. Short summary
- This route filters the leave-request queue by caller scope and optional query filters, joins user/action data, paginates the results, and returns them.

### `GET /api/v1/web/leave-requests/:leaveRequestId`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/leave-requests/:leaveRequestId`

2. What this route does
- Returns one leave request for review in the web portal.
- Use it for a leave-request detail page.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `leaveRequestId` required
- Query params: None
- Body fields: None

4. Main logic
- Loads the leave request by ID.
- Includes the requester and action actor.
- Returns the record if found.
- From the code, this route does not add a direct-report scope check for managers inside the service.

5. Database/Data usage
- Reads `leave_requests`.
- Joins requester and action user data from `users`.

6. Result
- Success: the leave-request detail record.
- Important errors: leave request not found or invalid token.

7. Short summary
- This route fetches one leave request with related requester/action data and returns it, without an extra manager-scope restriction in the service.

### `PATCH /api/v1/web/leave-requests/:leaveRequestId/approve`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/leave-requests/:leaveRequestId/approve`

2. What this route does
- Approves a pending leave request.
- Use it when a manager or admin accepts an employee's leave request.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `leaveRequestId` required
- Query params: None
- Body fields: `actionNote` optional

4. Main logic
- Loads the leave request and the requesting user.
- Rejects the request unless the leave status is `PENDING`.
- Blocks self-approval.
- If the caller is a non-admin manager, only allows approval for direct reports.
- Updates the request to `APPROVED` and stores the actor, action time, and optional note.

5. Database/Data usage
- Reads `leave_requests` and the related `user`.
- Updates the matching `leave_requests` row.
- Includes `user` and `actionBy` in the returned record.

6. Result
- Success: the approved leave request with related user/action info.
- Important errors: leave request not found, request not pending, self-approval, manager scope violation, validation errors, or invalid token.

7. Short summary
- This route checks that a pending leave request is approvable by the current manager/admin, marks it approved, records the action, and returns the updated request.

### `PATCH /api/v1/web/leave-requests/:leaveRequestId/reject`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/leave-requests/:leaveRequestId/reject`

2. What this route does
- Rejects a pending leave request.
- Use it when a manager or admin declines a leave request.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `leaveRequestId` required
- Query params: None
- Body fields: `actionNote` required

4. Main logic
- Loads the leave request and the requesting user.
- Rejects the request unless the leave status is `PENDING`.
- Blocks self-rejection.
- If the caller is a non-admin manager, only allows rejection for direct reports.
- Updates the request to `REJECTED` and stores the actor, action time, and rejection note.

5. Database/Data usage
- Reads `leave_requests` and the related `user`.
- Updates the matching `leave_requests` row.
- Includes `user` and `actionBy` in the returned record.

6. Result
- Success: the rejected leave request with related user/action info.
- Important errors: leave request not found, request not pending, self-rejection, manager scope violation, missing rejection note, validation errors, or invalid token.

7. Short summary
- This route checks that a pending leave request can be rejected by the current manager/admin, records the rejection and note, and returns the updated request.

### `GET /api/v1/web/device-change-requests`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/device-change-requests`

2. What this route does
- Lists device-change requests for review in the web portal.
- Use it for manager/admin approval queues for mobile device rebinding.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `status` optional, `search` optional, `page` optional default `1`, `limit` optional default `20`
- Body fields: None

4. Main logic
- Builds the caller scope: admins see all requests, non-admin managers see only direct reports.
- Optionally filters by device-change status.
- Optionally filters by employee name or email.
- Orders results newest first, includes requester and action actor info, and paginates.

5. Database/Data usage
- Counts matching `device_change_requests`.
- Reads paginated `device_change_requests`.
- Joins requester and action user data from `users`.

6. Result
- Success: paginated device-change request list plus pagination metadata.
- Important errors: invalid token or unexpected server failures.

7. Short summary
- This route filters the device-change queue by caller scope and optional query filters, joins related user/action data, paginates the results, and returns them.

### `PATCH /api/v1/web/device-change-requests/:requestId/approve`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/device-change-requests/:requestId/approve`

2. What this route does
- Approves a pending device-change request and rebinds the employee's mobile device.
- Use it when a manager or admin approves a mobile-device switch.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `requestId` required
- Query params: None
- Body fields: `actionNote` optional

4. Main logic
- Loads the device-change request and the requesting user.
- Rejects the action unless the request is `PENDING`.
- Blocks self-approval.
- If the caller is a non-admin manager, only allows approval for direct reports.
- Runs all side effects in one transaction.
- Marks the request as `APPROVED`.
- Upserts the employee's attendance profile so `boundDeviceId` becomes the approved new device.
- Revokes all active mobile refresh tokens for that user so the user must log in again on the newly approved device.

5. Database/Data usage
- Reads `device_change_requests` and related `user`.
- Updates the matching `device_change_requests` row.
- Creates or updates `attendance_profiles` to change the bound device.
- Updates `refresh_tokens` to revoke active mobile sessions.

6. Result
- Success: the approved device-change request with related user/action info.
- Important errors: request not found, request not pending, self-approval, manager scope violation, validation errors, or invalid token.

7. Short summary
- This route checks approval permissions, approves the device-change request, rebinds the user’s attendance profile to the new device, revokes old mobile sessions, and returns the updated request.

### `PATCH /api/v1/web/device-change-requests/:requestId/reject`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/device-change-requests/:requestId/reject`

2. What this route does
- Rejects a pending device-change request.
- Use it when a manager or admin declines a requested device switch.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `requestId` required
- Query params: None
- Body fields: `actionNote` required

4. Main logic
- Loads the device-change request and the requesting user.
- Rejects the action unless the request is `PENDING`.
- Blocks self-rejection.
- If the caller is a non-admin manager, only allows rejection for direct reports.
- Updates the request to `REJECTED` and stores the actor, action time, and rejection note.

5. Database/Data usage
- Reads `device_change_requests` and related `user`.
- Updates the matching `device_change_requests` row.
- Includes `user` and `actionBy` in the returned record.

6. Result
- Success: the rejected request with related user/action info.
- Important errors: request not found, request not pending, self-rejection, manager scope violation, missing rejection note, validation errors, or invalid token.

7. Short summary
- This route checks that a pending device-change request can be rejected by the current manager/admin, records the rejection and note, and returns the updated request.

### `GET /api/v1/web/holidays`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/holidays`

2. What this route does
- Lists holidays in the system.
- Use it for holiday calendars, admin screens, and range-based holiday lookup.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: None
- Query params: `startDate` optional, `endDate` optional, `includeDeleted` optional and only `"true"` turns it on
- Body fields: None

4. Main logic
- Starts from all holidays or only non-deleted holidays, depending on `includeDeleted`.
- Applies date-window filtering so holidays overlapping the requested window are returned.
- Orders by start date.
- Includes creator and updater user info.

5. Database/Data usage
- Reads `holidays`.
- Joins `createdBy` and `updatedBy` from `users`.

6. Result
- Success: holiday list.
- Important errors: invalid token or unexpected server failures.

7. Short summary
- This route filters holidays by deletion status and date overlap, joins creator/updater info, and returns the holiday list.

### `GET /api/v1/web/holidays/:holidayId`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/holidays/:holidayId`

2. What this route does
- Returns one holiday record.
- Use it for a holiday detail page or editor.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `holidayId` required
- Query params: None
- Body fields: None

4. Main logic
- Loads the holiday by ID.
- Includes creator and updater summaries.
- Rejects the request if the holiday does not exist.

5. Database/Data usage
- Reads `holidays`.
- Joins `createdBy` and `updatedBy` from `users`.

6. Result
- Success: the holiday record with creator/updater info.
- Important errors: holiday not found or invalid token.

7. Short summary
- This route finds one holiday, attaches creator/updater metadata, and returns the holiday record.

### `GET /api/v1/web/holidays/:holidayId/history`

1. Route
- HTTP method: `GET`
- API path: `/api/v1/web/holidays/:holidayId/history`

2. What this route does
- Returns the audit history for one holiday.
- Use it when the web UI needs to show who created, updated, or deleted a holiday and why.

3. What the client needs to send
- Authentication required: Yes, web bearer token for a `MANAGER` or `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`
- Path params: `holidayId` required
- Query params: None
- Body fields: None

4. Main logic
- Verifies that the holiday exists.
- Loads all change-log entries for that holiday.
- Sorts the history newest first.
- Includes the user who made each change.

5. Database/Data usage
- Reads `holidays` to verify existence.
- Reads `holiday_change_logs`.
- Joins `changedBy` from `users`.

6. Result
- Success: ordered holiday change-log entries.
- Important errors: holiday not found or invalid token.

7. Short summary
- This route confirms the holiday exists, reads its audit trail from the change-log table, joins actor info, and returns the timeline.

### `POST /api/v1/web/holidays`

1. Route
- HTTP method: `POST`
- API path: `/api/v1/web/holidays`

2. What this route does
- Creates a new holiday.
- Use it when an admin adds a new holiday to the system calendar.

3. What the client needs to send
- Authentication required: Yes, web bearer token for an `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: None
- Query params: None
- Body fields: `title` required, `startDate` required, `endDate` required, `description` optional

4. Main logic
- Validates that `startDate` is not after `endDate`.
- Checks for overlap with any existing active holiday.
- Creates the holiday.
- Writes an audit-log entry with change type `CREATED` and the post-create snapshot.

5. Database/Data usage
- Reads `holidays` to detect overlap.
- Creates a `holidays` row.
- Creates a `holiday_change_logs` row.

6. Result
- Success: the newly created holiday.
- Important errors: invalid date order, overlap with an existing holiday, validation errors, insufficient role, or invalid token.

7. Short summary
- This route validates the new holiday range, prevents overlap with active holidays, creates the holiday, writes an audit entry, and returns the new holiday.

### `PATCH /api/v1/web/holidays/:holidayId`

1. Route
- HTTP method: `PATCH`
- API path: `/api/v1/web/holidays/:holidayId`

2. What this route does
- Updates a holiday that has not started yet.
- Use it when an admin needs to adjust holiday details or dates before the holiday begins.

3. What the client needs to send
- Authentication required: Yes, web bearer token for an `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `holidayId` required
- Query params: None
- Body fields: `reason` required, `title` optional, `description` optional or `null`, `startDate` optional, `endDate` optional

4. Main logic
- Loads the holiday and rejects missing or already deleted records.
- Blocks updates once the holiday has started or starts today.
- Combines existing dates with provided dates to build the new effective date range.
- Validates the new date order.
- Checks that the new range does not overlap another active holiday.
- Saves the update and stores `updatedByUserId`.
- Writes an audit-log entry with the before and after snapshots plus the required reason.

5. Database/Data usage
- Reads `holidays` to load the existing record.
- Reads `holidays` again to detect overlap with other active holidays.
- Updates the matching `holidays` row.
- Creates a `holiday_change_logs` row.

6. Result
- Success: the updated holiday.
- Important errors: holiday not found, holiday already started, invalid date order, overlap conflict, missing reason, validation errors, insufficient role, or invalid token.

7. Short summary
- This route ensures the holiday is still editable, validates the new date range, updates the holiday, records before/after audit snapshots with a reason, and returns the updated holiday.

### `DELETE /api/v1/web/holidays/:holidayId`

1. Route
- HTTP method: `DELETE`
- API path: `/api/v1/web/holidays/:holidayId`

2. What this route does
- Soft-deletes a holiday that has not started yet.
- Use it when an admin wants to remove a future holiday while preserving audit history.

3. What the client needs to send
- Authentication required: Yes, web bearer token for an `ADMIN`
- Headers: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- Path params: `holidayId` required
- Query params: None
- Body fields: `reason` required

4. Main logic
- Loads the holiday and rejects missing or already deleted records.
- Blocks deletion once the holiday has started or starts today.
- Marks the holiday as deleted instead of removing it physically.
- Stores `updatedByUserId`.
- Writes a `DELETED` audit-log entry with the pre-delete snapshot and the required reason.

5. Database/Data usage
- Reads `holidays` to load the existing record.
- Updates the matching `holidays` row to set `isDeleted = true`.
- Creates a `holiday_change_logs` row.

6. Result
- Success: `null` data with a deletion message.
- Important errors: holiday not found, holiday already started, missing reason, validation errors, insufficient role, or invalid token.

7. Short summary
- This route prevents deletion of started holidays, soft-deletes a future holiday, records an audit entry with the reason, and returns success.

## Repeated Patterns Worth Remembering

- Managers are usually restricted to direct reports, but two detail endpoints do not enforce that extra scope in the service:
  - `GET /api/v1/web/users/:userId/attendance/overview`
  - `GET /api/v1/web/leave-requests/:leaveRequestId`
- Mobile attendance relies heavily on `attendance_profiles`:
  - `boundDeviceId` controls which phone can punch in/out
  - office latitude, longitude, and radius control geofence checks
- Attendance state is derived, not stored as one final column:
  - the system combines punches, regularizations, holidays, leave, and weekly-off rules
- Regularizations override punch-based interpretation for past working days.
- Device-change approval has a side effect beyond the request itself:
  - it updates the bound device in `attendance_profiles`
  - it revokes existing mobile refresh tokens
- Holiday changes are audited with snapshots in `holiday_change_logs`, so create, update, and delete actions stay traceable.
