import { Role } from "@prisma/client";

/**
 * Checks if the caller has manager role but not admin role.
 * Used to determine if scope restrictions should apply.
 * @param {Array<Role>} callerRoles - Array of roles for the caller
 * @returns {boolean}
 */
export function isManagerOnly(callerRoles) {
  return (
    callerRoles.includes(Role.MANAGER) && !callerRoles.includes(Role.ADMIN)
  );
}

/**
 * Checks if the caller has admin role.
 * @param {Array<Role>} callerRoles - Array of roles for the caller
 * @returns {boolean}
 */
export function isAdmin(callerRoles) {
  return callerRoles.includes(Role.ADMIN);
}

/**
 * Applies manager-scope restriction to a Prisma where clause.
 * Managers are restricted to their direct reports; admins have full access.
 *
 * @param {object} where - Prisma where clause object
 * @param {Array<Role>} callerRoles - Caller's roles
 * @param {string} callerId - Caller's user ID
 * @param {string} fieldName - Field to apply restriction to (default: 'managerUserId')
 * @returns {object} Modified where clause
 */
export function applyManagerScope(
  where,
  callerRoles,
  callerId,
  fieldName = "managerUserId",
) {
  if (isManagerOnly(callerRoles)) {
    where[fieldName] = callerId;
  }
  return where;
}

/**
 * Applies manager-scope for nested user relations.
 * Used when filtering by a related user's manager.
 *
 * @param {object} where - Prisma where clause object
 * @param {Array<Role>} callerRoles - Caller's roles
 * @param {string} callerId - Caller's user ID
 * @returns {object} Modified where clause
 */
export function applyManagerScopeNested(where, callerRoles, callerId) {
  if (isManagerOnly(callerRoles)) {
    where.user = { ...where.user, managerUserId: callerId };
  }
  return where;
}

/**
 * Builds a standard attendance scope where clause.
 * Excludes admin accounts and applies manager restriction.
 *
 * @param {Array<Role>} callerRoles - Caller's roles
 * @param {string} callerId - Caller's user ID
 * @param {string} search - Optional search string
 * @returns {object} Prisma where clause
 */
export function buildAttendanceScopeWhere(callerRoles, callerId, search) {
  const where = {
    isActive: true,
    NOT: { roles: { has: Role.ADMIN } },
  };

  applyManagerScope(where, callerRoles, callerId);

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}
