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

    async def _crawl_url(self, crawler: AsyncWebCrawler, url: str) -> str | None:
        """Crawl a single URL and return its markdown content, or None on failure."""
        result = await crawler.arun(url=url, config=CrawlerRunConfig())
        if not result.success or not result.markdown:
            await mark_url_visited(self.pool, url, found_emails=False)
            return None
        return result.markdown

    async def _extract_and_insert(self, url: str, markdown: str) -> tuple[int, int]:
        """Extract emails from markdown, get AI context, insert prospects.
        Returns (emails_found, new_prospects).
        """
        emails = extract_emails(markdown)
        if not emails:
            await mark_url_visited(self.pool, url, found_emails=False)
            return 0, 0

        context = await extract_company_context(markdown[:3000])
        new_count = 0

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
                new_count += 1

        await mark_url_visited(self.pool, url, found_emails=True)
        return len(emails), new_count

    async def visit_and_extract(self, urls: list[str]) -> dict:
        start_time = time.time()
        total_found = 0
        total_new = 0
        error_msg = None

        try:
            fresh_urls = await filter_unvisited_urls(self.pool, urls)
            skipped = len(urls) - len(fresh_urls)
            if skipped > 0:
                print(f"[SiteVisitor] Skipping {skipped} recently visited URLs")
            print(f"[SiteVisitor] Visiting {len(fresh_urls)} new URLs")

            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                for url in fresh_urls:
                    try:
                        markdown = await self._crawl_url(crawler, url)
                        if not markdown:
                            continue

                        found, new = await self._extract_and_insert(url, markdown)
                        total_found += found
                        total_new += new

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
