import asyncpg
from src.crawlers.base_crawler import BaseCrawler


CATEGORY_URLS = [
    "https://pymes.cr/listing-category/alimentacion/",
    "https://pymes.cr/listing-category/eco-verde/",
    "https://pymes.cr/listing-category/entretenimiento/",
    "https://pymes.cr/listing-category/salud-y-belleza/",
    "https://pymes.cr/listing-category/servicios/",
    "https://pymes.cr/listing-category/turismo/",
    "https://pymes.cr/listing-category/otros/",
]


class PymesCrawler(BaseCrawler):
    """Crawls pymes.cr directory for Costa Rican small businesses."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        super().__init__(source_id, "pymes.cr", pool)

    async def get_urls(self) -> list[str]:
        return CATEGORY_URLS
