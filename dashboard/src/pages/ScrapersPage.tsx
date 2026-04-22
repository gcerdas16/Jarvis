import { useEffect, useState } from "react";
import { api, ScraperTodayData, KeywordItem } from "../lib/api";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { relativeTime } from "../lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ScrapersPage() {
  const [data, setData] = useState<ScraperTodayData | null>(null);
  const [daily, setDaily] = useState<{ date: string; leads: number }[]>([]);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [kwFilter, setKwFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);

  const isToday = selectedDate === todayISO();

  async function load() {
    setLoading(true);
    const dateParam = isToday ? undefined : selectedDate;
    const [td, dl, kw] = await Promise.all([api.scraperToday(dateParam), api.scraperDaily(), api.scraperKeywords()]);
    setData(td);
    setDaily(dl.days);
    setKeywords(kw.keywords);
    setLoading(false);
  }

  useEffect(() => { load(); }, [selectedDate]);
  useAutoRefresh(isToday ? load : () => {});

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar datos.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Scrapers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Corre automáticamente L-V 7:42am</p>
        </div>
        <div className="flex items-center gap-3">
          {isToday && <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Activo</span>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Búsquedas hoy" value={data.kpis.searchesRun} sub="organic + maps" />
        <KpiCard label="URLs visitadas" value={data.kpis.urlsVisited} />
        <KpiCard label="Leads encontrados" value={data.kpis.leadsFound} sub="Emails extraídos" />
        <KpiCard label="Nuevos (dedup)" value={data.kpis.leadsNew} sub={`${data.kpis.leadsDuplicates} ya existían`} subColor="up" progressColor="bg-emerald-500" progress={(data.kpis.leadsNew / Math.max(data.kpis.leadsFound, 1)) * 100} />
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <span>Historial de Runs</span>
            <input type="date" value={selectedDate} max={todayISO()} onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none ml-auto" />
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-1.5 px-2 font-semibold uppercase tracking-wide">Keyword</th>
                <th className="text-left py-1.5 px-2 font-semibold uppercase tracking-wide">Tipo</th>
                <th className="text-center py-1.5 px-2 font-semibold uppercase tracking-wide relative group cursor-help">
                  Encontrados
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center whitespace-normal">
                    URLs/negocios encontrados en la búsqueda antes de deduplicar
                  </div>
                </th>
                <th className="text-center py-1.5 px-2 font-semibold uppercase tracking-wide relative group cursor-help">
                  Nuevos
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center whitespace-normal">
                    Insertados en BD después de deduplicación (email no existía)
                  </div>
                </th>
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
      {/* Keyword bank */}
      <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Banco de Keywords ({keywords.length})</h2>
            <input value={kwFilter} onChange={(e) => setKwFilter(e.target.value)} placeholder="Filtrar..."
              className="text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-transparent text-slate-700 dark:text-slate-300 outline-none w-40" />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Keyword</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Industria</th>
                <th className="py-2 px-3 text-center font-semibold uppercase tracking-wide relative group cursor-help">
                  Progreso
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center whitespace-normal">
                    Páginas buscadas / total. Ej: 4/5 = 4 páginas de resultados procesadas de 5 posibles.
                  </div>
                </th>
                <th className="py-2 px-3 text-right font-semibold uppercase tracking-wide">Último run</th>
                <th className="py-2 px-3 text-center font-semibold uppercase tracking-wide relative group cursor-help">
                  Estado
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-center whitespace-normal">
                    Activo: el scraper lo usa. Inactivo: pausado manualmente en BD.
                  </div>
                </th>
              </tr>
            </thead>
          <tbody>
            {keywords.filter((k) => !kwFilter || k.keyword.toLowerCase().includes(kwFilter.toLowerCase()) || k.industry.toLowerCase().includes(kwFilter.toLowerCase())).map((k) => (
              <tr key={k.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{k.keyword}</td>
                <td className="py-2 px-3 text-slate-500">{k.industry}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded">
                      <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${Math.min(((k.currentPage - 1) / k.maxPage) * 100, 100)}%` }} />
                    </div>
                    <span className="text-slate-500 tabular-nums">{k.currentPage - 1}/{k.maxPage}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right text-slate-400">{k.lastSearchedAt ? relativeTime(k.lastSearchedAt) : "—"}</td>
                <td className="py-2 px-3 text-center">
                  {k.currentPage > k.maxPage
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">Agotado</span>
                    : k.isActive
                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 font-medium">Activo</span>
                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 font-medium">Inactivo</span>
                  }
                </td>
              </tr>
            ))}
            {keywords.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400">Sin keywords</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
