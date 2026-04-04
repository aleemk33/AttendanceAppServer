import { getPrisma, disconnectPrisma } from "../src/config/database.js";
import { rebuildAllAttendanceSummaries } from "../src/modules/attendance/attendance-summary.service.js";

async function main() {
  const prisma = getPrisma();
  console.log("Rebuilding attendance summaries...");
  await prisma.$connect();

  const result = await rebuildAllAttendanceSummaries(prisma);
  console.log(
    `Attendance summaries rebuilt. Deleted: ${result.deletedCount}, Created: ${result.createdCount}`,
  );
}

main()
  .then(async () => {
    await disconnectPrisma();
  })
  .catch(async (error) => {
    console.error("Failed to rebuild attendance summaries:", error);
    await disconnectPrisma();
    process.exit(1);
  });
