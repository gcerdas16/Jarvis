import asyncio
from dotenv import load_dotenv

from src.utils.db import get_pool
from src.google_bot.search import get_daily_urls_async
from src.google_bot.site_visitor import SiteVisitor
from src.crawlers.directorio_cr_crawler import DirectorioCRCrawler
from src.crawlers.pymes_crawler import PymesCrawler
from src.crawlers.solidaristas_crawler import SolidaristasCrawler
from src.crawlers.merco_crawler import MercoCrawler

load_dotenv()

SOURCES = [
    {"name": "directorioscostarica.com", "type": "directory", "crawler": DirectorioCRCrawler},
    {"name": "pymes.cr", "type": "directory", "crawler": PymesCrawler},
    {"name": "solidaristas", "type": "solidarista", "crawler": SolidaristasCrawler},
    {"name": "merco.info", "type": "directory", "crawler": MercoCrawler},
]


async def ensure_source(pool, name: str, source_type: str) -> str:
    """Ensure a source exists in DB and return its ID."""
    row = await pool.fetchrow(
        "SELECT id FROM sources WHERE name = $1", name
    )
    if row:
        return row["id"]

    row = await pool.fetchrow(
        """
        INSERT INTO sources (id, name, type, is_active, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
        RETURNING id
        """,
        name, source_type,
    )
    return row["id"]


async def run_directory_crawlers(pool) -> None:
    """Run all directory-based crawlers."""
    for source_config in SOURCES:
        name = source_config["name"]
        print(f"\n[Main] Starting crawler: {name}")

        source_id = await ensure_source(pool, name, source_config["type"])
        crawler = source_config["crawler"](source_id=source_id, pool=pool)
        result = await crawler.run()

        print(
            f"[Main] {name} done: "
            f"found={result['found']}, new={result['new']}, "
            f"duration={result['duration_ms']}ms"
        )


async def run_google_bot(pool) -> None:
    """Run the Google search bot: find URLs and visit them."""
    print("\n[Main] Starting Google Bot...")
    source_id = await ensure_source(pool, "google_search", "google")

    urls = await get_daily_urls_async(max_queries=10)
    print(f"[Main] Google Bot found {len(urls)} URLs to visit")

    if not urls:
        print("[Main] No URLs found, skipping")
        return

    visitor = SiteVisitor(source_id=source_id, pool=pool)
    result = await visitor.visit_and_extract(urls)

    print(
        f"[Main] Google Bot done: "
        f"found={result['found']}, new={result['new']}, "
        f"duration={result['duration_ms']}ms"
    )


async def main() -> None:
    print("=" * 50)
    print("[Main] Outreach Engine Scrapers starting...")
    print("=" * 50)

    pool = await get_pool()

    try:
        await run_directory_crawlers(pool)
        await run_google_bot(pool)
    finally:
        await pool.close()

    print("\n" + "=" * 50)
    print("[Main] Scraping cycle complete.")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
