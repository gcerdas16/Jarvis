import { useEffect, useState } from "react";
import { Gauge, ArrowsClockwise, Envelope, MagnifyingGlass, PaperPlaneTilt, CheckCircle, XCircle, Warning, ClockClockwise } from "@phosphor-icons/react";
import { api, SystemData } from "../lib/api";
import { relativeTime } from "../lib/utils";

const EVENT_COLORS: Record<string, string> = {
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  BOUNCED:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  OPENED:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CLICKED:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  SPAM:      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

const SERPER_MONTHLY_LIMIT = 2500;

function StatCard({ label, value, sub, color = "text-slate-800 dark:text-white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SistemaPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const d = await api.system();
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando sistema…</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  const { warmup, serper, resend, jobs } = data;
  const serperPct = Math.round((serper.searchesMonth / SERPER_MONTHLY_LIMIT) * 100);
  const serperWarn = serperPct >= 80;
  const limitPct = Math.min((warmup.emailsSentToday / warmup.dailyLimit) * 100, 100);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Gauge size={20} className="text-slate-600 dark:text-slate-300" />Sistema
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitoreo de servicios externos</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
          <ArrowsClockwise size={13} className={refreshing ? "animate-spin" : ""} />Actualizar
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Emails */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Envelope size={14} className="text-blue-500" weight="fill" />
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Emails</p>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${warmup.emailsPaused ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"}`}>
              {warmup.emailsPaused ? "Pausado" : "Activo"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Enviados hoy" value={warmup.emailsSentToday} sub={`de ${warmup.dailyLimit}`} color={warmup.emailsSentToday > 0 ? "text-blue-600 dark:text-blue-300" : "text-slate-800 dark:text-white"} />
            <StatCard label="Esta semana" value={warmup.emailsSentWeek} />
          </div>
          <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-1.5 bg-blue-500 rounded-full transition-all" style={{ width: `${limitPct}%` }} />
          </div>
        </div>

        {/* Serper */}
        <div className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${serperWarn ? "border-amber-300 dark:border-amber-700" : "border-slate-200 dark:border-slate-700"}`}>
          <div className="flex items-center gap-2 mb-3">
            <MagnifyingGlass size={14} className="text-purple-500" weight="bold" />
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Serper</p>
            {serperWarn && <Warning size={12} className="ml-auto text-amber-500" weight="fill" />}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatCard label="Hoy" value={serper.searchesToday} />
            <StatCard label="Semana" value={serper.searchesWeek} />
            <StatCard label="Mes" value={serper.searchesMonth} color={serperWarn ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-white"} />
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
            <div className={`h-1.5 rounded-full transition-all ${serperWarn ? "bg-amber-500" : "bg-purple-500"}`} style={{ width: `${Math.min(serperPct, 100)}%` }} />
          </div>
          <p className="text-[10px] text-slate-400">{serperPct}% de {SERPER_MONTHLY_LIMIT.toLocaleString()} estimados/mes</p>
          {serperWarn && <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Revisa créditos en serper.dev</p>}
        </div>

        {/* Resend events hoy */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <PaperPlaneTilt size={14} className="text-emerald-500" weight="fill" />
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Resend · Hoy</p>
          </div>
          <div className="space-y-1.5">
            {Object.entries({ DELIVERED: "Entregados", BOUNCED: "Bounces", OPENED: "Abiertos", CLICKED: "Clicks", SPAM: "Spam" }).map(([type, label]) => {
              const count = resend.eventsByType[type] ?? 0;
              return (
                <div key={type} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${count > 0 ? EVENT_COLORS[type] ?? "bg-slate-100 text-slate-600" : "text-slate-300 dark:text-slate-600"}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Jobs */}
      {jobs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClockClockwise size={14} className="text-slate-500" />
            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Jobs — Último run</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {jobs.map((job) => {
              const ok = job.status === "SUCCESS";
              return (
                <div key={job.jobType} className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  {ok
                    ? <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" weight="fill" />
                    : <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" weight="fill" />
                  }
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">{job.jobType.replace(/_/g, " ")}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{relativeTime(job.startedAt)}</p>
                    {job.durationMs && <p className="text-[10px] text-slate-300 dark:text-slate-600">{(job.durationMs / 1000).toFixed(1)}s</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resend events feed */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <PaperPlaneTilt size={13} className="text-emerald-500" weight="fill" />
          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Eventos Resend · Hoy</p>
          <span className="ml-auto text-[10px] text-slate-400">{resend.recentEvents.length} eventos</span>
        </div>
        {resend.recentEvents.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-400">Sin eventos hoy</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/30 max-h-72 overflow-y-auto">
            {resend.recentEvents.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${EVENT_COLORS[e.eventType] ?? "bg-slate-100 text-slate-600"}`}>{e.eventType}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {e.prospect?.email ?? "—"}
                    {e.prospect?.companyName && <span className="text-slate-400"> · {e.prospect.companyName}</span>}
                  </p>
                  {e.emailType && <p className="text-[10px] text-slate-400">{e.emailType.replace(/_/g, " ").toLowerCase()}</p>}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{relativeTime(e.occurredAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
