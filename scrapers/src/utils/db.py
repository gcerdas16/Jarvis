import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


async def get_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)


async def is_duplicate(pool: asyncpg.Pool, email: str) -> bool:
    row = await pool.fetchrow(
        "SELECT id FROM prospects WHERE email = $1", email
    )
    return row is not None


async def is_unsubscribed(pool: asyncpg.Pool, email: str) -> bool:
    row = await pool.fetchrow(
        "SELECT id FROM unsubscribes WHERE email = $1", email
    )
    return row is not None


async def insert_prospect(
    pool: asyncpg.Pool,
    email: str,
    company_name: str | None,
    website: str | None,
    industry: str | None,
    company_type: str | None,
    description: str | None,
    source_id: str,
    instagram: str | None = None,
    facebook: str | None = None,
    linkedin: str | None = None,
    whatsapp: str | None = None,
    tiktok: str | None = None,
    tech_stack: str | None = None,
    maturity_score: int | None = None,
    lead_tier: str | None = None,
) -> str | None:
    if await is_duplicate(pool, email):
        return None
    if await is_unsubscribed(pool, email):
        return None

    row = await pool.fetchrow(
        """
        INSERT INTO prospects (
            id, email, company_name, website, industry, company_type, description,
            instagram, facebook, linkedin, whatsapp, tiktok,
            tech_stack, maturity_score, lead_tier,
            source_id, status, country, created_at, updated_at
        )
        VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14,
            $15, 'NEW', 'CR', NOW(), NOW()
        )
        RETURNING id
        """,
        email, company_name, website, industry, company_type, description,
        instagram, facebook, linkedin, whatsapp, tiktok,
        tech_stack, maturity_score, lead_tier,
        source_id,
    )
    return row["id"] if row else None


async def is_url_visited(pool: asyncpg.Pool, url: str) -> bool:
    """Check if a URL was visited recently (before its revisit_after date)."""
    row = await pool.fetchrow(
        "SELECT id FROM visited_urls WHERE url = $1 AND revisit_after > NOW()",
        url,
    )
    return row is not None


async def mark_url_visited(
    pool: asyncpg.Pool, url: str, found_emails: bool
) -> None:
    """Record a visited URL with revisit schedule (90 or 120 days)."""
    days = 90 if found_emails else 120
    await pool.execute(
        """
        INSERT INTO visited_urls (id, url, found_emails, visited_at, revisit_after)
        VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW() + make_interval(days => $3))
        ON CONFLICT (url) DO UPDATE
        SET found_emails = $2, visited_at = NOW(),
            revisit_after = NOW() + make_interval(days => $3)
        """,
        url, found_emails, days,
    )


async def filter_unvisited_urls(pool: asyncpg.Pool, urls: list[str]) -> list[str]:
    """Filter out URLs that were visited recently."""
    if not urls:
        return []
    rows = await pool.fetch(
        "SELECT url FROM visited_urls WHERE url = ANY($1) AND revisit_after > NOW()",
        urls,
    )
    visited = {row["url"] for row in rows}
    return [u for u in urls if u not in visited]


async def log_scrape(
    pool: asyncpg.Pool,
    source_id: str,
    status: str,
    prospects_found: int,
    prospects_new: int,
    error_message: str | None,
    duration_ms: int | None,
) -> None:
    await pool.execute(
        """
        INSERT INTO scrape_logs (id, source_id, status, prospects_found,
                                 prospects_new, error_message, duration_ms,
                                 started_at, finished_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW(), NOW())
        """,
        source_id, status, prospects_found, prospects_new,
        error_message, duration_ms,
    )
