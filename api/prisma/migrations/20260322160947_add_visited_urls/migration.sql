-- CreateTable
CREATE TABLE "visited_urls" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "found_emails" BOOLEAN NOT NULL DEFAULT false,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisit_after" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visited_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visited_urls_url_key" ON "visited_urls"("url");

-- CreateIndex
CREATE INDEX "visited_urls_revisit_after_idx" ON "visited_urls"("revisit_after");
