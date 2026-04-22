import { useEffect, useState } from "react";
import { PaperPlaneTilt, ArrowsClockwise, Bug, WarningCircle, ChatCircleText } from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api, OverviewData } from "../lib/api";
import { KpiCard } from "../components/ui/KpiCard";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { relativeTime } from "../lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  email: <PaperPlaneTilt size={14} />,
  response: <ChatCircleText size={14} />,
  scraper: <Bug size={14} />,
  warning: <WarningCircle size={14} />,
  followup: <ArrowsClockwise size={14} />,
};

const ICON_COLORS: Record<string, string> = {
  email: "bg-blue-50 text-blue-500",
  response: "bg-emerald-50 text-emerald-500",
  scraper: "bg-purple-50 text-purple-500",
  warning: "bg-red-50 text-red-500",
  followup: "bg-amber-50 text-amber-500",
};

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [daily, setDaily] = useState<{ date: string; emails: number; leads: number; responses: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>("");

  async function load() {
    const [ov, dl] = await Promise.all([
      selectedDate ? api.overviewByDate(selectedDate) : api.overview(),
      api.daily(),
    ]);
    setData(ov);
    setDaily(dl.days);
    setLoading(false);
  }

  useEffect(() => { load(); }, [selectedDate]);
  const countdown = useAutoRefresh(load);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar datos.</div>;

  const { kpis, activity, jobs } = data;
  const today = new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const dateLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CR", { day: "numeric", month: "short" })
    : "hoy";

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Buenos días, Gustavo</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{today} · Auto-refresh en {countdown}s</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />API Online</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Scrapers OK</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Emails OK</span>
        </div>
      </div>

      {/* Date picker row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {["", "7d", "30d"].map((preset) => (
            <button key={preset}
              onClick={() => {
                if (preset === "") setSelectedDate("");
                else {
                  const d = new Date();
                  d.setDate(d.getDate() - (preset === "7d" ? 7 : 30));
                  setSelectedDate(d.toISOString().slice(0, 10));
                }
              }}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                (preset === "" && !selectedDate) || (preset !== "" && selectedDate)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}>
              {preset === "" ? "Hoy" : preset === "7d" ? "7 días" : "30 días"}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 outline-none"
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate("")}
            className="text-xs text-slate-400 hover:text-slate-600 px-2">Hoy</button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={`Emails ${dateLabel}`} value={`${kpis.emailsSentToday}/${kpis.dailyLimit}`} progress={(kpis.emailsSentToday / kpis.dailyLimit) * 100} sub={`${((kpis.emailsSentToday / kpis.dailyLimit) * 100).toFixed(0)}% del límite`} subColor="up" />
        <KpiCard label={`Leads ${dateLabel}`} value={kpis.leadsToday} sub={`${kpis.leadsNew} nuevos · ${kpis.leadsDuplicates} duplicados`} progressColor="bg-purple-500" progress={60} />
        <KpiCard label="Respuestas" value={kpis.responsesThisWeek} sub="Esta semana" subColor="up" progressColor="bg-emerald-500" progress={30} />
        <KpiCard label={`Bounces ${dateLabel}`} value={kpis.bouncesToday} sub={`${kpis.bounceRate}% de enviados`} subColor={Number(kpis.bounceRate) > 5 ? "down" : "neutral"} progressColor="bg-red-500" progress={Number(kpis.bounceRate)} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Últimos 7 días</p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />Emails</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded" />Leads</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />Resp.</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={daily}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e2e8f0" }} />
              <Line type="monotone" dataKey="emails" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="responses" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Actividad Reciente</p>
          <div className="space-y-3">
            {activity.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${ICON_COLORS[item.type] ?? "bg-slate-50 text-slate-500"}`}>
                  {ICON_MAP[item.type]}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.text}</p>
                  <p className="text-xs text-slate-400">{relativeTime(item.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Estado de Jobs <span className="font-normal text-slate-400 text-xs">L-V automático</span></p>
        <div className="grid grid-cols-3 gap-3">
          {jobs.map((job) => {
            const ok = job.lastRun?.status === "SUCCESS";
            return (
              <div key={job.type} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3" style={{ borderLeft: `3px solid ${ok ? "#10b981" : "#f59e0b"}` }}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{job.name}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {job.lastRun ? `${relativeTime(job.lastRun.startedAt)} ✓` : "Sin datos"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Próximo: {job.nextRun}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
