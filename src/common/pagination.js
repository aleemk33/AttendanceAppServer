import { z } from 'zod';
// Shared schema for list endpoints that support page-based pagination.
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});
export function paginate(page, limit) {
    // Prisma skip/take mapping from 1-based API page values.
    return { skip: (page - 1) * limit, take: limit };
}
export function paginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}
export const dateRangeSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
});
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');
//# sourceMappingURL=pagination.js.map