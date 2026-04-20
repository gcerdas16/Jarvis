import { useEffect, useState } from "react";
import { MagnifyingGlass, CaretRight, CaretUp, CaretDown, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { api, ProspectItem } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { ProspectDrawerContent } from "../components/ui/ProspectDrawer";
import { relativeTime, todayISO } from "../lib/utils";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3", "RESPONDED", "BOUNCED", "UNSUBSCRIBED"];
const LIMIT = 25;

type SortCol = "email" | "companyName" | "industry" | "status" | "updatedAt";

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
  const [sortCol, setSortCol] = useState<SortCol>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / LIMIT);

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
    const data = await api.prospects(params);
    setProspects(data.prospects);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  useEffect(() => { setPage(1); }, [search, statusFilter, sortCol, sortDir]);
  useEffect(() => { load(); }, [page, search, statusFilter, sortCol, sortDir]);

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
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none">
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
            <MagnifyingGlass size={13} className="text-blue-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email..."
              className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none w-48" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 px-3 w-8">
                <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(prospects.map((p) => p.id)) : new Set())} className="w-3 h-3" />
              </th>
              {(["email", "companyName", "industry", "status", "updatedAt"] as SortCol[]).map((col) => (
                <th key={col} className="py-2 px-3 text-left font-semibold uppercase tracking-wide cursor-pointer hover:text-slate-600 select-none"
                  onClick={() => toggleSort(col)}>
                  {col === "companyName" ? "Empresa" : col === "updatedAt" ? "Último contacto" : col.charAt(0).toUpperCase() + col.slice(1)}
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
              <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin prospectos</td></tr>
            ) : prospects.map((p) => (
              <tr key={p.id} className={`border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 ${selectedId === p.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-3 h-3" />
                </td>
                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer" onClick={() => openDrawer(p)}>{p.email}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{p.companyName ?? "—"}</td>
                <td className="py-2 px-3 text-slate-500">{p.industry ?? "—"}</td>
                <td className="py-2 px-3"><Badge status={p.status} /></td>
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
