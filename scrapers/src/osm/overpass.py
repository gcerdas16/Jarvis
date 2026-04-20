"""OpenStreetMap data source via the public Overpass API.

Free, no API key required. Fetches Costa Rican businesses that published
contact info (email/website) directly to OSM — this is community data, not
scraping. Complements Serper.dev with a fresh pool of URLs and emails.
"""
import requests

# Public Overpass endpoint — free but rate-limited (be considerate, 1-2 calls/day)
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Costa Rica bounding box (south, west, north, east)
CR_BBOX = "8.0,-86.0,11.2,-82.5"

# OSM tag categories that indicate a business
_BUSINESS_CATEGORIES = ["amenity", "shop", "office", "craft", "healthcare", "tourism"]

# OSM tags that carry contact info
_CONTACT_TAGS = ["email", "contact:email", "website", "contact:website"]

# OSM tag pairs for each social platform (pref first, fallback second)
_SOCIAL_TAG_MAP = {
    "facebook":  ["contact:facebook", "facebook"],
    "instagram": ["contact:instagram", "instagram"],
    "linkedin":  ["contact:linkedin", "linkedin"],
    "whatsapp":  ["contact:whatsapp", "whatsapp"],
    "tiktok":    ["contact:tiktok", "tiktok"],
}


def _pick_social(tags: dict) -> dict[str, str | None]:
    """Return normalized social profile URLs from OSM tags (or None per platform)."""
    out: dict[str, str | None] = {}
    for platform, candidates in _SOCIAL_TAG_MAP.items():
        value = None
        for tag_key in candidates:
            if tags.get(tag_key):
                value = tags[tag_key]
                break
        # OSM values can be handles instead of URLs; normalize common cases
        if value and not value.startswith("http"):
            if platform == "whatsapp":
                value = f"https://wa.me/{value.lstrip('+').replace(' ', '')}"
            else:
                value = f"https://www.{platform}.com/{value.lstrip('@/')}"
        out[platform] = value
    return out

_HTTP_HEADERS = {"User-Agent": "Jarvis-Outreach/1.0 (github.com/gcerdas16/Jarvis)"}


def _build_query() -> str:
    """Build an Overpass QL query that returns CR businesses with contact info."""
    clauses = []
    for category in _BUSINESS_CATEGORIES:
        for tag in _CONTACT_TAGS:
            # node["amenity"]["email"](bbox);
            clauses.append(f'  node["{category}"]["{tag}"]({CR_BBOX});')
    body = "\n".join(clauses)
    return f"[out:json][timeout:120];\n(\n{body}\n);\nout body;"


def fetch_cr_businesses() -> list[dict]:
    """Query Overpass for CR businesses with email or website. Synchronous.

    Returns a list of normalized dicts:
        {
            "name": str | None,
            "email": str | None,
            "website": str | None,
            "phone": str | None,
            "category": str | None,     # e.g. 'restaurant', 'dentist', 'lawyer'
            "address": str | None,
        }
    """
    query = _build_query()

    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers=_HTTP_HEADERS,
            timeout=180,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[OSM] Error querying Overpass: {e}")
        return []

    elements = data.get("elements", [])
    print(f"[OSM] Overpass devolvió {len(elements)} elementos crudos")

    results: list[dict] = []
    seen_keys: set[str] = set()  # dedup by email or website

    for elem in elements:
        tags = elem.get("tags", {})
        email = tags.get("email") or tags.get("contact:email")
        website = tags.get("website") or tags.get("contact:website")
        if not (email or website):
            continue

        # Dedup: same email or website within this batch
        dedup_key = (email or "").lower() or (website or "").lower()
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        # Pick the category tag that's set
        category = None
        for cat in _BUSINESS_CATEGORIES:
            if cat in tags:
                category = tags[cat]
                break

        # Build address from individual addr:* tags
        addr_parts = [
            tags.get("addr:street"),
            tags.get("addr:housenumber"),
            tags.get("addr:city"),
        ]
        address = ", ".join(p for p in addr_parts if p) or None

        results.append({
            "name": tags.get("name"),
            "email": email,
            "website": website,
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "category": category,
            "address": address,
            "social": _pick_social(tags),
        })

    print(f"[OSM] {len(results)} negocios únicos con contacto")
    return results
