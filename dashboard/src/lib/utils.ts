export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

export function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Display a company name with smart fallbacks when companyName is null:
 *   1. companyName            (best — actual extracted name)
 *   2. website domain         (e.g. "acme.cr" from "https://www.acme.cr/")
 *   3. email domain           (e.g. "acme.cr" from "info@acme.cr")
 *   4. "—"                    (truly empty)
 */
export function displayCompany(
  companyName: string | null | undefined,
  website?: string | null,
  email?: string | null,
): string {
  if (companyName && companyName.trim()) return companyName;
  if (website) {
    try {
      const host = new URL(website.startsWith("http") ? website : `https://${website}`).hostname;
      return host.replace(/^www\./, "");
    } catch { /* fall through */ }
  }
  if (email && email.includes("@")) {
    const domain = email.split("@")[1];
    if (domain && !domain.endsWith(".local")) return domain;
  }
  return "—";
}
