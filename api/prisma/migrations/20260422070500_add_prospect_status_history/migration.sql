-- CreateTable
CREATE TABLE "prospect_status_history" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "from_status" "ProspectStatus",
    "to_status" "ProspectStatus" NOT NULL,
    "changed_by" TEXT NOT NULL DEFAULT 'system',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospect_status_history_prospect_id_idx" ON "prospect_status_history"("prospect_id");

-- AddForeignKey
ALTER TABLE "prospect_status_history" ADD CONSTRAINT "prospect_status_history_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
