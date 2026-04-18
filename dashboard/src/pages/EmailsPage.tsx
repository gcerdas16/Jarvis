import { useEffect, useState } from "react";
import { MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { api, EmailItem, EmailKpis, ProspectItem } from "../lib/api";
import { KpiCard } from "../components/ui/KpiCard";
import { Badge } from "../components/ui/Badge";
import { Drawer } from "../components/ui/Drawer";
import { DateRangePicker } from "../components/ui/DateRangePicker";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { relativeTime, todayISO, formatDate } from "../lib/utils";

const TABS = ["all", "initial", "followup", "bounced", "replied"] as const;
const TAB_LABELS: Record<string, string> = { all: "Todos", initial: "Nuevos", followup: "Follow-ups", bounced: "Bounces", replied: "Respondidos" };

export default function EmailsPage() {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [kpis, setKpis] = useState<EmailKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerProspect, setDrawerProspect] = useState<ProspectItem | null>(null);

  async function load() {
    const params = new URLSearchParams({ from, to, status: tab, limit: "100" });
    if (search) params.set("search", search);
    const data = await api.emails(params);
    setEmails(data.emails);
    setKpis(data.kpis);
    setLoading(false);
  }

  useEffect(() => { load(); }, [from, to, tab, search]);
  useAutoRefresh(load);

  async function openDrawer(email: EmailItem) {
    setSelectedId(email.id);
    const prospect = await api.prospect(email.prospect.email);
    setDrawerProspect(prospect);
  }

  if (!kpis) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;

  const selected = emails.find((e) => e.id === selectedId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Emails</h1>
          <p className="text-xs text-slate-500 mt-0.5">Envío automático 8:05am · Follow-ups 10:00am · L-V</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Activo</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Enviados hoy" value={`${kpis.sentToday}/${kpis.dailyLimit}`} progress={(kpis.sentToday / kpis.dailyLimit) * 100} sub={`${((kpis.sentToday / kpis.dailyLimit) * 100).toFixed(0)}% del límite`} subColor="up" />
        <KpiCard label="Follow-ups hoy" value={kpis.followUpsToday} progressColor="bg-purple-500" />
        <KpiCard label="Bounces hoy" value={kpis.bouncesToday} sub={kpis.sentToday > 0 ? `${((kpis.bouncesToday / kpis.sentToday) * 100).toFixed(1)}% bounce rate` : "0%"} subColor="down" progressColor="bg-red-500" progress={kpis.sentToday > 0 ? (kpis.bouncesToday / kpis.sentToday) * 100 : 0} />
        <KpiCard label="Respuestas" value={kpis.responsesThisWeek} sub="Esta semana" subColor="up" progressColor="bg-emerald-500" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative" style={{ minHeight: 400 }}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${tab === t ? "bg-blue-50 border-blue-200 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
            <MagnifyingGlass size={13} className="text-blue-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email..."
              className="text-xs text-slate-700 dark:text-slate-300 bg-transparent border-none outline-none w-44" />
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Empresa</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Industria</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Tipo</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Estado</th>
                  <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Fecha</th>
                  <th className="py-2 px-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {emails.map((e) => (
                  <tr key={e.id} onClick={() => openDrawer(e)}
                    className={`border-b border-slate-50 dark:border-slate-700/30 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selectedId === e.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{e.prospect.email}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{e.prospect.companyName ?? "—"}</td>
                    <td className="py-2 px-3 text-slate-500">{e.prospect.industry ?? "—"}</td>
                    <td className="py-2 px-3"><Badge status={e.emailType} /></td>
                    <td className="py-2 px-3"><Badge status={e.latestEvent?.eventType ?? e.prospect.status} /></td>
                    <td className="py-2 px-3 text-slate-400">{relativeTime(e.sentAt)}</td>
                    <td className="py-2 px-3"><CaretRight size={12} className="text-slate-300" /></td>
                  </tr>
                ))}
                {emails.length === 0 && !loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">Sin emails en este rango</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Drawer
            open={!!selectedId}
            onClose={() => { setSelectedId(null); setDrawerProspect(null); }}
            title={selected?.prospect.companyName ?? selected?.prospect.email ?? ""}
            subtitle={selected?.prospect.email}
          >
            {drawerProspect && (
              <>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Empresa</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Industria</span><span className="font-semibold">{selected?.prospect.industry ?? "—"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Fuente</span><span className="font-semibold">{selected?.prospect.source.name}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Estado</span><Badge status={selected?.prospect.status ?? ""} /></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Historial de contacto</p>
                  <div className="space-y-2">
                    {drawerProspect.emailsSent?.map((es) => (
                      <div key={es.id} className={`rounded-lg p-2.5 border-l-2 ${es.emailType === "INITIAL" ? "bg-blue-50 border-blue-400" : "bg-yellow-50 border-yellow-400"}`}>
                        <p className="text-xs font-semibold text-slate-800">{es.emailType === "INITIAL" ? "Email inicial" : es.emailType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatDate(es.sentAt)} · {es.events[0]?.eventType ?? "Sin eventos"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Drawer>
        </div>
      </div>
    </div>
  );
}
