-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'QUEUED', 'CONTACTED', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_3', 'RESPONDED', 'UNSUBSCRIBED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FOLLOW_UP_3');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "base_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "company_type" TEXT,
    "description" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CR',
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject_line" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "follow_up_1" TEXT,
    "follow_up_2" TEXT,
    "follow_up_3" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails_sent" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "email_type" "EmailType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ses_message_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "email_sent_id" TEXT NOT NULL,
    "event_type" "EmailEventType" NOT NULL,
    "metadata" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "subject" TEXT,
    "body_preview" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unsubscribes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unsubscribes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrape_logs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "status" "ScrapeStatus" NOT NULL,
    "prospects_found" INTEGER NOT NULL DEFAULT 0,
    "prospects_new" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "scrape_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warmup_state" (
    "id" TEXT NOT NULL,
    "current_daily_limit" INTEGER NOT NULL DEFAULT 5,
    "max_daily_limit" INTEGER NOT NULL DEFAULT 30,
    "emails_sent_today" INTEGER NOT NULL DEFAULT 0,
    "last_reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warmup_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_email_key" ON "prospects"("email");

-- CreateIndex
CREATE INDEX "prospects_status_idx" ON "prospects"("status");

-- CreateIndex
CREATE INDEX "prospects_source_id_idx" ON "prospects"("source_id");

-- CreateIndex
CREATE INDEX "prospects_company_type_idx" ON "prospects"("company_type");

-- CreateIndex
CREATE INDEX "emails_sent_prospect_id_idx" ON "emails_sent"("prospect_id");

-- CreateIndex
CREATE INDEX "emails_sent_campaign_id_idx" ON "emails_sent"("campaign_id");

-- CreateIndex
CREATE INDEX "emails_sent_sent_at_idx" ON "emails_sent"("sent_at");

-- CreateIndex
CREATE INDEX "email_events_email_sent_id_idx" ON "email_events"("email_sent_id");

-- CreateIndex
CREATE INDEX "email_events_event_type_idx" ON "email_events"("event_type");

-- CreateIndex
CREATE INDEX "responses_prospect_id_idx" ON "responses"("prospect_id");

-- CreateIndex
CREATE UNIQUE INDEX "unsubscribes_email_key" ON "unsubscribes"("email");

-- CreateIndex
CREATE INDEX "scrape_logs_source_id_idx" ON "scrape_logs"("source_id");

-- CreateIndex
CREATE INDEX "scrape_logs_started_at_idx" ON "scrape_logs"("started_at");

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails_sent" ADD CONSTRAINT "emails_sent_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_email_sent_id_fkey" FOREIGN KEY ("email_sent_id") REFERENCES "emails_sent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrape_logs" ADD CONSTRAINT "scrape_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
