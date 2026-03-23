"""Quick test: scrape one URL and show extracted emails."""
import asyncio
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from src.utils.email_extractor import extract_emails

load_dotenv()

TEST_URLS = [
    "https://www.asouna.com",
    "https://pymes.cr/listing-category/servicios/",
]


async def test():
    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()

    async with AsyncWebCrawler(config=config) as crawler:
        for url in TEST_URLS:
            print(f"\n{'='*50}")
            print(f"Scraping: {url}")
            print('='*50)

            result = await crawler.arun(url=url, config=run_config)

            if not result.success:
                print(f"FAILED: {result.error_message}")
                continue

            markdown = result.markdown or ""
            print(f"Content length: {len(markdown)} chars")

            emails = extract_emails(markdown)
            print(f"Emails found: {len(emails)}")
            for email in emails:
                print(f"  -> {email}")


if __name__ == "__main__":
    asyncio.run(test())
