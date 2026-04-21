import { useEffect, useState } from "react";
import { CheckCircle, Warning, Envelope, ArrowRight } from "@phosphor-icons/react";
import { api, QueueData } from "../lib/api";
import { displayCompany } from "../lib/utils";

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
}

function TemplatePreview({ label, subject, body, color }: { label: string; subject?: string; body: string | null; color: string }) {
  const [open, setOpen] = useState(false);
  if (!body) return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-600">
      <Warning size={14} className="text-amber-500 shrink-0" />
      <span className="text-xs text-slate-400">{label} — sin template configurado</span>
    </div>
  );
  return (
    <div className={`rounded-lg border ${color} overflow-hidden`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          {subject && <span className="text-xs text-slate-400 truncate max-w-48">· {subject}</span>}
        </div>
        <ArrowRight size={12} className={`text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-slate-100 dark:border-slate-700">
          {subject && <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 pt-2 mb-1">Asunto: {subject}</p>}
          <pre className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans">{body}</pre>
        </div>
      )}
    </div>
  );
}

export default function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.queue().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  const limitUsed = data.totalTomorrow;
  const limitPct = Math.min((limitUsed / data.dailyLimit) * 100, 100);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Cola de mañana</h1>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{tomorrowLabel()}</p>
        </div>
        {data.hasBatchConfirmed && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
            <CheckCircle size={13} />Batch confirmado
          </span>
        )}
      </div>

      {/* Limit bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Envelope size={16} className="text-blue-500" />
            Límite diario
          </p>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="text-blue-600 font-bold text-base">{limitUsed}</span>
            <span className="text-slate-400"> / {data.dailyLimit} emails</span>
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-2 rounded-full transition-all" style={{ width: `${limitPct}%`, background: limitPct >= 100 ? "#ef4444" : limitPct > 70 ? "#f59e0b" : "#3b82f6" }} />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
          <span>{data.initial.length} iniciales + {data.followUps.length} follow-ups</span>
          {data.allFollowUpsDue > data.followUps.length && (
            <span className="text-amber-500 font-medium">{data.allFollowUpsDue - data.followUps.length} follow-ups adicionales quedan para el día siguiente</span>
          )}
        </div>
      </div>

      {/* Campaign templates */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5">
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Campaña activa
          {data.campaign && <span className="ml-2 text-xs font-normal text-slate-400">— {data.campaign.name}</span>}
        </p>
        {!data.campaign ? (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Warning size={16} />
            <span>Sin campaña activa — no se enviarán emails mañana</span>
          </div>
        ) : (
          <>
            <TemplatePreview
              label="Email inicial"
              subject={data.campaign.subjectLine}
              body={data.campaign.bodyTemplate}
              color="border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10"
            />
            <TemplatePreview
              label="Follow-up 1"
              subject={`Re: ${data.campaign.subjectLine}`}
              body={data.campaign.followUp1}
              color="border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10"
            />
            <TemplatePreview
              label="Follow-up 2"
              subject={`Re: ${data.campaign.subjectLine}`}
              body={data.campaign.followUp2}
              color="border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10"
            />
            <TemplatePreview
              label="Follow-up 3"
              subject={`Re: ${data.campaign.subjectLine}`}
              body={data.campaign.followUp3}
              color="border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10"
            />
          </>
        )}
      </div>

      {/* Prospect tables */}
      <div className="grid grid-cols-2 gap-4">
        {/* Initial emails */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Emails iniciales</p>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{data.initial.length}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Empresa</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Industria</th>
              </tr>
            </thead>
            <tbody>
              {data.initial.length === 0 ? (
                <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin iniciales — batch no confirmado</td></tr>
              ) : data.initial.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-0 truncate w-36" title={p.email}>{p.email}</td>
                  <td className="py-2 px-3 text-slate-500 truncate">{displayCompany(p.companyName, null, p.email)}</td>
                  <td className="py-2 px-3 text-slate-400 truncate">{p.industry ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Follow-ups */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Follow-ups</p>
            <div className="flex items-center gap-2">
              {data.allFollowUpsDue > data.followUps.length && (
                <span className="text-[11px] text-amber-500">{data.allFollowUpsDue} en cola</span>
              )}
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{data.followUps.length}</span>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Siguiente</th>
                <th className="py-2 px-3 text-center font-semibold uppercase tracking-wide">Días</th>
                <th className="py-2 px-3 text-center font-semibold uppercase tracking-wide">Template</th>
              </tr>
            </thead>
            <tbody>
              {data.followUps.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin follow-ups pendientes</td></tr>
              ) : data.followUps.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-0 w-32" title={p.email}>{p.email}</td>
                  <td className="py-2 px-3 text-slate-500">{p.nextEmailType.replace(/_/g, " ")}</td>
                  <td className="py-2 px-3 text-center font-semibold text-amber-600">{daysSince(p.updatedAt)}d</td>
                  <td className="py-2 px-3 text-center">
                    {p.hasTemplate
                      ? <CheckCircle size={13} className="text-emerald-500 mx-auto" />
                      : <Warning size={13} className="text-amber-400 mx-auto" />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
