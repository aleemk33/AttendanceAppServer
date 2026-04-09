-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('OFFICE', 'WFH');

-- AlterTable
ALTER TABLE "attendance_punches"
ADD COLUMN "report" TEXT,
ADD COLUMN "today_plan" TEXT,
ADD COLUMN "work_mode" "WorkMode" NOT NULL DEFAULT 'OFFICE';

-- AlterTable
ALTER TABLE "attendance_summaries"
ADD COLUMN "report" TEXT,
ADD COLUMN "today_plan" TEXT,
ADD COLUMN "work_mode" "WorkMode";

-- CreateTable
CREATE TABLE "work_from_home_days" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "work_from_home_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_from_home_days_attendance_date_idx" ON "work_from_home_days"("attendance_date");

-- CreateIndex
CREATE INDEX "work_from_home_days_created_by_user_id_idx" ON "work_from_home_days"("created_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_from_home_days_user_id_attendance_date_key" ON "work_from_home_days"("user_id", "attendance_date");

-- AddForeignKey
ALTER TABLE "work_from_home_days" ADD CONSTRAINT "work_from_home_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_from_home_days" ADD CONSTRAINT "work_from_home_days_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
