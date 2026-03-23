"""Test: scrape listing page, find company links, visit each one."""
import asyncio
import re
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from src.utils.email_extractor import extract_emails

load_dotenv()


async def test():
    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()

    async with AsyncWebCrawler(config=config) as crawler:
        # Step 1: Get listing page
        url = "https://pymes.cr/listing-category/servicios/"
        print(f"Step 1: Scraping listing page: {url}")
        result = await crawler.arun(url=url, config=run_config)

        if not result.success:
            print(f"FAILED: {result.error_message}")
            return

        # Step 2: Show links found in the page
        markdown = result.markdown or ""

        # Find all links in markdown format [text](url)
        all_links = re.findall(r'\(https?://pymes\.cr/[^)]+\)', markdown)
        print(f"\nAll pymes.cr links found ({len(all_links)}):")
        for link in all_links[:20]:
            print(f"  {link}")

        # Find profile-like links
        profile_links = re.findall(r'\((https?://pymes\.cr/listings/[^)]+)\)', markdown)
        print(f"\nProfile links found ({len(profile_links)}):")
        for link in profile_links[:10]:
            print(f"  {link}")

        # If no profile links, show a sample of the markdown to understand format
        if not profile_links:
            print(f"\nMarkdown sample (first 2000 chars):")
            print(markdown[:2000])


if __name__ == "__main__":
    asyncio.run(test())
