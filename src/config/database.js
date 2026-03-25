import { PrismaClient } from '@prisma/client';
// Lazily initialized global Prisma client (single instance per process).
let prisma;
export function getPrisma() {
    if (!prisma) {
        // Instantiate only when first needed (faster startup for non-DB contexts).
        prisma = new PrismaClient();
    }
    return prisma;
}
export async function disconnectPrisma() {
    // Safe no-op if Prisma was never initialized.
    if (prisma) {
        await prisma.$disconnect();
    }
}
//# sourceMappingURL=database.js.map