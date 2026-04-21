"""One-shot backfill: extract companyName from website HTML for prospects
that have a website but no name. Uses og:site_name → og:title → <title>,
no AI calls. Run via: railway ssh --service Scrappers \"cd /app && python backfill_company_names.py\"
"""
import asyncio
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

import asyncpg
import requests
from dotenv import load_dotenv

load_dotenv()

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )
}

# Generic words we reject — they're page titles, not company names
_GENERIC = {
    "home", "inicio", "welcome", "bienvenido", "bienvenidos",
    "página principal", "main page", "index", "untitled",
    "página de inicio", "login", "iniciar sesión",
}


def _domain_from_url(url: str) -> str:
    try:
        host = urlparse(url if url.startswith("http") else f"https://{url}").hostname or ""
        return host.replace("www.", "")
    except Exception:
        return ""


def _clean_candidate(raw: str) -> str | None:
    """Strip page-title suffixes ('| Home', '- Soluciones'), validate length."""
    if not raw:
        return None
    raw = raw.strip()
    # Take first segment before common separators
    candidate = re.split(r"\s*[|·•‒–—»]\s*", raw)[0].strip()
    # Some sites use " - " as separator; only split if there's text on both sides
    if " - " in candidate and len(candidate.split(" - ")[0]) >= 4:
        candidate = candidate.split(" - ")[0].strip()
    if len(candidate) < 3 or len(candidate) > 80:
        return None
    if candidate.lower() in _GENERIC:
        return None
    # Reject if it's literally the URL/domain
    if candidate.startswith("http"):
        return None
    return candidate


def _extract_name_from_html(html: str) -> str | None:
    """Try og:site_name → og:title → <title> in priority order."""
    patterns = [
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']application-name["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
        r"<title[^>]*>([^<]+)</title>",
    ]
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            cleaned = _clean_candidate(m.group(1))
            if cleaned:
                return cleaned
    return None


def fetch_and_extract(prospect_id: str, website: str) -> tuple[str, str | None]:
    """Synchronous fetch; returns (id, extracted_name_or_None)."""
    url = website if website.startswith("http") else f"https://{website}"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=8, allow_redirects=True)
        if resp.status_code != 200:
            return prospect_id, None
        return prospect_id, _extract_name_from_html(resp.text)
    except Exception:
        return prospect_id, None


async def main() -> None:
    pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"), min_size=2, max_size=4)
    rows = await pool.fetch(
        """SELECT id, website FROM prospects
           WHERE company_name IS NULL AND website IS NOT NULL AND website != ''"""
    )
    print(f"[Backfill] {len(rows)} prospects con website pero sin nombre")

    updated = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=15) as pool_exec:
        futures = {
            pool_exec.submit(fetch_and_extract, r["id"], r["website"]): r
            for r in rows
        }
        for i, future in enumerate(as_completed(futures), start=1):
            prospect_id, name = future.result()
            if name:
                await pool.execute(
                    "UPDATE prospects SET company_name = $1 WHERE id = $2",
                    name, prospect_id,
                )
                updated += 1
            else:
                failed += 1
            if i % 25 == 0:
                print(f"  [{i}/{len(rows)}] updated={updated} failed={failed}")

    print(f"\n[Backfill] DONE — updated: {updated}, failed: {failed}")
    await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
