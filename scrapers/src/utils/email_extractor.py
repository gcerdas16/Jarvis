import re

# Match emails more strictly: must start with a letter
EMAIL_REGEX = re.compile(
    r"[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
)

BLACKLISTED_PATTERNS = {
    "noreply@", "no-reply@", "mailer-daemon@",
    "postmaster@", "webmaster@", "admin@localhost",
    ".png", ".jpg", ".gif", ".svg", ".css", ".js",
}

BLACKLISTED_DOMAINS = {
    "example.com", "test.com", "localhost",
    "sentry.io", "github.com", "googleapis.com",
    "w3.org", "schema.org", "facebook.com",
    "twitter.com", "instagram.com",
    "1x.ec", "2x.ec",
}

# Valid TLDs — reject emails ending in fake TLDs like ".coma", ".cra"
VALID_TLDS = {
    "com", "net", "org", "cr", "co.cr", "ed.cr", "go.cr", "or.cr",
    "ac.cr", "fi.cr", "sa.cr", "es", "io", "info", "biz", "us",
    "mx", "co", "cl", "ar", "pe", "br", "ec", "pa", "gt", "hn",
    "sv", "ni", "do", "py", "uy", "bo", "ve", "ws", "edu", "gov",
}


def _clean_email(email: str) -> str | None:
    """Clean and validate a single email address."""
    email = email.lower().strip()

    # Remove trailing junk characters after valid TLD
    # e.g. "user@domain.coma" -> "user@domain.com"
    # e.g. "user@domain.co.cra" -> "user@domain.co.cr"
    domain_part = email.split("@")[1]

    # Try matching longest TLD first (co.cr before cr)
    sorted_tlds = sorted(VALID_TLDS, key=len, reverse=True)
    for tld in sorted_tlds:
        suffix = f".{tld}"
        idx = domain_part.find(suffix)
        if idx != -1:
            clean_domain = domain_part[:idx + len(suffix)]
            local = email.split("@")[0]
            email = f"{local}@{clean_domain}"
            break

    # Validate final TLD
    final_domain = email.split("@")[1]
    has_valid_tld = any(
        final_domain.endswith(f".{tld}") for tld in VALID_TLDS
    )
    if not has_valid_tld:
        return None

    return email


def extract_emails(text: str) -> list[str]:
    """Extract and clean email addresses from text."""
    raw_emails = EMAIL_REGEX.findall(text)
    valid_emails = []
    seen: set[str] = set()

    for email in raw_emails:
        cleaned = _clean_email(email)
        if cleaned is None:
            continue

        if any(p in cleaned for p in BLACKLISTED_PATTERNS):
            continue

        domain = cleaned.split("@")[1]
        if domain in BLACKLISTED_DOMAINS:
            continue

        # Skip very short local parts (likely junk)
        local = cleaned.split("@")[0]
        if len(local) < 3:
            continue

        if cleaned not in seen:
            seen.add(cleaned)
            valid_emails.append(cleaned)

    return valid_emails
