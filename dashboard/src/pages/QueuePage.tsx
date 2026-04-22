import { useEffect, useState } from "react";
import { api, QueueData, ProspectItem } from "../lib/api";
import { TierBadge } from "../components/ui/TierBadge";
import { Drawer } from "../components/ui/Drawer";
import { ProspectDrawerContent } from "../components/ui/ProspectDrawer";
import { displayCompany } from "../lib/utils";

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
}

export default function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);

  async function load() {
    const d = await api.queue();
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleToggle() {
    if (!data || toggling) return;
    setToggling(true);
    await api.toggleEmailsPause();
    await load();
    setToggling(false);
  }

  async function openDrawer(id: string) {
    setSelectedId(id);
    const detail = await api.prospect(id);
    setDrawerData(detail);
  }

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  const paused = data.emailsPaused;
  const limitPct = Math.min((data.totalTomorrow / data.dailyLimit) * 100, 100);
  const barColor = limitPct >= 100 ? "#ef4444" : limitPct > 70 ? "#f59e0b" : "#3b82f6";
  const overflow = Math.max(0, data.allFollowUpsDue - data.followUps.length);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Cola de mañana</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{tomorrowLabel()} · Envíos automáticos a las 8:05 a.m.</p>
        </div>
        {/* Kill switch toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${paused
            ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          <div className={`w-9 h-5 rounded-full relative transition-colors ${paused ? "bg-slate-300 dark:bg-slate-600" : "bg-green-500"}`}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${paused ? "left-0.5" : "left-4"}`} />
          </div>
          <span>{toggling ? "..." : paused ? "Pausado" : "Activo"}</span>
        </button>
      </div>

      {/* Banner */}
      <div className={`rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-3 ${paused
        ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
        : "bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
      }`}>
        <div className={`w-2 h-2 rounded-full ${paused ? "bg-amber-500" : "bg-blue-500"}`} />
        {paused
          ? `Envíos pausados — ${data.totalTomorrow} emails en espera, no saldrán mañana`
          : `${data.totalTomorrow} emails confirmados — salen mañana a las 8:05 a.m.`
        }
      </div>

      {/* Limit bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3.5 flex items-center gap-4">
        <span className="text-slate-500 text-sm">
          <span className="text-blue-600 font-extrabold text-xl">{data.totalTomorrow}</span> / {data.dailyLimit}
        </span>
        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-2 rounded-full transition-all" style={{ width: `${limitPct}%`, background: barColor }} />
        </div>
        <span className="text-xs text-slate-400">{data.initial.length} iniciales · {data.followUps.length} follow-ups</span>
        {overflow > 0 && <span className="text-xs text-amber-500 font-semibold">{overflow} FU extras → pasado mañana</span>}
      </div>

      {/* Two lists */}
      <div className="grid grid-cols-2 gap-4">
        {/* Iniciales */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-extrabold text-blue-700 dark:text-blue-400">Emails iniciales</span>
            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full">{data.initial.length}</span>
          </div>
          {data.initial.map((p) => (
            <div key={p.id} onClick={() => openDrawer(p.id)}
              className="px-5 py-3 border-b border-slate-50 dark:border-slate-700/30 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {displayCompany(p.companyName, p.website, p.email)}
                  {p.industry && <span> · {p.industry}</span>}
                  {p.maturityScore != null && <span className="ml-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded text-[10px] font-bold">{p.maturityScore}</span>}
                </p>
              </div>
              <TierBadge tier={p.leadTier} />
              <span className="text-slate-300 text-sm">›</span>
            </div>
          ))}
          {data.initial.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sin iniciales</p>}
        </div>

        {/* Follow-ups */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400">Follow-ups</span>
            <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full">{data.followUps.length}</span>
          </div>
          {data.followUps.map((p) => {
            const days = daysSince(p.updatedAt);
            return (
              <div key={p.id} onClick={() => openDrawer(p.id)}
                className="px-5 py-3 border-b border-slate-50 dark:border-slate-700/30 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.email}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {displayCompany(p.companyName, null, p.email)}
                    {' · '}
                    {!p.hasTemplate
                      ? <span className="text-amber-500 font-semibold">Sin template ⚠</span>
                      : days > 12
                      ? <span className="text-red-500 font-bold">{days}d atrasado ⚠</span>
                      : <span>{days}d desde {p.status === "CONTACTED" ? "inicial" : "FU anterior"}</span>
                    }
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  p.nextEmailType === "FOLLOW_UP_1" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                  p.nextEmailType === "FOLLOW_UP_2" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}>{p.nextEmailType.replace(/_/g, " ").replace("FOLLOW UP", "FU")}</span>
                <TierBadge tier={p.leadTier} />
                <span className="text-slate-300 text-sm">›</span>
              </div>
            );
          })}
          {data.followUps.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Sin follow-ups pendientes</p>}
        </div>
      </div>

      <Drawer
        open={!!selectedId}
        onClose={() => { setSelectedId(null); setDrawerData(null); }}
        title={drawerData?.companyName ?? drawerData?.email ?? ""}
        subtitle={drawerData?.email}
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
