import { z } from 'zod';
// Date strings stay in YYYY-MM-DD to align with business timezone day-based logic.
export const createLeaveRequestSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().min(1),
});
export const leaveActionSchema = z.object({
    actionNote: z.string().optional(),
});
export const leaveRejectSchema = z.object({
    actionNote: z.string().min(1),
});
export const listLeaveRequestsQuerySchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=leaves.schemas.js.map