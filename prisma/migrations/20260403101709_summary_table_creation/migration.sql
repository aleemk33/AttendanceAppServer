-- CreateEnum
CREATE TYPE "AttendanceSummaryStatus" AS ENUM ('WORKING', 'PRESENT', 'HALF_DAY', 'ABSENT', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "AttendanceSummarySource" AS ENUM ('PUNCH', 'LEAVE', 'REGULARIZATION');

-- CreateTable
CREATE TABLE "attendance_summaries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "status" "AttendanceSummaryStatus" NOT NULL,
    "source" "AttendanceSummarySource" NOT NULL,
    "punch_in_at" TIMESTAMPTZ,
    "punch_out_at" TIMESTAMPTZ,
    "worked_minutes" INTEGER,
    "leave_request_id" UUID,
    "regularization_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_regularization_id_key" ON "attendance_summaries"("regularization_id");

-- CreateIndex
CREATE INDEX "attendance_summaries_attendance_date_idx" ON "attendance_summaries"("attendance_date");

-- CreateIndex
CREATE INDEX "attendance_summaries_user_id_status_idx" ON "attendance_summaries"("user_id", "status");

-- CreateIndex
CREATE INDEX "attendance_summaries_status_attendance_date_idx" ON "attendance_summaries"("status", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_summaries_user_id_attendance_date_key" ON "attendance_summaries"("user_id", "attendance_date");

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_regularization_id_fkey" FOREIGN KEY ("regularization_id") REFERENCES "attendance_regularizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
