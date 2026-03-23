import asyncpg
from src.crawlers.base_crawler import BaseCrawler


SECTION_URLS = [
    "https://directorioscostarica.com/listado/servicios",
    "https://directorioscostarica.com/listado/comercio",
    "https://directorioscostarica.com/listado/industria",
    "https://directorioscostarica.com/listado/tecnologia",
    "https://directorioscostarica.com/listado/salud",
    "https://directorioscostarica.com/listado/educacion",
    "https://directorioscostarica.com/listado/turismo",
]


class DirectorioCRCrawler(BaseCrawler):
    """Crawls directorioscostarica.com for businesses."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        super().__init__(source_id, "directorioscostarica.com", pool)

    async def get_urls(self) -> list[str]:
        return SECTION_URLS
