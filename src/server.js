import { loadEnv } from './config/env.js';
/**
 * IMPORTANT: load and validate environment variables before any other imports
 * that may call `env()` during module initialization.
 */
loadEnv();
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { getPrisma, disconnectPrisma } from './config/database.js';
import { rebuildAllAttendanceSummaries } from './modules/attendance/attendance-summary.service.js';
async function bootstrapAttendanceSummaries() {
    const prisma = getPrisma();
    const [summaryCount, punchCount, regularizationCount, approvedLeaveCount] = await Promise.all([
        prisma.attendanceSummary.count(),
        prisma.attendancePunch.count(),
        prisma.attendanceRegularization.count(),
        prisma.leaveRequest.count({ where: { status: 'APPROVED' } }),
    ]);
    const sourceRecordCount = punchCount + regularizationCount + approvedLeaveCount;
    if (summaryCount > 0 || sourceRecordCount === 0) {
        return;
    }
    logger.warn({ sourceRecordCount }, 'Attendance summaries are empty. Rebuilding from source records before startup...');
    const result = await rebuildAllAttendanceSummaries(prisma);
    logger.info({ deletedCount: result.deletedCount, createdCount: result.createdCount }, 'Attendance summaries rebuilt');
}
async function main() {
    const e = env();
    const app = createApp();
    // Fail fast if DB is unavailable so container/process restarts immediately.
    try {
        await getPrisma().$connect();
        logger.info('Database connected');
    }
    catch (err) {
        logger.error(err, 'Failed to connect to database');
        process.exit(1);
    }
    await bootstrapAttendanceSummaries();
    const server = app.listen(e.PORT, () => {
        logger.info(`Server running on port ${e.PORT}`);
        logger.info(`Swagger docs at http://localhost:${e.PORT}/docs`);
        logger.info(`Environment: ${e.NODE_ENV}`);
    });
    /**
     * Graceful shutdown path:
     * 1) stop accepting new connections
     * 2) close DB pool
     * 3) exit process
     */
    const shutdown = async (signal) => {
        logger.info(`${signal} received, shutting down...`);
        server.close(async () => {
            await disconnectPrisma();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
main().catch((err) => {
    // Last-resort crash handler for startup failures.
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
