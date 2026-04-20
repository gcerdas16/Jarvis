"""Generate CR-specific search queries using Claude Haiku when the keyword bank runs low."""
import json
import os
import asyncpg
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# Generate this many new queries per industry per run
_QUERIES_PER_INDUSTRY = 10

# Restock when fewer than this many active keywords remain
_LOW_WATER_MARK = 50

_PROMPT = """Genera {count} consultas de búsqueda de Google en español para encontrar empresas de tipo "{label}" en Costa Rica.

Reglas:
- Varía las zonas: Escazú, Santa Ana, Alajuela, Heredia, Cartago, Liberia, Desamparados, Moravia, Curridabat, Tres Ríos, Grecia, Naranjo, Turrialba, Pérez Zeledón, Guápiles, Limón, Nicoya, Jacó.
- Varía los términos: empresa, servicios, consulta, oficina, clínica, despacho, agencia, estudio, etc.
- Que suenen como búsquedas reales de clientes, no como directorios.
- No repitas ninguna de estas existentes: {existing}

Responde SOLO con un JSON array de strings. Ejemplo:
["dentistas en Escazú", "clínica dental Heredia", "odontología Santa Ana CR"]
"""


def _call_claude(label: str, existing: list[str]) -> list[str]:
    existing_sample = existing[-20:] if len(existing) > 20 else existing
    prompt = _PROMPT.format(count=_QUERIES_PER_INDUSTRY, label=label, existing=existing_sample)
    response = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    queries: list[str] = json.loads(text)
    existing_set = {e.lower().strip() for e in existing}
    return [q for q in queries if q.lower().strip() not in existing_set]


async def generate_and_insert(pool: asyncpg.Pool) -> None:
    """Restock the keyword bank if it's running low. Noop if above threshold."""
    active_count = await pool.fetchval(
        "SELECT COUNT(*) FROM search_keywords WHERE is_active = true AND current_page <= max_page"
    )
    if active_count >= _LOW_WATER_MARK:
        return

    print(f"[QueryGen] Banco bajo ({active_count} keywords activos). Generando nuevos con IA...")

    industries = await pool.fetch(
        "SELECT id, name, label FROM industry_categories WHERE is_active = true ORDER BY RANDOM() LIMIT 10"
    )

    total_inserted = 0
    for ind in industries:
        existing_rows = await pool.fetch(
            "SELECT keyword FROM search_keywords WHERE industry_id = $1", ind["id"]
        )
        existing_kws = [r["keyword"] for r in existing_rows]

        try:
            new_queries = _call_claude(ind["label"], existing_kws)
            inserted = 0
            for q in new_queries:
                result = await pool.execute(
                    """INSERT INTO search_keywords
                       (id, keyword, industry_id, current_page, max_page, is_active, created_at)
                       VALUES (gen_random_uuid()::text, $1, $2, 1, 5, true, NOW())
                       ON CONFLICT (keyword) DO NOTHING""",
                    q, ind["id"],
                )
                if result == "INSERT 0 1":
                    inserted += 1
            total_inserted += inserted
            print(f"  [{ind['label']}] +{inserted} nuevas queries")
        except Exception as e:
            print(f"  [{ind['label']}] Error generando queries: {e}")

    print(f"[QueryGen] Total insertadas: {total_inserted}")
