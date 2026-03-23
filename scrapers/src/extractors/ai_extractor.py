import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

EXTRACTION_PROMPT = """Analiza el siguiente contenido de una página web de una empresa en Costa Rica.
Extrae la siguiente información en formato JSON:

{
  "company_name": "nombre de la empresa o null",
  "industry": "industria o sector (ej: tecnología, salud, finanzas, logística, manufactura, retail, legal) o null",
  "company_type": "tipo de organización: solidarista, pyme, corporacion, gobierno, ong, otro, o null",
  "description": "descripción breve de qué hace la empresa (máximo 100 palabras) o null"
}

Responde SOLO con el JSON, sin texto adicional.

Contenido de la página:
"""


async def extract_company_context(markdown_content: str) -> dict:
    """Use Claude Haiku to extract company context from page content."""
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + markdown_content,
                }
            ],
        )

        text = response.content[0].text.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        return json.loads(text)

    except Exception as e:
        print(f"[AIExtractor] Error: {e}")
        return {
            "company_name": None,
            "industry": None,
            "company_type": None,
            "description": None,
        }
