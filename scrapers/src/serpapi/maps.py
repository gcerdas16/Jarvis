"""Google Maps/Places search via Serper.dev API."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SEARCH_URL = "https://google.serper.dev/search"


def search_places(query: str, num_results: int = 10) -> list[dict]:
    """Search Google Maps via Serper.dev.

    Returns list of places with: title, address, phone, website, rating.
    """
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "q": query,
        "type": "places",
        "num": num_results,
        "gl": "cr",
        "hl": "es",
    }

    try:
        response = requests.post(SEARCH_URL, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[SerperMaps] Error: {e}")
        return []

    places = data.get("places", [])
    results = []

    for place in places:
        results.append({
            "title": place.get("title", ""),
            "address": place.get("address", ""),
            "phone": place.get("phone", ""),
            "website": website,
            "rating": place.get("rating"),
            "rating_count": place.get("ratingCount"),
        })

    return results


def search_places_multiple(keywords: list[str], num_per_query: int = 10) -> list[dict]:
    """Run multiple Maps searches and return unique places (by title)."""
    all_places: list[dict] = []
    seen_titles: set[str] = set()

    for keyword in keywords:
        print(f"[SerperMaps] '{keyword}'")
        places = search_places(keyword, num_per_query)
        new = 0
        for p in places:
            key = p["title"].lower().strip()
            if key and key not in seen_titles:
                seen_titles.add(key)
                all_places.append(p)
                new += 1
        print(f"  Found {len(places)} places ({new} new)")

    return all_places
