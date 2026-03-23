import asyncio
import time
import asyncpg
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

from src.utils.email_extractor import extract_emails
from src.utils.db import insert_prospect, log_scrape, filter_unvisited_urls, mark_url_visited
from src.extractors.ai_extractor import extract_company_context


class SiteVisitor:
    """Visits URLs from Google search, extracts emails and context."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        self.source_id = source_id
        self.pool = pool
        self.browser_config = BrowserConfig(headless=True)

    async def visit_and_extract(self, urls: list[str]) -> dict:
        start_time = time.time()
        total_found = 0
        total_new = 0
        error_msg = None

        try:
            # Filter out recently visited URLs
            fresh_urls = await filter_unvisited_urls(self.pool, urls)
            skipped = len(urls) - len(fresh_urls)
            if skipped > 0:
                print(f"[SiteVisitor] Skipping {skipped} recently visited URLs")
            print(f"[SiteVisitor] Visiting {len(fresh_urls)} new URLs")

            config = CrawlerRunConfig()

            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                for url in fresh_urls:
                    try:
                        result = await crawler.arun(url=url, config=config)

                        if not result.success or not result.markdown:
                            await mark_url_visited(self.pool, url, found_emails=False)
                            continue

                        emails = extract_emails(result.markdown)
                        if not emails:
                            await mark_url_visited(self.pool, url, found_emails=False)
                            await asyncio.sleep(5)
                            continue

                        total_found += len(emails)

                        context = await extract_company_context(
                            result.markdown[:3000]
                        )

                        for email in emails:
                            inserted = await insert_prospect(
                                self.pool,
                                email=email,
                                company_name=context.get("company_name"),
                                website=url,
                                industry=context.get("industry"),
                                company_type=context.get("company_type"),
                                description=context.get("description"),
                                source_id=self.source_id,
                            )
                            if inserted:
                                total_new += 1

                        await mark_url_visited(self.pool, url, found_emails=True)
                        await asyncio.sleep(5)

                    except Exception as e:
                        print(f"[SiteVisitor] Error visiting {url}: {e}")
                        continue

            status = "SUCCESS"

        except Exception as e:
            status = "FAILED"
            error_msg = str(e)[:500]

        duration_ms = int((time.time() - start_time) * 1000)

        await log_scrape(
            self.pool,
            source_id=self.source_id,
            status=status,
            prospects_found=total_found,
            prospects_new=total_new,
            error_message=error_msg,
            duration_ms=duration_ms,
        )

        return {
            "source": "google_search",
            "status": status,
            "found": total_found,
            "new": total_new,
            "duration_ms": duration_ms,
        }
