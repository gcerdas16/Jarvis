"""Daily scraper: picks 25 keywords, searches Google + Maps, visits new URLs."""
import asyncio
from dotenv import load_dotenv

from src.serpapi.search import search_google
from src.serpapi.maps import search_places
from src.google_bot.site_visitor import SiteVisitor
from src.utils.db import get_pool, insert_prospect, filter_unvisited_urls

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
    """Log a search job to the database."""
    await pool.execute(
        """INSERT INTO search_jobs
        (id, keyword_id, search_type, page, results_count, new_urls_count, provider, searched_at)
        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, 'serper', NOW())""",
        keyword_id, search_type, page, results_count, new_urls_count,
    )


async def update_keyword_after_search(pool, keyword_id: str, page: int) -> None:
    """Update keyword's last_searched_at and advance page."""
    await pool.execute(
        """UPDATE search_keywords
        SET last_searched_at = NOW(), current_page = $2
        WHERE id = $1""",
        keyword_id, page + 1,
    )


async def main():
    print("=" * 60)
    print("[Daily Scraper] Iniciando búsqueda diaria")
    print("=" * 60)

    pool = await get_pool()

    try:
        # ── Step 1: Pick today's keywords ──
        keywords = await get_daily_keywords(pool)
        if not keywords:
            print("[Daily] No keywords available")
            return

        industries_today = set()
        for kw in keywords:
            industries_today.add(kw["industry_label"])

        print(f"\n[Step 1] {len(keywords)} keywords seleccionados")
        print(f"  Industrias: {', '.join(sorted(industries_today))}")

        # ── Step 2: Search Google (organic) for each keyword ──
        print(f"\n[Step 2] Google Search — resultados orgánicos")
        all_urls: list[str] = []
        seen_urls: set[str] = set()

        for kw in keywords:
            page = kw["current_page"]
            print(f"\n  [{kw['industry']}] '{kw['keyword']}' (página {page})")

            results = search_google(kw["keyword"], num_results=10, page=page)
            new_count = 0
            for r in results:
                if r["link"] not in seen_urls:
                    seen_urls.add(r["link"])
                    all_urls.append(r["link"])
                    new_count += 1

            print(f"    → {len(results)} resultados ({new_count} nuevos)")

            await log_search_job(
                pool, kw["id"], "organic", page,
                len(results), new_count,
            )
            await update_keyword_after_search(pool, kw["id"], page)

        print(f"\n  Total URLs orgánicas únicas: {len(all_urls)}")

        # ── Step 3: Google Maps for each keyword ──
        print(f"\n[Step 3] Google Maps — lugares con contacto")
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

                    # Add website to URL list if available
                    website = p.get("website", "")
                    if website and website not in seen_urls:
                        seen_urls.add(website)
                        all_urls.append(website)

            if places:
                print(f"  [{kw['industry']}] '{kw['keyword']}' → {len(places)} places ({new_count} new)")

            await log_search_job(
                pool, kw["id"], "maps", 1,
                len(places), new_count,
            )

        print(f"\n  Total lugares únicos: {len(all_places)}")
        print(f"  Total URLs combinadas: {len(all_urls)}")

        # ── Step 4: Filter already visited URLs ──
        fresh_urls = await filter_unvisited_urls(pool, all_urls)
        skipped = len(all_urls) - len(fresh_urls)
        print(f"\n[Step 4] Filtro de URLs visitadas")
        print(f"  URLs totales: {len(all_urls)}")
        print(f"  Ya visitadas: {skipped}")
        print(f"  Por visitar: {len(fresh_urls)}")

        # ── Step 5: Ensure sources exist ──
        for source_name, source_type in [("serper_search", "google"), ("serper_maps", "maps")]:
            row = await pool.fetchrow(
                "SELECT id FROM sources WHERE name = $1", source_name
            )
            if not row:
                await pool.execute(
                    """INSERT INTO sources (id, name, type, is_active, created_at, updated_at)
                    VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())""",
                    source_name, source_type,
                )

        # ── Step 6: Save Maps-only prospects (phone, no website) ──
        maps_source = await pool.fetchrow(
            "SELECT id FROM sources WHERE name = 'serper_maps'"
        )
        maps_source_id = maps_source["id"]
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

        # ── Step 7: Visit fresh URLs and extract emails ──
        if fresh_urls:
            print(f"\n[Step 7] Visitando {len(fresh_urls)} URLs nuevas...")
            search_source = await pool.fetchrow(
                "SELECT id FROM sources WHERE name = 'serper_search'"
            )
            visitor = SiteVisitor(source_id=search_source["id"], pool=pool)
            result = await visitor.visit_and_extract(fresh_urls)

            print(f"\n{'=' * 60}")
            print(f"[Resultado] Emails encontrados: {result['found']}")
            print(f"[Resultado] Nuevos prospects: {result['new']}")
            print(f"[Resultado] Duración visitas: {result['duration_ms']}ms")
        else:
            print("\n[Step 7] No hay URLs nuevas para visitar")

        # ── Summary ──
        row = await pool.fetchrow("SELECT COUNT(*) as count FROM prospects")
        total_keywords_searched = await pool.fetchval(
            "SELECT COUNT(*) FROM search_jobs WHERE searched_at > NOW() - interval '1 day'"
        )
        print(f"\n{'=' * 60}")
        print(f"[Resumen] Keywords buscados hoy: {total_keywords_searched}")
        print(f"[Resumen] URLs nuevas visitadas: {len(fresh_urls)}")
        print(f"[Resumen] Total prospects en DB: {row['count']}")
        print("=" * 60)

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
