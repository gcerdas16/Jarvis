"""Test: Google Search via Crawl4AI + visit results + extract emails."""
import asyncio
from dotenv import load_dotenv
from src.google_bot.search import search_google_async
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from src.utils.email_extractor import extract_emails

load_dotenv()


async def test():
    # Step 1: Search Google
    query = "asociaciones solidaristas Costa Rica contacto"
    print(f"Searching Google: '{query}'")
    urls = await search_google_async(query, num_results=5)

    print(f"Found {len(urls)} results:")
    for url in urls:
        print(f"  {url}")

    if not urls:
        print("No results found")
        return

    # Step 2: Visit each result and extract emails
    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()
    all_emails = []

    async with AsyncWebCrawler(config=config) as crawler:
        for url in urls:
            print(f"\nVisiting: {url}")
            try:
                result = await crawler.arun(url=url, config=run_config)
                if not result.success:
                    print(f"  FAILED")
                    continue

                emails = extract_emails(result.markdown or "")
                print(f"  Emails: {emails}")
                all_emails.extend([(e, url) for e in emails])
            except Exception as e:
                print(f"  ERROR: {e}")

            await asyncio.sleep(3)

    print(f"\n{'='*50}")
    print(f"TOTAL: {len(all_emails)} emails")
    for email, url in all_emails:
        print(f"  {email} <- {url}")


if __name__ == "__main__":
    asyncio.run(test())
