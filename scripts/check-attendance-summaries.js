// import { getPrisma, disconnectPrisma } from "../src/config/database.js";
// import { getAttendanceSummaryHealth } from "../src/modules/attendance/attendance-summary.service.js";

// async function main() {
//   const prisma = getPrisma();
//   await prisma.$connect();

//   const health = await getAttendanceSummaryHealth(prisma);
//   const summary = {
//     expectedCount: health.expectedCount,
//     actualCount: health.actualCount,
//     missingCount: health.missingCount,
//     extraCount: health.extraCount,
//     mismatchedCount: health.mismatchedCount,
//   };

//   if (health.needsRepair) {
//     console.error("Attendance summary health check failed.", summary);
//     process.exitCode = 1;
//     return;
//   }

//   console.log("Attendance summaries are healthy.", summary);
// }

// main()
//   .then(async () => {
//     await disconnectPrisma();
//   })
//   .catch(async (error) => {
//     console.error("Failed to verify attendance summaries:", error);
//     await disconnectPrisma();
//     process.exit(1);
//   });
