const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "https://jarvis-production-02d0.up.railway.app/api" : "/api");

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const json = await response.json();

  if (!json.success) {
    throw new Error(json.error || "API request failed");
  }

  return json.data;
}

export const api = {
  getOverview: () => fetchApi("/metrics/overview"),
  getDailyMetrics: (days = 30) => fetchApi(`/metrics/daily?days=${days}`),
  getProspects: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : "";
    return fetchApi(`/prospects${query}`);
  },
  getProspect: (id: string) => fetchApi(`/prospects/${id}`),
};
