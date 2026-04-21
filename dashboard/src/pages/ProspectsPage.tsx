import { useEffect, useState } from "react";
import { MagnifyingGlass, CaretRight, CaretUp, CaretDown, ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { api, ProspectItem, FilterOptions } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { ProspectDrawerContent } from "../components/ui/ProspectDrawer";
import { relativeTime, todayISO, displayCompany } from "../lib/utils";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3", "RESPONDED", "BOUNCED", "UNSUBSCRIBED"];
const LIMIT = 25;

type SortCol = "email" | "companyName" | "industry" | "status" | "updatedAt" | "maturityScore";

function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return <span className="text-slate-300">—</span>;
  const colors: Record<string, string> = {
    N1: "bg-emerald-100 text-emerald-700 border-emerald-200",
    N2: "bg-amber-100 text-amber-700 border-amber-200",
    N3: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${colors[tier] ?? colors.N3}`}>{tier}</span>;
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: "asc" | "desc" }) {
  if (col !== sortCol) return <CaretDown size={10} className="text-slate-300 ml-0.5 inline" />;
  return sortDir === "asc"
    ? <CaretUp size={10} className="text-blue-500 ml-0.5 inline" />
    : <CaretDown size={10} className="text-blue-500 ml-0.5 inline" />;
}


export default function ProspectsPage() {
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [techStackFilter, setTechStackFilter] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / LIMIT);
  const activeFilterCount = [statusFilter, tierFilter, sourceFilter, countryFilter, techStackFilter].filter(Boolean).length;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      sortBy: sortCol,
      sortDir,
    });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (tierFilter) params.set("tier", tierFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    if (countryFilter) params.set("country", countryFilter);
    if (techStackFilter) params.set("techStack", techStackFilter);
    const data = await api.prospects(params);
    setProspects(data.prospects);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  function clearFilters() {
    setStatusFilter(""); setTierFilter(""); setSourceFilter(""); setCountryFilter(""); setTechStackFilter("");
  }

  useEffect(() => { api.prospectFilterOptions().then(setFilterOptions).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search, statusFilter, tierFilter, sourceFilter, countryFilter, techStackFilter, sortCol, sortDir]);
  useEffect(() => { load(); }, [page, search, statusFilter, tierFilter, sourceFilter, countryFilter, techStackFilter, sortCol, sortDir]);

  async function openDrawer(p: ProspectItem) {
    setSelectedId(p.id);
    const detail = await api.prospect(p.id);
    setDrawerData(detail);
  }

  function toggleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function confirmBatch() {
    const count = selected.size;
    await api.confirmBatch(Array.from(selected), todayISO());
    setSelected(new Set());
    alert(`Batch confirmado: ${count} prospectos para hoy`);
  }

  const drawerProspect = prospects.find((p) => p.id === selectedId);

  return (
    <div className="p-6 space-y-4 pb-24">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Prospects</h1>
          <p className="text-xs text-slate-500 mt-0.5">{total.toLocaleString()} prospectos en total</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
          <MagnifyingGlass size={13} className="text-blue-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar email o empresa..."
            className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none w-56" />
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 mr-1">Filtrar:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">Estado: todos</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">Tier: todos</option>
          {filterOptions?.tiers.map((t) => <option key={t.value} value={t.value}>{t.value} ({t.count})</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">Fuente: todas</option>
          {filterOptions?.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">País: todos</option>
          {filterOptions?.countries.map((c) => <option key={c.value} value={c.value}>{c.value} ({c.count})</option>)}
        </select>
        <select value={techStackFilter} onChange={(e) => setTechStackFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none">
          <option value="">Tech stack: todos</option>
          {filterOptions?.techStacks.map((t) => <option key={t.value} value={t.value}>{t.value} ({t.count})</option>)}
        </select>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs px-2.5 py-1.5 text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <X size={11} />Limpiar ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 px-3 w-8">
                <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(prospects.map((p) => p.id)) : new Set())} className="w-3 h-3" />
              </th>
              {(["email", "companyName", "industry", "status", "maturityScore", "updatedAt"] as SortCol[]).map((col) => (
                <th key={col} className="py-2 px-3 text-left font-semibold uppercase tracking-wide cursor-pointer hover:text-slate-600 select-none"
                  onClick={() => toggleSort(col)}>
                  {col === "companyName" ? "Empresa"
                    : col === "updatedAt" ? "Último contacto"
                    : col === "maturityScore" ? "Tier"
                    : col.charAt(0).toUpperCase() + col.slice(1)}
                  <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                </th>
              ))}
              <th className="py-2 px-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : prospects.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-400">Sin prospectos</td></tr>
            ) : prospects.map((p) => (
              <tr key={p.id} className={`border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 ${selectedId === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-3 h-3" />
                </td>
                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer" onClick={() => openDrawer(p)}>{p.email}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{displayCompany(p.companyName, p.website, p.email)}</td>
                <td className="py-2 px-3 text-slate-500">{p.industry ?? "—"}</td>
                <td className="py-2 px-3"><Badge status={p.status} /></td>
                <td className="py-2 px-3"><TierBadge tier={p.leadTier} /></td>
                <td className="py-2 px-3 text-slate-400">{relativeTime(p.updatedAt)}</td>
                <td className="py-2 px-3 cursor-pointer" onClick={() => openDrawer(p)}><CaretRight size={12} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500">
            {total === 0 ? "0 resultados" : `${((page - 1) * LIMIT) + 1}–${Math.min(page * LIMIT, total)} de ${total.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 px-2">
              {page} / {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
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

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-blue-200 shadow-xl rounded-xl px-6 py-3 flex items-center gap-6 z-50">
          <p className="text-sm font-semibold text-blue-700">{selected.size} seleccionados para hoy · quedan {50 - selected.size} disponibles</p>
          <button onClick={confirmBatch} className="bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Confirmar batch →
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
        </div>
      )}
    </div>
  );
}
