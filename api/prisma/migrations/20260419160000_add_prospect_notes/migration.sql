-- CreateTable
CREATE TABLE "prospect_notes" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "note_type" TEXT NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospect_notes_prospect_id_idx" ON "prospect_notes"("prospect_id");

-- AddForeignKey
ALTER TABLE "prospect_notes" ADD CONSTRAINT "prospect_notes_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
