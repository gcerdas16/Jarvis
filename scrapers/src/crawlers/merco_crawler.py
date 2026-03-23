import asyncpg
from src.crawlers.base_crawler import BaseCrawler


class MercoCrawler(BaseCrawler):
    """Crawls merco.info ranking of top companies in Costa Rica."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        super().__init__(source_id, "merco.info", pool)

    async def get_urls(self) -> list[str]:
        return [
            "https://www.merco.info/cr/ranking-merco-empresas",
            "https://www.merco.info/cr/ranking-merco-responsabilidad-gobierno-corporativo",
        ]
