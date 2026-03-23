"""Focused scrape: find asociaciones solidaristas via Serper.dev Search + Maps."""
import asyncio
from dotenv import load_dotenv

from src.serpapi.search import search_multiple
from src.serpapi.maps import search_places_multiple
from src.google_bot.site_visitor import SiteVisitor
from src.utils.db import get_pool, insert_prospect

load_dotenv()

SEARCH_KEYWORDS = [
    "asociación solidarista contacto email",
    "asociación solidarista costa rica correo",
    "ase solidarista costa rica",
    "solidaristas afiliadas CONASOL",
    "directorio asociaciones solidaristas",
    "federación solidarista costa rica",
    "asociación solidarista empleados contacto",
    "ase costa rica asociacion solidarista",
]

MAPS_KEYWORDS = [
    "asociación solidarista Costa Rica",
    "asociación solidarista San José",
    "asociación solidarista Heredia",
    "asociación solidarista Alajuela",
    "solidarista empleados Costa Rica",
]


async def main():
    print("=" * 50)
    print("[Solidaristas] Búsqueda enfocada con Serper.dev")
    print("=" * 50)

    # ── Step 1: Google Search (organic results → URLs to visit) ──
    print("\n[Step 1] Google Search — resultados orgánicos")
    urls = search_multiple(SEARCH_KEYWORDS, num_per_query=10)
    print(f"\nTotal URLs únicas para visitar: {len(urls)}")

    # ── Step 2: Google Maps (places → contact info directo) ──
    print("\n[Step 2] Google Maps — lugares con info de contacto")
    places = search_places_multiple(MAPS_KEYWORDS, num_per_query=10)
    print(f"\nTotal lugares únicos encontrados: {len(places)}")

    # ── Step 3: Save Maps prospects directly to DB ──
    pool = await get_pool()

    try:
        # Ensure source exists
        row = await pool.fetchrow(
            "SELECT id FROM sources WHERE name = $1", "serper_maps"
        )
        if row:
            maps_source_id = row["id"]
        else:
            row = await pool.fetchrow(
                """INSERT INTO sources (id, name, type, is_active, created_at, updated_at)
                VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
                RETURNING id""",
                "serper_maps", "maps",
            )
            maps_source_id = row["id"]

        maps_new = 0
        for place in places:
            website = place.get("website", "")
            phone = place.get("phone", "")

            # If place has a website, add it to URLs for email extraction
            if website and website not in urls:
                urls.append(website)

            # If place has a phone but no website, save as prospect directly
            if phone and not website:
                inserted = await insert_prospect(
                    pool,
                    email=f"maps_{phone.replace(' ', '')}@placeholder.local",
                    company_name=place["title"],
                    website=None,
                    industry="solidarista",
                    company_type="asociacion_solidarista",
                    description=f"Tel: {phone} | Dir: {place.get('address', '')}",
                    source_id=maps_source_id,
                )
                if inserted:
                    maps_new += 1

        print(f"\n[Maps] Prospects guardados (solo teléfono): {maps_new}")
        print(f"[Maps] Websites agregados para visitar: {len(urls)}")

        # ── Step 4: Visit all URLs and extract emails + context ──
        print(f"\n[Step 4] Visitando {len(urls)} URLs para extraer emails...")

        row = await pool.fetchrow(
            "SELECT id FROM sources WHERE name = $1", "serper_search"
        )
        if row:
            search_source_id = row["id"]
        else:
            row = await pool.fetchrow(
                """INSERT INTO sources (id, name, type, is_active, created_at, updated_at)
                VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
                RETURNING id""",
                "serper_search", "google",
            )
            search_source_id = row["id"]

        if urls:
            visitor = SiteVisitor(source_id=search_source_id, pool=pool)
            result = await visitor.visit_and_extract(urls)

            print(f"\n{'=' * 50}")
            print(f"[Result] Emails encontrados: {result['found']}")
            print(f"[Result] Nuevos prospects: {result['new']}")
            print(f"[Result] Duración: {result['duration_ms']}ms")
        else:
            print("\nNo URLs to visit")

        # Show total in DB
        row = await pool.fetchrow("SELECT COUNT(*) as count FROM prospects")
        print(f"[Result] Total prospects en DB: {row['count']}")

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
