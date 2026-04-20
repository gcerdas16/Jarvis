import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { api, UnsubscribeItem } from "../lib/api";
import { formatDate } from "../lib/utils";

const LIMIT = 50;

export default function UnsubscribesPage() {
  const [items, setItems] = useState<UnsubscribeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / LIMIT);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    const data = await api.unsubscribes(params);
    setItems(data.unsubscribes);
    setTotal(data.pagination.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Unsubscribes</h1>
        <p className="text-xs text-slate-500 mt-0.5">{total.toLocaleString()} emails en lista de exclusión</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-700">
              <th className="py-2 px-4 text-left font-semibold uppercase tracking-wide">Email</th>
              <th className="py-2 px-4 text-left font-semibold uppercase tracking-wide">Razón</th>
              <th className="py-2 px-4 text-left font-semibold uppercase tracking-wide">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="py-8 text-center text-slate-400">Sin unsubscribes</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">{item.email}</td>
                <td className="py-2 px-4 text-slate-500">{item.reason ?? "—"}</td>
                <td className="py-2 px-4 text-slate-400">{formatDate(item.createdAt)}</td>
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
    </div>
  );
}
