"""Maturity score + lead tier computation — shared by site_visitor and run_daily.

Score is a 0-100 integer; tier is one of N1 (>=60), N2 (>=30), N3 (<30).
Used both after deep enrichment via Crawl4AI AND for OSM prospects that
only have the tags OSM provides (no site visit required).
"""


def compute_maturity_score(
    email: str | None,
    website: str | None,
    social: dict[str, str | None] | None = None,
    tech_stack: str | None = None,
) -> tuple[int, str]:
    """Compute 0-100 maturity score plus tier (N1/N2/N3).

    Score components:
      +20  has email
      +20  has website
      +20  has Instagram OR Facebook
      +15  has LinkedIn
      +15  has a detected tech stack (excluding Wix/Blogger/Custom)
      +10  has TikTok OR WhatsApp
    """
    social = social or {}
    score = 0

    if email:
        score += 20
    if website:
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
