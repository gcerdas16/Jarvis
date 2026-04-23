import { useEffect, useState } from "react";
import { Calendar, Envelope, ArrowsClockwise, Warning, Info, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { api, WeekData, WeekDay, WeekDayInitial, WeekDayFollowUp, ProspectItem } from "../lib/api";
import { TierBadge } from "../components/ui/TierBadge";
import { Drawer } from "../components/ui/Drawer";
import { ProspectDrawerContent } from "../components/ui/ProspectDrawer";
import { displayCompany } from "../lib/utils";

function daysSinceDate(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function DaySection({ day, dailyLimit, isToday, onProspectClick }: {
  day: WeekDay; dailyLimit: number; isToday: boolean;
  onProspectClick: (id: string) => void;
}) {
  const [open, setOpen] = useState(isToday);
  const displayTotal = day.sentToday ? (day.sentToday.initial + day.sentToday.followUps) : day.total;
  const pct = Math.min((displayTotal / dailyLimit) * 100, 100);
  const barColor = pct >= 100 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden ${isToday ? "border-blue-200 dark:border-blue-700" : "border-slate-200 dark:border-slate-700"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isToday
          ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-700/20"
        }`}
      >
        <span className={`text-sm font-extrabold flex-1 capitalize ${isToday ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"}`}>
          {isToday && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mb-0.5" />}
          {day.weekday} {day.dayLabel}{isToday ? " — Hoy" : ""}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {day.sentToday ? day.sentToday.initial : day.initialCount} iniciales
          </span>
          <span className="text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
            {day.sentToday ? day.sentToday.followUps : day.followUpCount} FU
          </span>
        </div>
        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-1.5 ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 min-w-12 text-right">{displayTotal}/{dailyLimit}</span>
        <span className={`text-slate-400 text-sm transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          {/* Sent today banner */}
          {day.sentToday && (day.sentToday.initial > 0 || day.sentToday.followUps > 0) && (
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
              <PaperPlaneTilt size={12} weight="fill" className="text-emerald-600 shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Ya enviados hoy:
                {day.sentToday.initial > 0 && <span className="ml-1.5 font-bold">{day.sentToday.initial} iniciales</span>}
                {day.sentToday.followUps > 0 && <span className="ml-1.5 font-bold">{day.sentToday.followUps} follow-ups</span>}
              </span>
            </div>
          )}
          {/* Iniciales */}
          {day.initial.length > 0 && (
            <>
              <div className="px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Envelope size={10} weight="fill" />Iniciales · {day.initialCount}
                </span>
              </div>
              {day.initial.map((p: WeekDayInitial) => (
                <div key={p.id} onClick={() => onProspectClick(p.id)}
                  className="px-4 py-2.5 border-b border-slate-50 dark:border-slate-700/30 flex items-center gap-3 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{p.email}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {displayCompany(p.companyName, p.website, p.email)}
                      {p.industry && <span> · {p.industry}</span>}
                      {p.maturityScore != null && <span className="ml-1 bg-slate-100 dark:bg-slate-700 text-slate-500 px-1 rounded text-[10px] font-bold">{p.maturityScore}</span>}
                    </p>
                  </div>
                  <TierBadge tier={p.leadTier} />
                  <span className="text-slate-300 text-sm">›</span>
                </div>
              ))}
            </>
          )}

          {/* Follow-ups */}
          {day.followUps.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 border-y border-amber-100 dark:border-amber-900/30">
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowsClockwise size={10} weight="fill" />Follow-ups · {day.followUpCount}
                </span>
              </div>
              {day.followUps.map((p: WeekDayFollowUp) => (
                <div key={p.id} onClick={() => onProspectClick(p.id)}
                  className="px-4 py-2.5 border-b border-slate-50 dark:border-slate-700/30 flex items-center gap-3 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate flex items-center gap-1 ${p.isOverdue ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>
                      {p.isOverdue && <Warning size={11} weight="fill" className="text-red-500 shrink-0" />}
                      {p.email}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <span className={`font-medium ${p.isOverdue ? "text-red-500" : "text-amber-600"}`}>{p.nextEmailType.replace(/_/g, " ").toLowerCase()}</span>
                      {!p.hasTemplate && <Warning size={9} className="text-amber-400" />}
                      <span>· {daysSinceDate(p.updatedAt)}d</span>
                    </p>
                  </div>
                  <TierBadge tier={p.leadTier} />
                  <span className="text-slate-300 text-sm">›</span>
                </div>
              ))}
            </>
          )}

          {day.followUpOverflow > 0 && (
            <p className="px-4 py-2 text-[10px] text-amber-500 font-medium">+{day.followUpOverflow} follow-ups adicionales pasan al día siguiente</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeekPage() {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<ProspectItem | null>(null);

  useEffect(() => {
    api.queueWeek().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function openDrawer(id: string) {
    setSelectedId(id);
    const detail = await api.prospect(id);
    setDrawerData(detail);
  }

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando proyección semanal…</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  const today = data.today;
  const totalWeek = data.days.reduce((s, d) => s + d.total, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />Semana
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Proyección · {data.days.length} días hábiles desde hoy</p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-right">
            <p className="text-slate-400">Semana</p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{totalWeek} / {data.dailyLimit * data.days.length}</p>
          </div>
          {data.campaign && (
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-lg font-semibold border border-blue-200 dark:border-blue-800">{data.campaign.name}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_240px] gap-4">
        <div className="space-y-2.5">
          {data.days.map((day) => (
            <DaySection key={day.date} day={day} dailyLimit={data.dailyLimit}
              isToday={day.date === today} onProspectClick={openDrawer} />
          ))}
        </div>

        {/* Sidebar */}
        <aside className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 self-start sticky top-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
            <Info size={12} className="text-blue-500" />Cómo se selecciona
          </h2>
          <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2"><CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" /><p><span className="font-semibold">Iniciales:</span> pool NEW más viejos primero (FIFO).</p></div>
            <div className="flex items-start gap-2"><CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" /><p><span className="font-semibold">Follow-ups:</span> entran el día que cumplen su cadencia.</p></div>
            <div className="flex items-start gap-2"><CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" /><p>Límite <span className="font-bold text-blue-600">{data.dailyLimit}</span>/día. Iniciales primero.</p></div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Cadencia</h3>
            <div className="space-y-1.5 text-[11px]">
              {[
                ["Inicial → FU 1", `+${data.cadence.followUp1Days}d`],
                ["FU 1 → FU 2", `+${data.cadence.followUp2Days}d`],
                ["FU 2 → FU 3", `+${data.cadence.followUp3Days}d`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between p-1.5 bg-amber-50/50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30">
                  <span className="text-slate-600 dark:text-slate-300">{label}</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pool actual</h3>
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between"><span className="text-slate-500">Prospectos NEW</span><span className="font-bold text-slate-800 dark:text-slate-200">{data.newPoolSize.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Días estimados</span><span className="font-bold text-slate-800 dark:text-slate-200">~{Math.ceil(data.newPoolSize / data.dailyLimit)}</span></div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5"><Warning size={10} className="text-red-500" weight="fill" /><span>Follow-up atrasado</span></p>
            <p className="flex items-center gap-1.5"><Warning size={10} className="text-amber-400" /><span>Sin template</span></p>
          </div>
        </aside>
      </div>

      <Drawer open={!!selectedId} onClose={() => { setSelectedId(null); setDrawerData(null); }}
        title={drawerData?.companyName ?? drawerData?.email ?? ""} subtitle={drawerData?.email}>
        {drawerData && (
          <ProspectDrawerContent drawerData={drawerData}
            onNoteAdded={() => api.prospect(drawerData.id).then(setDrawerData)} />
        )}
      </Drawer>
    </div>
  );
}
