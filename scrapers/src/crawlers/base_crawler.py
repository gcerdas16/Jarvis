import asyncio
import time
import asyncpg
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

from src.utils.email_extractor import extract_emails
from src.utils.db import insert_prospect, log_scrape


class BaseCrawler:
    """Base class for all source-specific crawlers."""

    def __init__(self, source_id: str, source_name: str, pool: asyncpg.Pool):
        self.source_id = source_id
        self.source_name = source_name
        self.pool = pool
        self.browser_config = BrowserConfig(headless=True)

    async def get_urls(self) -> list[str]:
        """Override: return list of URLs to scrape."""
        raise NotImplementedError

    async def process_result(self, url: str, markdown: str) -> list[dict]:
        """Override: process crawled content into prospect dicts.
        Default: extract emails from markdown.
        """
        emails = extract_emails(markdown)
        return [
            {
                "email": email,
                "company_name": None,
                "website": url,
                "industry": None,
                "company_type": None,
                "description": None,
            }
            for email in emails
        ]

    async def run(self) -> dict:
        start_time = time.time()
        total_found = 0
        total_new = 0
        error_msg = None

        try:
            urls = await self.get_urls()
            config = CrawlerRunConfig()

            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                for url in urls:
                    try:
                        result = await crawler.arun(url=url, config=config)

                        if not result.success:
                            continue

                        prospects = await self.process_result(
                            url, result.markdown or ""
                        )
                        total_found += len(prospects)

                        for prospect in prospects:
                            inserted = await insert_prospect(
                                self.pool,
                                email=prospect["email"],
                                company_name=prospect.get("company_name"),
                                website=prospect.get("website"),
                                industry=prospect.get("industry"),
                                company_type=prospect.get("company_type"),
                                description=prospect.get("description"),
                                source_id=self.source_id,
                            )
                            if inserted:
                                total_new += 1

                        await asyncio.sleep(5)

                    except Exception as e:
                        print(f"[{self.source_name}] Error crawling {url}: {e}")
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
            "source": self.source_name,
            "status": status,
            "found": total_found,
            "new": total_new,
            "duration_ms": duration_ms,
        }
