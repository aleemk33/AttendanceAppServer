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
//# sourceMappingURL=pagination.js.map
