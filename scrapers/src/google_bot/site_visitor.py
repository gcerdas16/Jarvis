import asyncio
import re
import time
import asyncpg
import requests
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

from src.utils.email_extractor import extract_emails
from src.utils.db import insert_prospect, log_scrape, filter_unvisited_urls, mark_url_visited
from src.extractors.ai_extractor import extract_company_context

# Subpages to check for contact info beyond the homepage
CONTACT_PATHS = [
    "contact", "about", "contact-us", "about-us", "team", "our-story",
    "contacto", "contactenos", "nosotros", "sobre-nosotros", "info",
    "contato", "servicios", "services", "equipo",
]

# Target main content areas — strips nav/scripts/ads, reduces tokens ~70%
CSS_CONTENT_SELECTOR = "main, article, section, .content, #content, footer, header"

_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )
}

# Social media URL patterns — capture full profile URL
_SOCIAL_PATTERNS: dict[str, re.Pattern] = {
    "instagram": re.compile(
        r'https?://(?:www\.)?instagram\.com/(?!p/|reel/|explore/|stories/)[A-Za-z0-9_.]{2,}/?',
        re.IGNORECASE,
    ),
    "facebook": re.compile(
        r'https?://(?:www\.)?facebook\.com/(?!sharer|share\.php|dialog|plugins)[A-Za-z0-9._/-]{2,}/?',
        re.IGNORECASE,
    ),
    "linkedin": re.compile(
        r'https?://(?:www\.)?linkedin\.com/(?:company|in)/[A-Za-z0-9_-]+/?',
        re.IGNORECASE,
    ),
    "whatsapp": re.compile(
        r'https?://(?:wa\.me/\d+|api\.whatsapp\.com/send\?phone=[\d+%]+)',
        re.IGNORECASE,
    ),
    "tiktok": re.compile(
        r'https?://(?:www\.)?tiktok\.com/@[A-Za-z0-9_.]+/?',
        re.IGNORECASE,
    ),
}

# Tech stack fingerprints: (name, list of HTML signatures)
_TECH_SIGNATURES: list[tuple[str, list[str]]] = [
    ("WordPress",    ["wp-content/", "wp-json/", "/wp-includes/"]),
    ("Wix",          ["wixstatic.com", "wix.com/editor"]),
    ("Squarespace",  ["squarespace.com", "static1.squarespace.com"]),
    ("Shopify",      ["myshopify.com", "cdn.shopify.com"]),
    ("Webflow",      ["webflow.io", "uploads-ssl.webflow.com"]),
    ("Next.js",      ["__NEXT_DATA__", "_next/static/"]),
    ("Joomla",       ["Joomla!", "/components/com_"]),
    ("Drupal",       ["Drupal.settings", "/sites/default/files/"]),
    ("Blogger",      [".blogspot.com", "blogger.com/navbar"]),
]


def _extract_social_links(html: str) -> dict[str, str | None]:
    """Return first matching social profile URL for each platform, or None."""
    result: dict[str, str | None] = {}
    for platform, pattern in _SOCIAL_PATTERNS.items():
        match = pattern.search(html)
        result[platform] = match.group(0).rstrip("/") if match else None
    return result


def _detect_tech_stack(html: str) -> str | None:
    """Return detected CMS/framework name or None."""
    for name, signatures in _TECH_SIGNATURES:
        if any(sig in html for sig in signatures):
            return name
    return None


def _compute_maturity_score(
    email: str,
    website: str | None,
    social: dict[str, str | None],
    tech_stack: str | None,
    company_name: str | None,
) -> tuple[int, str]:
    """Return (score 0-100, tier N1/N2/N3)."""
    score = 0
    if website:
        score += 20
    if email:
        score += 20
    if social.get("instagram") or social.get("facebook"):
        score += 20
    if social.get("linkedin"):
        score += 15
    if tech_stack and tech_stack not in ("Wix", "Blogger", "Custom"):
        score += 15
    if social.get("tiktok") or social.get("whatsapp"):
        score += 10
    score = min(score, 100)

    if score >= 60:
        tier = "N1"
    elif score >= 30:
        tier = "N2"
    else:
        tier = "N3"

    return score, tier


class SiteVisitor:
    """Visits URLs from Google search, extracts emails and context."""

    def __init__(self, source_id: str, pool: asyncpg.Pool):
        self.source_id = source_id
        self.pool = pool
        self.browser_config = BrowserConfig(headless=True)

    async def _crawl_url(self, crawler: AsyncWebCrawler, url: str) -> tuple[str, str] | None:
        """Crawl a single URL. Returns (filtered_markdown, raw_html) or None on failure."""
        result = await crawler.arun(
            url=url,
            config=CrawlerRunConfig(css_selector=CSS_CONTENT_SELECTOR),
        )
        if not result.success or not result.markdown:
            await mark_url_visited(self.pool, url, found_emails=False)
            return None
        return result.markdown, result.html or ""

    def _fetch_contact_subpages(self, base_url: str) -> str:
        """Synchronously fetch contact subpages and return combined raw HTML."""
        base = base_url.rstrip("/")
        combined = ""
        for path in CONTACT_PATHS:
            try:
                resp = requests.get(
                    f"{base}/{path}",
                    timeout=5,
                    headers=_HTTP_HEADERS,
                    allow_redirects=True,
                )
                if resp.status_code == 200:
                    combined += resp.text
            except Exception:
                pass
        return combined

    async def _extract_and_insert(
        self, url: str, markdown: str, main_html: str
    ) -> tuple[int, int]:
        """Extract emails, social links, tech stack; compute score; insert prospects.
        Returns (emails_found, new_prospects).
        """
        # Email extraction: main page + contact subpages
        emails: set[str] = set(extract_emails(markdown))
        subpage_html = await asyncio.to_thread(self._fetch_contact_subpages, url)
        if subpage_html:
            emails.update(extract_emails(subpage_html))

        if not emails:
            await mark_url_visited(self.pool, url, found_emails=False)
            return 0, 0

        # Enrich from all available HTML
        all_html = main_html + subpage_html
        social = _extract_social_links(all_html)
        tech_stack = _detect_tech_stack(all_html)

        # AI context extraction (uses filtered/cleaned markdown)
        context = await extract_company_context(markdown)

        new_count = 0
        for email in emails:
            score, tier = _compute_maturity_score(
                email=email,
                website=url,
                social=social,
                tech_stack=tech_stack,
                company_name=context.get("company_name"),
            )
            inserted = await insert_prospect(
                self.pool,
                email=email,
                company_name=context.get("company_name"),
                website=url,
                industry=context.get("industry"),
                company_type=context.get("company_type"),
                description=context.get("description"),
                source_id=self.source_id,
                instagram=social.get("instagram"),
                facebook=social.get("facebook"),
                linkedin=social.get("linkedin"),
                whatsapp=social.get("whatsapp"),
                tiktok=social.get("tiktok"),
                tech_stack=tech_stack,
                maturity_score=score,
                lead_tier=tier,
            )
            if inserted:
                new_count += 1

        await mark_url_visited(self.pool, url, found_emails=True)
        return len(emails), new_count

    async def visit_and_extract(self, urls: list[str]) -> dict:
        start_time = time.time()
        total_found = 0
        total_new = 0
        error_msg = None

        try:
            fresh_urls = await filter_unvisited_urls(self.pool, urls)
            skipped = len(urls) - len(fresh_urls)
            if skipped > 0:
                print(f"[SiteVisitor] Skipping {skipped} recently visited URLs")
            print(f"[SiteVisitor] Visiting {len(fresh_urls)} new URLs")

            async with AsyncWebCrawler(config=self.browser_config) as crawler:
                for url in fresh_urls:
                    try:
                        crawl_result = await self._crawl_url(crawler, url)
                        if not crawl_result:
                            continue

                        markdown, html = crawl_result
                        found, new = await self._extract_and_insert(url, markdown, html)
                        total_found += found
                        total_new += new

                        await asyncio.sleep(5)

                    except Exception as e:
                        print(f"[SiteVisitor] Error visiting {url}: {e}")
                        continue

            status = "SUCCESS"

        except Exception as e:
            status = "FAILED"
            error_msg = str(e)[:500]

        duration_ms = int((time.time() - start_time) * 1000)

        await log_scrape(
            self.pool,
            source_id=self.source_id,
            status=status,
            prospects_found=total_found,
            prospects_new=total_new,
            error_message=error_msg,
            duration_ms=duration_ms,
        )

        return {
            "source": "google_search",
            "status": status,
            "found": total_found,
            "new": total_new,
            "duration_ms": duration_ms,
        }
