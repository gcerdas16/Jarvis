import { useEffect, useState } from "react";
import { api, ScraperTodayData } from "../lib/api";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { relativeTime } from "../lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function ScrapersPage() {
  const [data, setData] = useState<ScraperTodayData | null>(null);
  const [daily, setDaily] = useState<{ date: string; leads: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [td, dl] = await Promise.all([api.scraperToday(), api.scraperDaily()]);
    setData(td);
    setDaily(dl.days);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar datos.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Scrapers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Corre automáticamente L-V 7:42am</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Activo</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Búsquedas hoy" value={data.kpis.searchesRun} sub="organic + maps" />
        <KpiCard label="URLs visitadas" value={data.kpis.urlsVisited} />
        <KpiCard label="Leads encontrados" value={data.kpis.leadsFound} sub="Emails extraídos" />
        <KpiCard label="Nuevos (dedup)" value={data.kpis.leadsNew} sub={`${data.kpis.leadsDuplicates} ya existían`} subColor="up" progressColor="bg-emerald-500" progress={(data.kpis.leadsNew / Math.max(data.kpis.leadsFound, 1)) * 100} />
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Historial de Runs — Hoy</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-1.5 px-2 font-semibold uppercase tracking-wide">Keyword</th>
                <th className="text-left py-1.5 px-2 font-semibold uppercase tracking-wide">Tipo</th>
                <th className="text-center py-1.5 px-2 font-semibold uppercase tracking-wide">Encontrados</th>
                <th className="text-center py-1.5 px-2 font-semibold uppercase tracking-wide">Nuevos</th>
                <th className="text-center py-1.5 px-2 font-semibold uppercase tracking-wide">Estado</th>
                <th className="text-right py-1.5 px-2 font-semibold uppercase tracking-wide">Hora</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log, i) => (
                <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 px-2 text-slate-800 dark:text-slate-200 font-medium">{log.keyword}</td>
                  <td className="py-2 px-2 text-slate-500">{log.searchType}</td>
                  <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300">{log.resultsCount}</td>
                  <td className="py-2 px-2 text-center font-semibold text-emerald-600">{log.newUrlsCount}</td>
                  <td className="py-2 px-2 text-center"><Badge status={log.status} /></td>
                  <td className="py-2 px-2 text-right text-slate-400">{relativeTime(log.searchedAt)}</td>
                </tr>
              ))}
              {data.logs.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Sin runs hoy</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="col-span-2 flex flex-col gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Leads por día (7 días)</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={daily} barCategoryGap="20%">
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                <Bar dataKey="leads" radius={[2, 2, 0, 0]}>
                  {daily.map((d, i) => (
                    <Cell key={i} fill={d.date === "Hoy" ? "#3b82f6" : "#8b5cf6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white mb-3">Top industrias hoy</p>
            <div className="space-y-2">
              {data.topIndustries.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                    <span>{t.industry}</span><span>{t.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded">
                    <div className="h-1.5 bg-purple-500 rounded" style={{ width: `${(t.count / (data.topIndustries[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
              {data.topIndustries.length === 0 && <p className="text-xs text-slate-400">Sin datos hoy</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
