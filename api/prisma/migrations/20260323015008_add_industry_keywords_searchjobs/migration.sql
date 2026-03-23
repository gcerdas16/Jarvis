-- CreateTable
CREATE TABLE "industry_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "industry_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "industry_id" TEXT NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 1,
    "max_page" INTEGER NOT NULL DEFAULT 5,
    "last_searched_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_jobs" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "search_type" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "results_count" INTEGER NOT NULL DEFAULT 0,
    "new_urls_count" INTEGER NOT NULL DEFAULT 0,
    "provider" TEXT NOT NULL DEFAULT 'serper',
    "searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "industry_categories_name_key" ON "industry_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "search_keywords_keyword_key" ON "search_keywords"("keyword");

-- CreateIndex
CREATE INDEX "search_keywords_industry_id_idx" ON "search_keywords"("industry_id");

-- CreateIndex
CREATE INDEX "search_keywords_last_searched_at_idx" ON "search_keywords"("last_searched_at");

-- CreateIndex
CREATE INDEX "search_jobs_keyword_id_idx" ON "search_jobs"("keyword_id");

-- CreateIndex
CREATE INDEX "search_jobs_searched_at_idx" ON "search_jobs"("searched_at");

-- AddForeignKey
ALTER TABLE "search_keywords" ADD CONSTRAINT "search_keywords_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industry_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_jobs" ADD CONSTRAINT "search_jobs_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "search_keywords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
