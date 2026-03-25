import { HolidayChangeType } from '@prisma/client';
import { getPrisma } from '../../config/database.js';
import { BadRequestError, ConflictError, NotFoundError, } from '../../common/errors.js';
import { businessToday } from '../../common/index.js';
// Normalized snapshot stored in change logs for audit/history visibility.
function holidaySnapshot(h) {
    return {
        title: h.title,
        description: h.description,
        startDate: h.startDate.toISOString().slice(0, 10),
        endDate: h.endDate.toISOString().slice(0, 10),
        isDeleted: h.isDeleted,
    };
}
async function checkOverlap(startDate, endDate, excludeId) {
    const prisma = getPrisma();
    const where = {
        isDeleted: false,
        startDate: { lte: new Date(endDate) },
        endDate: { gte: new Date(startDate) },
    };
    if (excludeId) {
        where.id = { not: excludeId };
    }
    const overlap = await prisma.holiday.findFirst({ where });
    if (overlap) {
        throw new ConflictError(`Overlaps with existing holiday: ${overlap.title}`);
    }
}
/**
 * Creates a holiday and writes an audit log snapshot.
 * Overlap with existing active holidays is blocked.
 */
export async function createHoliday(callerId, data) {
    const prisma = getPrisma();
    if (data.startDate > data.endDate) {
        throw new BadRequestError('startDate must be <= endDate');
    }
    await checkOverlap(data.startDate, data.endDate);
    const holiday = await prisma.holiday.create({
        data: {
            title: data.title,
            description: data.description || null,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            createdByUserId: callerId,
        },
    });
    // Immutable audit trail for timeline/history APIs.
    // Audit entry stores "after" state for deterministic history rendering.
    await prisma.holidayChangeLog.create({
        data: {
            holidayId: holiday.id,
            changeType: HolidayChangeType.CREATED,
            reason: 'Initial creation',
            changedByUserId: callerId,
            snapshotAfter: holidaySnapshot(holiday),
        },
    });
    return holiday;
}
/**
 * Updates future holidays only.
 *
 * Constraints:
 * - started holidays are immutable
 * - updated date range must remain non-overlapping
 * - reason is required and stored in change history
 */
export async function updateHoliday(callerId, holidayId, data) {
    const prisma = getPrisma();
    const holiday = await prisma.holiday.findUnique({ where: { id: holidayId } });
    if (!holiday || holiday.isDeleted)
        throw new NotFoundError('Holiday');
    // Block edits once holiday has started to keep attendance calculations stable.
    const today = businessToday();
    if (today >= holiday.startDate.toISOString().slice(0, 10)) {
        throw new BadRequestError('Cannot update a holiday that has already started');
    }
    const newStart = data.startDate || holiday.startDate.toISOString().slice(0, 10);
    const newEnd = data.endDate || holiday.endDate.toISOString().slice(0, 10);
    if (newStart > newEnd)
        throw new BadRequestError('startDate must be <= endDate');
    await checkOverlap(newStart, newEnd, holidayId);
    // Capture pre-change snapshot for audit diff views.
    const before = holidaySnapshot(holiday);
    const updated = await prisma.holiday.update({
        where: { id: holidayId },
        data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
            ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
            updatedByUserId: callerId,
        },
    });
    await prisma.holidayChangeLog.create({
        data: {
            holidayId: holiday.id,
            changeType: HolidayChangeType.UPDATED,
            reason: data.reason,
            changedByUserId: callerId,
            snapshotBefore: before,
            snapshotAfter: holidaySnapshot(updated),
        },
    });
    return updated;
}
/**
 * Soft deletes a future holiday and records deletion reason.
 */
export async function deleteHoliday(callerId, holidayId, reason) {
    const prisma = getPrisma();
    const holiday = await prisma.holiday.findUnique({ where: { id: holidayId } });
    if (!holiday || holiday.isDeleted)
        throw new NotFoundError('Holiday');
    const today = businessToday();
    if (today >= holiday.startDate.toISOString().slice(0, 10)) {
        throw new BadRequestError('Cannot delete a holiday that has already started');
    }
    const before = holidaySnapshot(holiday);
    // Soft-delete preserves historic references and auditability.
    await prisma.holiday.update({
        where: { id: holidayId },
        data: { isDeleted: true, updatedByUserId: callerId },
    });
    await prisma.holidayChangeLog.create({
        data: {
            holidayId: holiday.id,
            changeType: HolidayChangeType.DELETED,
            reason,
            changedByUserId: callerId,
            snapshotBefore: before,
        },
    });
    return { deleted: true };
}
/**
 * Lists holidays in a date window.
 * Optional `includeDeleted` supports audit/admin screens.
 */
export async function listHolidays(filters) {
    const prisma = getPrisma();
    const where = {};
    if (!filters.includeDeleted) {
        where.isDeleted = false;
    }
    if (filters.startDate) {
        where.endDate = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
        where.startDate = { ...(where.startDate || {}), lte: new Date(filters.endDate) };
    }
    return prisma.holiday.findMany({
        where,
        orderBy: { startDate: 'asc' },
        include: {
            createdBy: { select: { id: true, fullName: true } },
            updatedBy: { select: { id: true, fullName: true } },
        },
    });
}
/**
 * Returns one holiday with created/updated actor metadata.
 */
export async function getHolidayById(holidayId) {
    const prisma = getPrisma();
    const holiday = await prisma.holiday.findUnique({
        where: { id: holidayId },
        include: {
            createdBy: { select: { id: true, fullName: true } },
            updatedBy: { select: { id: true, fullName: true } },
        },
    });
    if (!holiday)
        throw new NotFoundError('Holiday');
    return holiday;
}
/**
 * Returns holiday change log timeline, newest first.
 */
export async function getHolidayHistory(holidayId) {
    const prisma = getPrisma();
    const holiday = await prisma.holiday.findUnique({ where: { id: holidayId } });
    if (!holiday)
        throw new NotFoundError('Holiday');
    return prisma.holidayChangeLog.findMany({
        where: { holidayId },
        orderBy: { changedAt: 'desc' },
        include: {
            changedBy: { select: { id: true, fullName: true } },
        },
    });
}
//# sourceMappingURL=holidays.service.js.map