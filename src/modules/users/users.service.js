import { Role } from "@prisma/client";
import { getPrisma } from "../../config/database.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors.js";
import { paginate, paginationMeta } from "../../common/pagination.js";
import { isManagerOnly } from "../../common/index.js";

// Business rule: ADMIN is exclusive and cannot be mixed with operational roles.
const INVALID_ROLE_COMBOS = [
  [Role.EMPLOYEE, Role.ADMIN],
  [Role.MANAGER, Role.ADMIN],
];
function validateRoleCombination(roles) {
  for (const combo of INVALID_ROLE_COMBOS) {
    if (combo.every((r) => roles.includes(r))) {
      throw new BadRequestError(
        `Invalid role combination: ${combo.join(" + ")} is not allowed`,
      );
    }
  }
}
/**
 * Lists users visible to caller with optional search/role/activity filters.
 *
 * Authorization scope:
 * - ADMIN: all users
 * - MANAGER (non-admin): direct reports only
 */
export async function listUsers(callerRoles, callerId, filters) {
  const prisma = getPrisma();
  const where = {};
  // Non-admin managers are tenant-scoped to their direct-report subtree (one level).
  if (isManagerOnly(callerRoles)) {
    where.managerUserId = callerId;
  }
  // Text search spans both name and email for flexible admin lookup.
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.role) {
    where.roles = { has: filters.role };
  }
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  // Prisma list-enum filters do not support nested `not`, so exclude admins
  // with a top-level NOT while preserving any explicit role filter above.
  where.NOT = { roles: { has: Role.ADMIN } };

  // Query count + page in parallel for latency.
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        isActive: true,
        managerUserId: true,
        manager: { select: { id: true, fullName: true } },
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
      ...paginate(filters.page, filters.limit),
    }),
  ]);
  return {
    items: users,
    meta: paginationMeta(total, filters.page, filters.limit),
  };
}
/**
 * Fetches one user with manager/profile details.
 * Enforces same manager scope rule as list endpoint.
 */
export async function getUserById(callerRoles, callerId, userId) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      manager: { select: { id: true, fullName: true, email: true } },
      attendanceProfile: true,
    },
  });
  if (!user) throw new NotFoundError("User");
  // Scope check mirrors listUsers to avoid privilege escalation by direct ID lookup.
  if (isManagerOnly(callerRoles)) {
    if (user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only view your direct reports");
    }
  }
  return user;
}
/**
 * Creates a user and its initial attendance profile.
 *
 * Guardrails:
 * - invalid role combinations rejected
 * - managers can create only employees under themselves
 * - email uniqueness enforced
 * - managerUserId (if given) must reference a manager
 */
export async function createUser(callerRoles, callerId, data) {
  const prisma = getPrisma();
  validateRoleCombination(data.roles);
  // Manager bootstrap guard: they can only onboard employees under themselves.
  if (isManagerOnly(callerRoles)) {
    if (data.roles.length !== 1 || !data.roles.includes(Role.EMPLOYEE)) {
      throw new ForbiddenError("Managers can only create EMPLOYEE users");
    }
    data.managerUserId = callerId;
  }
  // Explicit pre-check provides friendly conflict error before DB unique exception.
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new ConflictError("Email already registered");
  // Ensure manager reference points to a user who actually has MANAGER role.
  if (data.managerUserId) {
    const manager = await prisma.user.findUnique({
      where: { id: data.managerUserId },
    });
    if (!manager || !manager.roles.includes(Role.MANAGER)) {
      throw new BadRequestError("Invalid manager user ID");
    }
  }
  // Persist user first; profile follows to satisfy FK with generated user.id.
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      roles: data.roles,
      managerUserId: data.managerUserId || null,
    },
    include: { manager: { select: { id: true, fullName: true } } },
  });
  // Create profile eagerly so later attendance/device settings have a stable row.
  await prisma.attendanceProfile.create({ data: { userId: user.id } });
  return user;
}
/**
 * Updates mutable user fields with role/scope restrictions.
 *
 * Manager limitations:
 * - can update only direct reports
 * - cannot modify roles or manager assignment
 */
export async function updateUser(callerRoles, callerId, userId, data) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  // Manager scope + mutation restrictions.
  if (isManagerOnly(callerRoles)) {
    if (user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only update your direct reports");
    }
    // Managers cannot change roles or reassign manager
    if (data.roles || data.managerUserId !== undefined) {
      throw new ForbiddenError(
        "Managers cannot change roles or reassign manager",
      );
    }
  }
  if (data.roles) {
    validateRoleCombination(data.roles);
  }
  if (data.managerUserId) {
    const manager = await prisma.user.findUnique({
      where: { id: data.managerUserId },
    });
    if (!manager || !manager.roles.includes(Role.MANAGER)) {
      throw new BadRequestError("Invalid manager user ID");
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.roles !== undefined && { roles: data.roles }),
      ...(data.managerUserId !== undefined && {
        managerUserId: data.managerUserId,
      }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: { manager: { select: { id: true, fullName: true } } },
  });
}
/**
 * Returns attendance profile for a user, creating one if missing.
 * Auto-create keeps older data migrations from breaking profile UI.
 */
export async function getAttendanceProfile(callerRoles, callerId, userId) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  if (isManagerOnly(callerRoles)) {
    if (user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only view your direct reports");
    }
  }
  // Self-heal missing profile rows for legacy users or partial migrations.
  let profile = await prisma.attendanceProfile.findUnique({
    where: { userId },
    include: { updatedBy: { select: { id: true, fullName: true } } },
  });
  if (!profile) {
    profile = await prisma.attendanceProfile.create({
      data: { userId },
      include: { updatedBy: { select: { id: true, fullName: true } } },
    });
  }
  return profile;
}
/**
 * Upserts attendance/geofence profile.
 * `updatedByUserId` is tracked for audit visibility.
 */
export async function updateAttendanceProfile(
  callerRoles,
  callerId,
  userId,
  data,
) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");
  if (isManagerOnly(callerRoles)) {
    if (user.managerUserId !== callerId) {
      throw new ForbiddenError("You can only update your direct reports");
    }
  }
  // Upsert keeps this endpoint idempotent and handles first-time profile setup.
  return prisma.attendanceProfile.upsert({
    where: { userId },
    create: {
      userId,
      officeLatitude: data.officeLatitude,
      officeLongitude: data.officeLongitude,
      officeRadiusMeters: data.officeRadiusMeters,
      updatedByUserId: callerId,
    },
    update: {
      officeLatitude: data.officeLatitude,
      officeLongitude: data.officeLongitude,
      officeRadiusMeters: data.officeRadiusMeters,
      updatedByUserId: callerId,
    },
    include: { updatedBy: { select: { id: true, fullName: true } } },
  });
}
/**
 * Returns profile for currently authenticated user.
 * Includes manager summary and essential attendance profile fields.
 */
export async function getMyProfile(userId) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      manager: { select: { id: true, fullName: true, email: true } },
      attendanceProfile: {
        select: {
          boundDeviceId: true,
          officeLatitude: true,
          officeLongitude: true,
          officeRadiusMeters: true,
        },
      },
    },
  });
  if (!user) throw new NotFoundError("User");
  return user;
}
//# sourceMappingURL=users.service.js.map
