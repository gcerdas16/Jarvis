"""Google search using Crawl4AI to scrape Google results directly."""
import re
import time
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from urllib.parse import quote_plus

KEYWORDS = [
    "empresas Costa Rica contacto",
    "asociaciones solidaristas Costa Rica",
    "pymes Costa Rica directorio",
    "empresas tecnología Costa Rica",
    "empresas logística Costa Rica",
    "empresas manufactura Costa Rica",
    "empresas servicios financieros Costa Rica",
    "asociación solidarista empleados",
    "directorio empresas San José Costa Rica",
    "empresas automatización procesos Costa Rica",
]

# Domains to skip (not company websites)
SKIP_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "twitter.com",
    "instagram.com", "linkedin.com", "wikipedia.org", "reddit.com",
    "tiktok.com", "pinterest.com", "amazon.com", "x.com",
}


def _is_valid_url(url: str) -> bool:
    """Check if URL is a valid company website (not social media, etc)."""
    for domain in SKIP_DOMAINS:
        if domain in url:
            return False
    return url.startswith("http")


def _extract_urls_from_markdown(markdown: str) -> list[str]:
    """Extract URLs from Google results markdown."""
    urls = re.findall(r'\((https?://[^)]+)\)', markdown)
    valid = []
    seen = set()
    for url in urls:
        clean = url.split("&")[0] if "google.com/url" in url else url
        if _is_valid_url(clean) and clean not in seen:
            seen.add(clean)
            valid.append(clean)
    return valid


async def search_google_async(
    query: str, num_results: int = 10
) -> list[str]:
    """Search Google using Crawl4AI and return URLs."""
    encoded = quote_plus(query)
    url = f"https://www.google.com/search?q={encoded}&num={num_results}&hl=es&gl=cr"

    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()

    try:
        async with AsyncWebCrawler(config=config) as crawler:
            result = await crawler.arun(url=url, config=run_config)
            if not result.success:
                print(f"[GoogleBot] Failed to scrape Google")
                return []

            urls = _extract_urls_from_markdown(result.markdown or "")
            return urls[:num_results]

    except Exception as e:
        print(f"[GoogleBot] Search error: {e}")
        return []


def search_google(query: str, num_results: int = 10) -> list[str]:
    """Sync wrapper for search_google_async."""
    return asyncio.run(search_google_async(query, num_results))


async def get_daily_urls_async(max_queries: int = 10) -> list[str]:
    """Run multiple keyword searches and return all unique URLs."""
    all_urls: list[str] = []
    seen: set[str] = set()

    config = BrowserConfig(headless=True)
    run_config = CrawlerRunConfig()

    async with AsyncWebCrawler(config=config) as crawler:
        for keyword in KEYWORDS[:max_queries]:
            print(f"[GoogleBot] Searching: {keyword}")
            encoded = quote_plus(keyword)
            url = f"https://www.google.com/search?q={encoded}&num=10&hl=es&gl=cr"

            try:
                result = await crawler.arun(url=url, config=run_config)
                if result.success:
                    urls = _extract_urls_from_markdown(
                        result.markdown or ""
                    )
                    for u in urls:
                        if u not in seen:
                            seen.add(u)
                            all_urls.append(u)
                    print(f"[GoogleBot]   Found {len(urls)} URLs")
            except Exception as e:
                print(f"[GoogleBot]   Error: {e}")

            await asyncio.sleep(5)

    return all_urls
