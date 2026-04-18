import { useEffect, useState } from "react";
import { MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { api, ProspectItem } from "../lib/api";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { relativeTime, formatDate, todayISO } from "../lib/utils";

const STATUS_OPTIONS = ["", "NEW", "CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3", "RESPONDED", "BOUNCED", "UNSUBSCRIBED"];

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<ProspectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    const params = new URLSearchParams({ limit: "100" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const data = await api.prospects(params);
    setProspects(data.prospects);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  async function openDrawer(p: ProspectItem) {
    setSelectedId(p.id);
    const detail = await api.prospect(p.id);
    setDrawerData(detail);
  }

  function toggleSelect(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function confirmBatch() {
    await api.confirmBatch(Array.from(selected), todayISO());
    setSelected(new Set());
    alert(`Batch confirmado: ${selected.size} prospectos para hoy`);
  }

  const drawerProspect = prospects.find((p) => p.id === selectedId);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;

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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
        <div className="flex">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 px-3 w-8">
                    <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(prospects.map((p) => p.id)) : new Set())} className="w-3 h-3" />
                  </th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Empresa</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Industria</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Estado</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Último contacto</th>
                  <th className="py-2 px-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
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
                {prospects.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin prospectos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Drawer
            open={!!selectedId}
            onClose={() => { setSelectedId(null); setDrawerData(null); }}
            title={drawerProspect?.companyName ?? drawerProspect?.email ?? ""}
            subtitle={drawerProspect?.email}
          >
            {drawerData && (
              <>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Empresa</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Industria</span><span className="font-semibold">{drawerData.industry ?? "—"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Fuente</span><span className="font-semibold">{drawerData.source.name}</span></div>
                    {drawerData.website && <div className="flex justify-between"><span className="text-slate-500">Sitio web</span><span className="font-semibold text-blue-500">{drawerData.website}</span></div>}
                    <div className="flex justify-between"><span className="text-slate-500">Agregado</span><span>{formatDate(drawerData.createdAt)}</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Historial de contacto</p>
                  <div className="space-y-2">
                    {drawerData.emailsSent?.map((es) => (
                      <div key={es.id} className={`rounded-lg p-2.5 border-l-2 ${es.emailType === "INITIAL" ? "bg-blue-50 border-blue-400" : "bg-yellow-50 border-yellow-400"}`}>
                        <p className="text-xs font-semibold text-slate-800">{es.emailType === "INITIAL" ? "Email inicial" : es.emailType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(es.sentAt)} · {es.events[0]?.eventType ?? "Enviado"}</p>
                      </div>
                    ))}
                    {drawerData.responses?.map((r) => (
                      <div key={r.id} className="bg-emerald-50 border-l-2 border-emerald-500 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-emerald-800">Respondió</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(r.receivedAt)}</p>
                        {r.bodyPreview && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{r.bodyPreview}</p>}
                      </div>
                    ))}
                    {!drawerData.emailsSent?.length && !drawerData.responses?.length && (
                      <p className="text-xs text-slate-400 text-center py-2">Sin contacto aún</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </Drawer>
        </div>
      </div>

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
