import { useEffect, useState } from "react";
import { Calendar, Envelope, ArrowsClockwise, Warning, Info, CheckCircle } from "@phosphor-icons/react";
import { api, WeekData, WeekDay, WeekDayInitial, WeekDayFollowUp } from "../lib/api";
import { displayCompany } from "../lib/utils";

function TierTag({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const colors: Record<string, string> = {
    N1: "bg-emerald-500 text-white",
    N2: "bg-amber-500 text-white",
    N3: "bg-slate-400 text-white",
  };
  return <span className={`inline-block px-1 py-px rounded text-[9px] font-bold ${colors[tier] ?? colors.N3}`}>{tier}</span>;
}

function InitialRow({ p }: { p: WeekDayInitial }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={p.email}>{p.email}</p>
        <p className="text-slate-400 truncate">{displayCompany(p.companyName, p.website, p.email)}</p>
      </div>
      <TierTag tier={p.leadTier} />
    </div>
  );
}

function FollowUpRow({ p }: { p: WeekDayFollowUp }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] py-1 px-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1" title={p.email}>
          {p.isOverdue && <Warning size={11} className="text-red-500 shrink-0" weight="fill" />}
          {p.email}
        </p>
        <p className="text-slate-400 flex items-center gap-1">
          <span className="text-amber-600 font-medium">{p.nextEmailType.replace(/_/g, " ").toLowerCase()}</span>
          {!p.hasTemplate && <Warning size={9} className="text-amber-400" />}
        </p>
      </div>
      <TierTag tier={p.leadTier} />
    </div>
  );
}

function DayColumn({ day, dailyLimit }: { day: WeekDay; dailyLimit: number }) {
  const used = day.total;
  const pct = Math.min((used / dailyLimit) * 100, 100);
  const barColor = pct >= 100 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-blue-500";
  const isEmpty = day.initialCount === 0 && day.followUpCount === 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      {/* Day header */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">{day.weekday}</p>
        <p className="text-[10px] text-slate-400">{day.dayLabel}</p>
      </div>

      {/* Limit bar */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-semibold text-slate-600 dark:text-slate-300">{used} / {dailyLimit}</span>
          {day.followUpOverflow > 0 && (
            <span className="text-amber-500" title={`${day.followUpOverflow} follow-ups extras quedan para el día siguiente`}>
              +{day.followUpOverflow}
            </span>
          )}
        </div>
        <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-1 ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Initial section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1">
            <Envelope size={10} weight="fill" />
            Iniciales · {day.initialCount}
          </p>
        </div>
        <div className="px-1 py-1 space-y-px max-h-64 overflow-y-auto">
          {day.initial.length === 0
            ? <p className="text-[10px] text-slate-300 px-2 py-1 italic">—</p>
            : day.initial.map((p) => <InitialRow key={p.id} p={p} />)}
        </div>

        {/* Follow-ups section */}
        <div className="px-3 py-1.5 bg-amber-50/50 dark:bg-amber-900/10 border-y border-amber-100 dark:border-amber-900/30">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1">
            <ArrowsClockwise size={10} weight="fill" />
            Follow-ups · {day.followUpCount}
          </p>
        </div>
        <div className="px-1 py-1 space-y-px max-h-64 overflow-y-auto">
          {day.followUps.length === 0
            ? <p className="text-[10px] text-slate-300 px-2 py-1 italic">—</p>
            : day.followUps.map((p) => <FollowUpRow key={p.id} p={p} />)}
        </div>
      </div>

      {isEmpty && (
        <div className="px-3 py-2 text-center text-[10px] text-slate-300 italic">Día vacío</div>
      )}
    </div>
  );
}

export default function WeekPage() {
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.queueWeek().then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando proyección semanal…</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  const totalWeek = data.days.reduce((s, d) => s + d.total, 0);
  const totalCapacity = data.dailyLimit * data.days.length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            Semana
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Proyección de envíos para los próximos {data.days.length} días hábiles
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex flex-col items-end">
            <span className="text-slate-400">Capacidad semanal</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalWeek} / {totalCapacity}</span>
          </div>
          {data.campaign && (
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md font-semibold border border-blue-200 dark:border-blue-800">
              {data.campaign.name}
            </span>
          )}
        </div>
      </div>

      {/* Main grid: 5 days + sidebar with rules */}
      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${data.days.length}, 1fr)` }}>
          {data.days.map((day) => (
            <DayColumn key={day.date} day={day} dailyLimit={data.dailyLimit} />
          ))}
        </div>

        {/* Sidebar: rules */}
        <aside className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 self-start sticky top-4">
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Info size={12} className="text-blue-500" />
              Cómo se selecciona
            </h2>
            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" />
                <p><span className="font-semibold">Iniciales:</span> los más viejos del pool <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">NEW</code> primero (FIFO por fecha de scrape).</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" />
                <p><span className="font-semibold">Follow-ups:</span> entran en el día en que cumplen su cadencia.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" weight="fill" />
                <p><span className="font-semibold">Límite diario:</span> máx <span className="font-bold text-blue-600">{data.dailyLimit}</span>. Iniciales primero, follow-ups llenan el resto.</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-2">Cadencia de follow-ups</h2>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between p-2 bg-amber-50/50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30">
                <span className="text-slate-700 dark:text-slate-200">Inicial → FU 1</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">+{data.cadence.followUp1Days} días</span>
              </div>
              <div className="flex justify-between p-2 bg-amber-50/50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30">
                <span className="text-slate-700 dark:text-slate-200">FU 1 → FU 2</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">+{data.cadence.followUp2Days} días</span>
              </div>
              <div className="flex justify-between p-2 bg-amber-50/50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-900/30">
                <span className="text-slate-700 dark:text-slate-200">FU 2 → FU 3</span>
                <span className="font-bold text-amber-700 dark:text-amber-300">+{data.cadence.followUp3Days} días</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-2">Pool actual</h2>
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Prospectos NEW</span><span className="font-bold text-slate-800 dark:text-slate-200">{data.newPoolSize.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Días que duran</span><span className="font-bold text-slate-800 dark:text-slate-200">~{Math.ceil(data.newPoolSize / data.dailyLimit)} días</span></div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5">
              <Warning size={10} className="text-red-500" weight="fill" />
              <span>Follow-up atrasado (rojo)</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Warning size={10} className="text-amber-400" />
              <span>Template no configurado</span>
            </p>
            <p className="flex items-center gap-1.5">
              <span>Si responden → se detienen los FU</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
