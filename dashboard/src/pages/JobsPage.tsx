import { useEffect, useState } from "react";
import { PaperPlaneTilt, ArrowsClockwise, Bug } from "@phosphor-icons/react";
import { api, JobStatus, JobRun } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { relativeTime, formatDuration, todayISO } from "../lib/utils";

const JOB_ICONS: Record<string, React.ReactNode> = {
  EMAIL_SEND: <PaperPlaneTilt size={18} className="text-blue-500" />,
  FOLLOW_UPS: <ArrowsClockwise size={18} className="text-purple-500" />,
  SCRAPER: <Bug size={18} className="text-emerald-500" />,
};

const HISTORY_TABS = ["all", "EMAIL_SEND", "FOLLOW_UPS", "SCRAPER"] as const;
const TAB_LABELS: Record<string, string> = { all: "Todos", EMAIL_SEND: "Emails", FOLLOW_UPS: "Follow-ups", SCRAPER: "Scraper" };

export default function JobsPage() {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState("all");
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams({ from, to, type: tab });
    const [status, history] = await Promise.all([api.jobsStatus(), api.jobsHistory(params)]);
    setJobs(status.jobs);
    setRuns(history.runs);
    setLoading(false);
  }

  useEffect(() => { load(); }, [from, to, tab]);
  useAutoRefresh(load);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Jobs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Scheduler automático · L-V · Costa Rica (UTC-6)</p>
        </div>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {jobs.map((job) => {
          const ok = !job.lastRun || job.lastRun.status === "SUCCESS";
          return (
            <div key={job.type} className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4`}
              style={{ borderTop: `4px solid ${ok ? "#10b981" : "#f59e0b"}` }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">{JOB_ICONS[job.type]}<p className="font-extrabold text-slate-900 dark:text-white text-sm">{job.name}</p></div>
                  <p className="text-xs text-slate-500">Cron: {job.schedule}</p>
                </div>
                <Badge status={job.lastRun?.status ?? "RUNNING"} />
              </div>
              <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-700 pt-2">
                <div className="flex justify-between"><span className="text-slate-500">Último run</span><span className="font-semibold text-emerald-600">{job.lastRun ? relativeTime(job.lastRun.startedAt) + " ✓" : "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Resultado</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {job.lastRun?.result ? Object.entries(job.lastRun.result).map(([k, v]) => `${v} ${k}`).join(" · ") : "—"}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Duración</span><span className="text-slate-600">{formatDuration(job.lastRun?.durationMs ?? null)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Próximo run</span><span className="text-slate-600">{job.nextRun}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Historial de Ejecuciones</p>
          <div className="flex gap-1">
            {HISTORY_TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${tab === t ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white dark:bg-slate-800"}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide w-6">●</th>
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide">Job</th>
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide">Fecha</th>
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide">Hora</th>
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide">Resultado</th>
              <th className="py-2 px-2 text-left font-semibold uppercase tracking-wide">Duración</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                <td className="py-2 px-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${r.status === "SUCCESS" ? "bg-emerald-500" : r.status === "FAILED" ? "bg-red-500" : "bg-yellow-500"}`} />
                </td>
                <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">{JOB_ICONS[r.jobType]}{r.jobType.replace(/_/g, " ")}</div>
                </td>
                <td className="py-2 px-2 text-slate-600 dark:text-slate-400">{new Date(r.startedAt).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}</td>
                <td className="py-2 px-2 text-slate-500">{new Date(r.startedAt).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{r.result ? Object.entries(r.result).map(([k, v]) => `${v} ${k}`).join(" · ") : r.errorMessage ?? "—"}</td>
                <td className="py-2 px-2 text-slate-500">{formatDuration(r.durationMs)}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin ejecuciones en este rango</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
