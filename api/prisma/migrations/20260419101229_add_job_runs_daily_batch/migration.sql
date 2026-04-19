-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EMAIL_SEND', 'FOLLOW_UPS', 'SCRAPER');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- AlterTable
ALTER TABLE "prospects" ADD COLUMN     "keyword" TEXT,
ADD COLUMN     "search_type" TEXT;

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "status" "JobRunStatus" NOT NULL,
    "result" TEXT,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_batches" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "batch_date" TIMESTAMP(3) NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_runs_job_type_idx" ON "job_runs"("job_type");

-- CreateIndex
CREATE INDEX "job_runs_started_at_idx" ON "job_runs"("started_at");

-- CreateIndex
CREATE INDEX "job_runs_status_idx" ON "job_runs"("status");

-- CreateIndex
CREATE INDEX "daily_batches_batch_date_idx" ON "daily_batches"("batch_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_batches_prospect_id_batch_date_key" ON "daily_batches"("prospect_id", "batch_date");

-- AddForeignKey
ALTER TABLE "daily_batches" ADD CONSTRAINT "daily_batches_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
