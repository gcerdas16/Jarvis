-- Add social media, tech stack, and lead scoring fields to prospects
ALTER TABLE "prospects"
ADD COLUMN "instagram"      TEXT,
ADD COLUMN "facebook"       TEXT,
ADD COLUMN "linkedin"       TEXT,
ADD COLUMN "whatsapp"       TEXT,
ADD COLUMN "tiktok"         TEXT,
ADD COLUMN "tech_stack"     TEXT,
ADD COLUMN "maturity_score" INTEGER,
ADD COLUMN "lead_tier"      TEXT;

CREATE INDEX "prospects_lead_tier_idx"      ON "prospects"("lead_tier");
CREATE INDEX "prospects_maturity_score_idx" ON "prospects"("maturity_score");
