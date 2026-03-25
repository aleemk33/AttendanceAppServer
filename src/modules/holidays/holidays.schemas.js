import { z } from 'zod';
// Holiday create/update payload schemas.
export const createHolidaySchema = z.object({
    title: z.string().min(1).max(120),
    description: z.string().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const updateHolidaySchema = z.object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    reason: z.string().min(1),
});
export const deleteHolidaySchema = z.object({
    reason: z.string().min(1),
});
export const listHolidaysQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    includeDeleted: z.preprocess((v) => v === 'true', z.boolean().default(false)),
});
//# sourceMappingURL=holidays.schemas.js.map