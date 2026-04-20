"""Two-stage URL qualification: filter search results before expensive Crawl4AI visits."""
import json
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

# Skip triage for tiny batches — not worth the API call
_MIN_BATCH_FOR_TRIAGE = 8

_PROMPT = """Tienes {n} resultados de búsqueda de Google de empresas en Costa Rica.
Selecciona cuáles SON páginas de negocios reales donde probablemente hay email o teléfono de contacto.

INCLUIR: pymes, clínicas, despachos, oficinas, tiendas, agencias, estudios profesionales.
EXCLUIR: directorios (Yelp, TripAdvisor, Páginas Amarillas), redes sociales, noticias, blogs, Wikipedia, YouTube, portales de gobierno, educación.

Resultados:
{items}

Responde SOLO con un JSON array de los números a INCLUIR. Ejemplo: [1, 3, 5, 8]
Si no estás seguro de un resultado, inclúyelo.
"""


async def triage_organic_results(results: list[dict]) -> list[dict]:
    """Filter organic search results via Claude Haiku before visiting.

    Returns subset of results likely to be real businesses. Falls back to
    full list if the API call fails.
    """
    if len(results) < _MIN_BATCH_FOR_TRIAGE:
        return results

    items_text = "\n".join(
        f"{i + 1}. {r['link']}\n   {r.get('title', '')} — {r.get('snippet', '')[:120]}"
        for i, r in enumerate(results)
    )

    try:
        response = _client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": _PROMPT.format(n=len(results), items=items_text),
            }],
        )
        text = response.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        indices: list[int] = json.loads(text)
        kept = [results[i - 1] for i in indices if 1 <= i <= len(results)]
        removed = len(results) - len(kept)
        print(f"[Triage] {len(results)} resultados → {len(kept)} kept, {removed} filtrados")
        return kept

    except Exception as e:
        print(f"[Triage] Error ({e}), usando todos los resultados")
        return results
