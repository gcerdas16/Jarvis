"""Google organic search via Serper.dev API."""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")
SEARCH_URL = "https://google.serper.dev/search"

SKIP_DOMAINS = {
    # Search / social / video
    "google.com", "youtube.com", "wikipedia.org", "reddit.com",
    "tiktok.com", "pinterest.com", "amazon.com",
    "facebook.com", "instagram.com", "twitter.com", "x.com",
    "linkedin.com", "snapchat.com", "threads.net",
    # Review aggregators & directories
    "yelp.com", "tripadvisor.com", "yellowpages.com",
    "paginas.cr", "guiatelefonica.com", "cylex.cr",
    "infoisinfo.es", "europages.es", "hotfrog.com",
    "manta.com", "foursquare.com", "trustpilot.com",
    "clutch.co", "g2.com", "capterra.com",
    # News / media (CR)
    "nacion.com", "crhoy.com", "teletica.com", "repretel.com",
    "elmundo.cr", "delfino.cr", "semanario.ucr.ac.cr",
}


def _is_valid_url(url: str) -> bool:
    """Filter out social media and non-company URLs."""
    for domain in SKIP_DOMAINS:
        if domain in url:
            return False
    return url.startswith("http")


def search_google(query: str, num_results: int = 10, page: int = 1) -> list[dict]:
    """Search Google via Serper.dev. Returns list of {title, link, snippet}."""
    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "q": query,
        "num": num_results,
        "gl": "cr",
        "hl": "es",
        "page": page,
    }

    try:
        response = requests.post(SEARCH_URL, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[SerperSearch] Error: {e}")
        return []

    organic = data.get("organic", [])
    results = []
    seen: set[str] = set()

    for item in organic:
        link = item.get("link", "")
        if not _is_valid_url(link) or link in seen:
            continue
        seen.add(link)
        results.append({
            "title": item.get("title", ""),
            "link": link,
            "snippet": item.get("snippet", ""),
        })

    return results


def search_google_urls(query: str, num_results: int = 10) -> list[str]:
    """Search Google and return only the URLs (convenience wrapper)."""
    results = search_google(query, num_results)
    return [r["link"] for r in results]


def search_multiple(keywords: list[str], num_per_query: int = 10) -> list[str]:
    """Run multiple searches and return all unique URLs."""
    all_urls: list[str] = []
    seen: set[str] = set()

    for keyword in keywords:
        print(f"[SerperSearch] '{keyword}'")
        results = search_google(keyword, num_per_query)
        new = 0
        for r in results:
            if r["link"] not in seen:
                seen.add(r["link"])
                all_urls.append(r["link"])
                new += 1
        print(f"  Found {len(results)} results ({new} new)")

    return all_urls
