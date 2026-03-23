import asyncpg
from src.crawlers.base_crawler import BaseCrawler
from src.extractors.ai_extractor import extract_company_context
from src.utils.email_extractor import extract_emails
from src.utils.db import insert_prospect


SOLIDARISTA_URLS = [
    "https://www.asouna.com",
    "https://aseimocr.net/las-asociaciones-solidaristas-en-costa-rica/",
    "https://conasol.cr/",
    "https://www.asetrabajo.com/",
]


class SolidaristasCrawler(BaseCrawler):
    """Crawls asociaciones solidaristas websites."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        super().__init__(source_id, "solidaristas", pool)

    async def get_urls(self) -> list[str]:
        return SOLIDARISTA_URLS

    async def process_result(self, url: str, markdown: str) -> list[dict]:
        emails = extract_emails(markdown)
        if not emails:
            return []

        context = await extract_company_context(markdown[:3000])

        return [
            {
                "email": email,
                "company_name": context.get("company_name"),
                "website": url,
                "industry": "solidarista",
                "company_type": "solidarista",
                "description": context.get("description"),
            }
            for email in emails
        ]
