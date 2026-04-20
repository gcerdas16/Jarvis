"""Daily scraper: picks 25 keywords, searches Google + Maps, visits new URLs."""
import asyncio
from dotenv import load_dotenv

from src.serpapi.search import search_google
from src.serpapi.maps import search_places
from src.google_bot.site_visitor import SiteVisitor
from src.utils.db import get_pool, insert_prospect, filter_unvisited_urls
from src.query_generator import generate_and_insert as generate_keywords
from src.qualification import triage_organic_results
from src.osm.overpass import fetch_cr_businesses

load_dotenv()

KEYWORDS_PER_DAY = 25


async def get_daily_keywords(pool) -> list[dict]:
    """Pick the 25 keywords that haven't been searched in the longest time."""
    rows = await pool.fetch(
        """SELECT sk.id, sk.keyword, sk.current_page, ic.name as industry, ic.label as industry_label
        FROM search_keywords sk
        JOIN industry_categories ic ON ic.id = sk.industry_id
        WHERE sk.is_active = true AND ic.is_active = true
        ORDER BY sk.last_searched_at ASC NULLS FIRST, sk.created_at ASC
        LIMIT $1""",
        KEYWORDS_PER_DAY,
    )
    return [dict(row) for row in rows]


async def log_search_job(
    pool, keyword_id: str, search_type: str, page: int,
    results_count: int, new_urls_count: int,
) -> None:
    await pool.execute(
        """INSERT INTO search_jobs
        (id, keyword_id, search_type, page, results_count, new_urls_count, provider, searched_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'serper', NOW())""",
        keyword_id, search_type, page, results_count, new_urls_count,
    )


async def update_keyword_after_search(pool, keyword_id: str, page: int) -> None:
    await pool.execute(
        """UPDATE search_keywords
        SET last_searched_at = NOW(), current_page = $2
        WHERE id = $1""",
        keyword_id, page + 1,
    )


async def select_keywords(pool) -> list[dict]:
    keywords = await get_daily_keywords(pool)
    if not keywords:
        print("[Daily] No keywords available")
        return []
    industries = {kw["industry_label"] for kw in keywords}
    print(f"\n[Step 1] {len(keywords)} keywords seleccionados")
    print(f"  Industrias: {', '.join(sorted(industries))}")
    return keywords


async def run_organic_search(pool, keywords: list[dict]) -> tuple[list[dict], set[str]]:
    """Run Google organic search for each keyword.
    Returns (all_results with title/link/snippet, seen_urls set).
    """
    print("\n[Step 2] Google Search — resultados orgánicos")
    all_results: list[dict] = []
    seen_urls: set[str] = set()

    for kw in keywords:
        page = kw["current_page"]
        print(f"\n  [{kw['industry']}] '{kw['keyword']}' (página {page})")

        results = search_google(kw["keyword"], num_results=10, page=page)
        new_count = 0
        for r in results:
            if r["link"] not in seen_urls:
                seen_urls.add(r["link"])
                all_results.append(r)
                new_count += 1

        print(f"    → {len(results)} resultados ({new_count} nuevos)")

        await log_search_job(pool, kw["id"], "organic", page, len(results), new_count)
        await update_keyword_after_search(pool, kw["id"], page)

    print(f"\n  Total URLs orgánicas únicas: {len(all_results)}")
    return all_results, seen_urls


async def run_maps_search(
    pool, keywords: list[dict], all_urls: list[str], seen_urls: set[str],
) -> list[dict]:
    """Run Google Maps search for each keyword. Appends websites to all_urls."""
    print("\n[Step 4] Google Maps — lugares con contacto")
    all_places: list[dict] = []
    seen_titles: set[str] = set()

    for kw in keywords:
        places = search_places(kw["keyword"], num_results=10)
        new_count = 0
        for p in places:
            key = p["title"].lower().strip()
            if key and key not in seen_titles:
                seen_titles.add(key)
                all_places.append(p)
                new_count += 1

                website = p.get("website", "")
                if website and website not in seen_urls:
                    seen_urls.add(website)
                    all_urls.append(website)

        if places:
            print(f"  [{kw['industry']}] '{kw['keyword']}' → {len(places)} places ({new_count} new)")

        await log_search_job(pool, kw["id"], "maps", 1, len(places), new_count)

    print(f"\n  Total lugares únicos: {len(all_places)}")
    print(f"  Total URLs combinadas: {len(all_urls)}")
    return all_places


async def ensure_sources(pool) -> tuple[str, str, str]:
    source_ids = {}
    for source_name, source_type in [
        ("serper_search", "google"),
        ("serper_maps", "maps"),
        ("osm_overpass", "directory"),
    ]:
        row = await pool.fetchrow("SELECT id FROM sources WHERE name = $1", source_name)
        if not row:
            row = await pool.fetchrow(
                """INSERT INTO sources (id, name, type, is_active, created_at, updated_at)
                VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
                RETURNING id""",
                source_name, source_type,
            )
        source_ids[source_name] = row["id"]
    return source_ids["serper_search"], source_ids["serper_maps"], source_ids["osm_overpass"]


async def process_osm_businesses(
    pool, businesses: list[dict], osm_source_id: str,
    all_urls: list[str], seen_urls: set[str],
) -> int:
    """Insert OSM businesses with direct emails, and append their websites to all_urls.

    Returns count of newly inserted prospects (emails only — websites are visited later).
    """
    if not businesses:
        return 0

    new_with_email = 0
    new_urls = 0

    for biz in businesses:
        email = biz.get("email")
        website = biz.get("website")
        description_parts = []
        if biz.get("category"):
            description_parts.append(f"Categoría OSM: {biz['category']}")
        if biz.get("phone"):
            description_parts.append(f"Tel: {biz['phone']}")
        if biz.get("address"):
            description_parts.append(f"Dir: {biz['address']}")
        description = " | ".join(description_parts) or None

        # Direct email: insert immediately (dedup is in insert_prospect)
        if email and "@" in email:
            inserted = await insert_prospect(
                pool,
                email=email.lower().strip(),
                company_name=biz.get("name"),
                website=website,
                industry=None,
                company_type=None,
                description=description,
                source_id=osm_source_id,
            )
            if inserted:
                new_with_email += 1

        # Website-only: feed into URL pipeline for Crawl4AI visit
        if website and website.startswith("http") and website not in seen_urls:
            seen_urls.add(website)
            all_urls.append(website)
            new_urls += 1

    print(f"  Emails directos insertados: {new_with_email}")
    print(f"  Websites agregados a cola: {new_urls}")
    return new_with_email


async def insert_maps_prospects(pool, all_places: list[dict], maps_source_id: str) -> int:
    maps_new = 0
    for place in all_places:
        phone = place.get("phone", "")
        website = place.get("website", "")
        if phone and not website:
            inserted = await insert_prospect(
                pool,
                email=f"maps_{phone.replace(' ', '').replace('-', '')}@placeholder.local",
                company_name=place["title"],
                website=None,
                industry=None,
                company_type=None,
                description=f"Tel: {phone} | Dir: {place.get('address', '')}",
                source_id=maps_source_id,
            )
            if inserted:
                maps_new += 1

    if maps_new:
        print(f"\n[Maps] Prospects solo teléfono guardados: {maps_new}")
    return maps_new


async def visit_and_extract(pool, fresh_urls: list[str], search_source_id: str) -> None:
    if not fresh_urls:
        print("\n[Step 7] No hay URLs nuevas para visitar")
        return

    print(f"\n[Step 7] Visitando {len(fresh_urls)} URLs nuevas...")
    visitor = SiteVisitor(source_id=search_source_id, pool=pool)
    result = await visitor.visit_and_extract(fresh_urls)

    print(f"\n{'=' * 60}")
    print(f"[Resultado] Emails encontrados: {result['found']}")
    print(f"[Resultado] Nuevos prospects: {result['new']}")
    print(f"[Resultado] Duración visitas: {result['duration_ms']}ms")


async def print_summary(pool, fresh_urls_count: int) -> None:
    row = await pool.fetchrow("SELECT COUNT(*) as count FROM prospects")
    total_keywords_searched = await pool.fetchval(
        "SELECT COUNT(*) FROM search_jobs WHERE searched_at > NOW() - interval '1 day'"
    )
    print(f"\n{'=' * 60}")
    print(f"[Resumen] Keywords buscados hoy: {total_keywords_searched}")
    print(f"[Resumen] URLs nuevas visitadas: {fresh_urls_count}")
    print(f"[Resumen] Total prospects en DB: {row['count']}")
    print("=" * 60)


async def main():
    print("=" * 60)
    print("[Daily Scraper] Iniciando búsqueda diaria")
    print("=" * 60)

    pool = await get_pool()

    try:
        # Step 0 — Restock keyword bank if running low
        await generate_keywords(pool)

        # Step 1 — Select today's keywords
        keywords = await select_keywords(pool)
        if not keywords:
            return

        # Step 2 — Organic search (returns results with snippets)
        all_results, seen_urls = await run_organic_search(pool, keywords)

        # Step 3 — Two-stage triage: filter out directories / news / social via Claude Haiku
        print("\n[Step 3] Triage IA — filtrando resultados de baja calidad")
        all_results = await triage_organic_results(all_results)
        all_urls = [r["link"] for r in all_results]

        # Step 4 — Maps search (appends website URLs to all_urls)
        all_places = await run_maps_search(pool, keywords, all_urls, seen_urls)

        search_source_id, maps_source_id, osm_source_id = await ensure_sources(pool)
        await insert_maps_prospects(pool, all_places, maps_source_id)

        # Step 5 — OpenStreetMap (Overpass): free parallel source of CR businesses
        print("\n[Step 5] OpenStreetMap — empresas con contacto en OSM")
        osm_businesses = await asyncio.to_thread(fetch_cr_businesses)
        await process_osm_businesses(
            pool, osm_businesses, osm_source_id, all_urls, seen_urls,
        )

        # Step 6 — Filter already-visited URLs
        fresh_urls = await filter_unvisited_urls(pool, all_urls)
        skipped = len(all_urls) - len(fresh_urls)
        print(f"\n[Step 6] Filtro de URLs visitadas")
        print(f"  URLs totales: {len(all_urls)}")
        print(f"  Ya visitadas: {skipped}")
        print(f"  Por visitar: {len(fresh_urls)}")

        # Step 7 — Visit and extract
        await visit_and_extract(pool, fresh_urls, search_source_id)
        await print_summary(pool, len(fresh_urls))

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
