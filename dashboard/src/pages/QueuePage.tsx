import { useEffect, useState } from "react";
import { api, QueueData } from "../lib/api";
import { Badge } from "../components/ui/Badge";

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function tomorrowLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
}

export default function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.queue().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="p-6 text-slate-500 text-sm">Cargando...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error al cargar.</div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Cola de mañana</h1>
        <p className="text-xs text-slate-500 mt-0.5 capitalize">{tomorrowLabel()} · {data.totalTomorrow} emails estimados</p>
      </div>

      {data.hasBatchConfirmed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">Batch confirmado</span> — Los iniciales son el batch manual de mañana.
        </div>
      )}

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
                <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin emails iniciales</td></tr>
              ) : data.initial.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-0 w-40">{p.email}</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate">{p.companyName ?? "—"}</td>
                  <td className="py-2 px-3 text-slate-500 truncate">{p.industry ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Follow-ups */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Follow-ups</p>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">{data.followUps.length}</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Email</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Siguiente</th>
                <th className="py-2 px-3 text-center font-semibold uppercase tracking-wide">Días</th>
                <th className="py-2 px-3 text-left font-semibold uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.followUps.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-slate-400">Sin follow-ups pendientes</td></tr>
              ) : data.followUps.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 truncate max-w-0 w-36">{p.email}</td>
                  <td className="py-2 px-3 text-slate-500">{p.nextEmailType.replace(/_/g, " ")}</td>
                  <td className="py-2 px-3 text-center font-semibold text-amber-600">{daysSince(p.updatedAt)}d</td>
                  <td className="py-2 px-3"><Badge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
