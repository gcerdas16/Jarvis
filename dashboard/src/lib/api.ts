const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data as T;
}

// --- Types ---

export interface OverviewKpis {
  emailsSentToday: number; dailyLimit: number;
  leadsToday: number; leadsNew: number; leadsDuplicates: number;
  responsesThisWeek: number; bouncesToday: number; bounceRate: string;
}
export interface ActivityItem { type: string; text: string; time: string; }
export interface JobStatus {
  type: string; name: string; schedule: string; nextRun: string;
  lastRun: { startedAt: string; status: string; result: Record<string, number> | null; durationMs: number | null } | null;
}
export interface OverviewData { kpis: OverviewKpis; activity: ActivityItem[]; jobs: JobStatus[]; }

export interface DayPoint { date: string; emails: number; leads: number; responses: number; }
export interface DailyData { days: DayPoint[]; }

export interface ScraperKpis { searchesRun: number; urlsVisited: number; leadsFound: number; leadsNew: number; leadsDuplicates: number; }
export interface ScraperLog { keyword: string; searchType: string; resultsCount: number; newUrlsCount: number; status: string; searchedAt: string; industry: string; }
export interface ScraperDayPoint { date: string; leads: number; }
export interface ScraperTodayData { kpis: ScraperKpis; logs: ScraperLog[]; topIndustries: { industry: string; count: number }[]; }

export interface EmailItem {
  id: string; sentAt: string; emailType: string; subject: string;
  prospect: { email: string; companyName: string | null; industry: string | null; status: string; source: { name: string } };
  latestEvent: { eventType: string; occurredAt: string } | null;
}
export interface EmailKpis { sentToday: number; dailyLimit: number; followUpsToday: number; bouncesToday: number; responsesThisWeek: number; }
export interface EmailsData { emails: EmailItem[]; kpis: EmailKpis; pagination: { page: number; total: number; totalPages: number; limit: number }; }

export interface JobRun { id: string; jobType: string; status: string; startedAt: string; finishedAt: string | null; durationMs: number | null; result: Record<string, number> | null; errorMessage: string | null; }
export interface JobsStatusData { jobs: JobStatus[]; }
export interface JobsHistoryData { runs: JobRun[]; }

export interface ProspectItem {
  id: string; email: string; companyName: string | null; industry: string | null;
  status: string; createdAt: string; updatedAt: string; website?: string | null;
  companyType?: string | null; description?: string | null;
  source: { name: string; type: string };
  emailsSent?: { id: string; emailType: string; sentAt: string; events: { eventType: string; occurredAt: string }[] }[];
  responses?: { id: string; receivedAt: string; bodyPreview: string | null }[];
}
export interface ProspectsData { prospects: ProspectItem[]; pagination: { page: number; total: number; totalPages: number; limit: number }; }

// --- Fetchers ---

export const api = {
  overview: () => get<OverviewData>("/metrics/overview"),
  daily: () => get<DailyData>("/metrics/daily"),
  scraperToday: () => get<ScraperTodayData>("/metrics/scraper/today"),
  scraperDaily: () => get<{ days: ScraperDayPoint[] }>("/metrics/scraper/daily"),
  emails: (params: URLSearchParams) => get<EmailsData>(`/emails?${params}`),
  jobsStatus: () => get<JobsStatusData>("/jobs/status"),
  jobsHistory: (params: URLSearchParams) => get<JobsHistoryData>(`/jobs/history?${params}`),
  prospects: (params: URLSearchParams) => get<ProspectsData>(`/prospects?${params}`),
  prospect: (id: string) => get<ProspectItem>(`/prospects/${id}`),
  confirmBatch: (prospectIds: string[], date: string) =>
    fetch(`${BASE}/prospects/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds, date }),
    }).then((r) => r.json()),
};
