"""Test: use Crawl4AI to visit company websites and extract emails."""
import asyncio
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from src.utils.email_extractor import extract_emails

load_dotenv()

# Simulate what Google would return - real company websites in CR
TEST_COMPANY_URLS = [
    "https://www.asouna.com",
    "https://www.asetrabajo.com",
    "https://conasol.cr",
    "https://aseimocr.net",
    "https://www.asanetcr.com",
]


async def test():
    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()

    all_results = []

    async with AsyncWebCrawler(config=config) as crawler:
        for url in TEST_COMPANY_URLS:
            print(f"\n{'='*50}")
            print(f"Visiting: {url}")

            try:
                result = await crawler.arun(url=url, config=run_config)

                if not result.success:
                    print(f"  FAILED: {result.error_message}")
                    continue

                markdown = result.markdown or ""
                emails = extract_emails(markdown)

                print(f"  Content: {len(markdown)} chars")
                print(f"  Emails found: {len(emails)}")
                for email in emails:
                    print(f"    -> {email}")
                    all_results.append({"url": url, "email": email})

            except Exception as e:
                print(f"  ERROR: {e}")

            await asyncio.sleep(3)

    print(f"\n{'='*50}")
    print(f"TOTAL: {len(all_results)} emails from {len(TEST_COMPANY_URLS)} sites")
    for r in all_results:
        print(f"  {r['email']} <- {r['url']}")


if __name__ == "__main__":
    asyncio.run(test())
