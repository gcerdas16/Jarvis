import { useEffect, useState } from "react";
import { MagnifyingGlass, CaretRight, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { api, ProspectItem } from "../lib/api";
import { Drawer } from "../components/ui/Drawer";
import { ProspectDrawerContent } from "../components/ui/ProspectDrawer";
import { relativeTime } from "../lib/utils";

const LIMIT = 50;

interface Stats {
  total: number;
  recentWeek: number;
  bySource: { source: string; count: number }[];
  bySearchType: { searchType: string; count: number }[];
  byIndustry: { industry: string; count: number }[];
}

export default function NewProspectsPage() {
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / LIMIT);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      status: "NEW",
      page: String(page),
      limit: String(LIMIT),
      sortBy: "updatedAt",
      sortDir: "desc",
    });
    if (search) params.set("search", search);
    const [data, s] = await Promise.all([
      api.prospects(params),
      page === 1 && !search ? api.newProspectStats() : Promise.resolve(null),
    ]);
    setProspects(data.prospects);
    setTotal(data.pagination.total);
    if (s) setStats(s);
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(); }, [page, search]);

  async function openDrawer(p: ProspectItem) {
    setSelectedId(p.id);
    const detail = await api.prospect(p.id);
    setDrawerData(detail);
  }

  const drawerProspect = prospects.find((p) => p.id === selectedId);

  return (
    <div className="p-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Nuevos prospectos</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total.toLocaleString()} sin contactar
            {stats && <span className="ml-2 text-emerald-600 font-medium">· +{stats.recentWeek} esta semana</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
          <MagnifyingGlass size={13} className="text-blue-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email..."
            className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none w-44" />
        </div>
      </div>

      {/* Stats */}
      {stats && !search && (
        <div className="grid grid-cols-3 gap-3">
          {/* By source */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por fuente</p>
            <div className="space-y-2">
              {stats.bySource.slice(0, 5).map((s) => (
                <div key={s.source}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-36">{s.source}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.count}</span>
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded">
                    <div className="h-1 bg-blue-500 rounded" style={{ width: `${(s.count / (stats.bySource[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By search type */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por tipo de búsqueda</p>
            <div className="space-y-2">
              {stats.bySearchType.map((s) => (
                <div key={s.searchType}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{s.searchType}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.count}</span>
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded">
                    <div className="h-1 bg-purple-500 rounded" style={{ width: `${(s.count / (stats.bySearchType[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By industry */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Por industria</p>
            <div className="space-y-2">
              {stats.byIndustry.slice(0, 6).map((s) => (
                <div key={s.industry}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-36">{s.industry}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{s.count}</span>
                  </div>
                  <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded">
                    <div className="h-1 bg-emerald-500 rounded" style={{ width: `${(s.count / (stats.byIndustry[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Empresa</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Industria</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Keyword</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Tipo</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Fuente</th>
              <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Agregado</th>
              <th className="py-2 px-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : prospects.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin prospectos nuevos</td></tr>
            ) : prospects.map((p) => (
              <tr key={p.id}
                className={`border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer ${selectedId === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                onClick={() => openDrawer(p)}>
                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.email}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.companyName ?? "—"}</td>
                <td className="py-2 px-3 text-slate-500">{p.industry ?? "—"}</td>
                <td className="py-2 px-3 text-slate-500 max-w-32 truncate" title={p.keyword ?? ""}>{p.keyword ?? "—"}</td>
                <td className="py-2 px-3">
                  {p.searchType ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.searchType === "organic" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                      {p.searchType}
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2 px-3 text-slate-400 truncate max-w-28">{p.source.name}</td>
                <td className="py-2 px-3 text-slate-400">{relativeTime(p.createdAt)}</td>
                <td className="py-2 px-3"><CaretRight size={12} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500">
            {total === 0 ? "0 resultados" : `${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, total)} de ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ArrowLeft size={14} />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 px-2">{page} / {totalPages || 1}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <Drawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDrawerData(null); }}
        title={drawerProspect?.companyName ?? drawerProspect?.email ?? ""}
        subtitle={drawerProspect?.email}
      >
        {drawerData && (
          <ProspectDrawerContent
            drawerData={drawerData}
            onNoteAdded={() => api.prospect(drawerData.id).then(setDrawerData)}
          />
        )}
      </Drawer>
    </div>
  );
}
