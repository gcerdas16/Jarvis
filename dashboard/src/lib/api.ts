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

export interface ProspectNote { id: string; noteType: string; content: string; createdAt: string; }
export interface ProspectItem {
  id: string; email: string; companyName: string | null; industry: string | null;
  status: string; createdAt: string; updatedAt: string; website?: string | null;
  companyType?: string | null; description?: string | null;
  keyword?: string | null; searchType?: string | null;
  country?: string | null; techStack?: string | null;
  leadTier?: string | null; maturityScore?: number | null;
  instagram?: string | null; facebook?: string | null; linkedin?: string | null;
  whatsapp?: string | null; tiktok?: string | null;
  source: { name: string; type: string };
  emailsSent?: { id: string; emailType: string; subject: string; sentAt: string; events: { eventType: string; occurredAt: string }[] }[];
  responses?: { id: string; receivedAt: string; bodyPreview: string | null }[];
  notes?: ProspectNote[];
}

export interface FilterOptions {
  sources: { id: string; name: string; type: string }[];
  countries: { value: string; count: number }[];
  techStacks: { value: string; count: number }[];
  tiers: { value: string; count: number }[];
  industries: { value: string; count: number }[];
  companyTypes: { value: string; count: number }[];
  statuses: { value: string; count: number }[];
}

export interface StatusHistoryItem {
  id: string;
  prospectId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  note: string | null;
  createdAt: string;
}

export const MANUAL_STATUSES = [
  "REUNION_AGENDADA", "REUNION_REALIZADA", "PROPUESTA_ENVIADA",
  "CLIENTE", "NO_INTERESADO", "REVISITAR",
] as const;

export type ManualStatus = typeof MANUAL_STATUSES[number];

export const MANUAL_STATUS_LABELS: Record<ManualStatus, string> = {
  REUNION_AGENDADA:  "Reunión agendada",
  REUNION_REALIZADA: "Reunión realizada",
  PROPUESTA_ENVIADA: "Propuesta enviada",
  CLIENTE:           "Cliente",
  NO_INTERESADO:     "No interesado",
  REVISITAR:         "Revisitar",
};

export interface QueueItem { id: string; email: string; companyName: string | null; industry: string | null; source: string; leadTier: string | null; maturityScore: number | null; website: string | null; }
export interface QueueFollowUp { id: string; email: string; companyName: string | null; industry: string | null; status: string; nextEmailType: string; updatedAt: string; hasTemplate: boolean; leadTier: string | null; }
export interface QueueCampaign { id: string; name: string; subjectLine: string; bodyTemplate: string; followUp1: string | null; followUp2: string | null; followUp3: string | null; }
export interface QueueData { dailyLimit: number; emailsPaused: boolean; campaign: QueueCampaign | null; initial: QueueItem[]; followUps: QueueFollowUp[]; allFollowUpsDue: number; hasBatchConfirmed: boolean; totalTomorrow: number; }

export interface WeekDayInitial {
  id: string; email: string; companyName: string | null; website: string | null;
  industry: string | null; leadTier: string | null; maturityScore: number | null;
}
export interface WeekDayFollowUp {
  id: string; email: string; companyName: string | null; industry: string | null;
  status: string; updatedAt: string; nextEmailType: string;
  hasTemplate: boolean; isOverdue: boolean; leadTier: string | null;
}
export interface WeekDay {
  date: string; weekday: string; dayLabel: string;
  initial: WeekDayInitial[]; followUps: WeekDayFollowUp[];
  initialCount: number; followUpCount: number; followUpOverflow: number; total: number;
  sentToday?: { initial: number; followUps: number };
}
export interface WeekData {
  dailyLimit: number; newPoolSize: number; today: string;
  campaign: { id: string; name: string } | null;
  days: WeekDay[];
  cadence: { followUp1Days: number; followUp2Days: number; followUp3Days: number };
}
export interface ProspectsData { prospects: ProspectItem[]; pagination: { page: number; total: number; totalPages: number; limit: number }; }

export interface UnsubscribeItem { id: string; email: string; reason: string | null; createdAt: string; }
export interface UnsubscribesData { unsubscribes: UnsubscribeItem[]; pagination: { page: number; total: number; totalPages: number; limit: number }; }

export interface KeywordItem { id: string; keyword: string; industry: string; currentPage: number; maxPage: number; lastSearchedAt: string | null; isActive: boolean; }
export interface KeywordsData { keywords: KeywordItem[]; total: number; }

// --- Fetchers ---

export const api = {
  overview: () => get<OverviewData>("/metrics/overview"),
  daily: () => get<DailyData>("/metrics/daily"),
  scraperToday: (date?: string) => get<ScraperTodayData>(`/metrics/scraper/today${date ? `?date=${date}` : ""}`),
  scraperDaily: () => get<{ days: ScraperDayPoint[] }>("/metrics/scraper/daily"),
  emails: (params: URLSearchParams) => get<EmailsData>(`/emails?${params}`),
  jobsStatus: () => get<JobsStatusData>("/jobs/status"),
  jobsHistory: (params: URLSearchParams) => get<JobsHistoryData>(`/jobs/history?${params}`),
  prospects: (params: URLSearchParams) => get<ProspectsData>(`/prospects?${params}`),
  prospect: (id: string) => get<ProspectItem>(`/prospects/${id}`),
  prospectFilterOptions: () => get<FilterOptions>("/prospects/filter-options"),
  newProspectStats: () => get<{ total: number; recentWeek: number; bySource: { source: string; count: number }[]; bySearchType: { searchType: string; count: number }[]; byIndustry: { industry: string; count: number }[] }>("/prospects/new/stats"),
  unsubscribes: (params: URLSearchParams) => get<UnsubscribesData>(`/unsubscribes?${params}`),
  scraperKeywords: () => get<KeywordsData>("/metrics/scraper/keywords"),
  queue: () => get<QueueData>("/queue"),
  queueWeek: () => get<WeekData>("/queue/week"),
  addNote: (prospectId: string, noteType: string, content: string) =>
    fetch(`${BASE}/prospects/${prospectId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType, content }),
    }).then((r) => r.json()),
  confirmBatch: (prospectIds: string[], date: string) =>
    fetch(`${BASE}/prospects/batch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectIds, date }),
    }).then((r) => r.json()),
  toggleEmailsPause: () =>
    fetch(`${BASE}/settings/emails-pause`, { method: "PATCH" }).then((r) => r.json()),
  prospectStatusHistory: (id: string) => get<StatusHistoryItem[]>(`/prospects/${id}/history`),
  updateProspectStatus: (id: string, status: string, note?: string) =>
    fetch(`${BASE}/prospects/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    }).then((r) => r.json()),
  overviewByDate: (date: string) => get<OverviewData>(`/metrics/overview?date=${date}`),
  dailyByDays: (days: number) => get<DailyData>(`/metrics/daily?days=${days}`),
  createProspect: (data: { email: string; companyName?: string; website?: string; industry?: string; companyType?: string; country?: string; description?: string }) =>
    fetch(`${BASE}/prospects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
};
