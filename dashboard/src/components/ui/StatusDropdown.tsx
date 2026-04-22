import { useState, useRef, useEffect } from "react";
import { api, MANUAL_STATUSES, MANUAL_STATUS_LABELS, ManualStatus } from "../../lib/api";

const AUTO_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "FOLLOW_UP_3", "RESPONDED", "BOUNCED", "UNSUBSCRIBED"];

const MANUAL_DOT_COLORS: Record<ManualStatus, string> = {
  REUNION_AGENDADA:  "bg-green-500",
  REUNION_REALIZADA: "bg-emerald-600",
  PROPUESTA_ENVIADA: "bg-blue-500",
  CLIENTE:           "bg-purple-500",
  NO_INTERESADO:     "bg-red-500",
  REVISITAR:         "bg-orange-500",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  NEW:               "bg-slate-100 text-slate-600 border-slate-200",
  CONTACTED:         "bg-blue-100 text-blue-700 border-blue-200",
  FOLLOW_UP_1:       "bg-amber-100 text-amber-700 border-amber-200",
  FOLLOW_UP_2:       "bg-orange-100 text-orange-700 border-orange-200",
  FOLLOW_UP_3:       "bg-red-100 text-red-700 border-red-200",
  RESPONDED:         "bg-emerald-100 text-emerald-700 border-emerald-200",
  BOUNCED:           "bg-red-100 text-red-600 border-red-200",
  UNSUBSCRIBED:      "bg-slate-100 text-slate-500 border-slate-200",
  REUNION_AGENDADA:  "bg-green-50 text-green-700 border-green-200",
  REUNION_REALIZADA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROPUESTA_ENVIADA: "bg-blue-50 text-blue-700 border-blue-200",
  CLIENTE:           "bg-purple-50 text-purple-700 border-purple-200",
  NO_INTERESADO:     "bg-red-50 text-red-700 border-red-200",
  REVISITAR:         "bg-orange-50 text-orange-700 border-orange-200",
};

function statusLabel(status: string): string {
  if (status in MANUAL_STATUS_LABELS) return MANUAL_STATUS_LABELS[status as ManualStatus];
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  prospectId: string;
  currentStatus: string;
  onChanged: (newStatus: string) => void;
}

export function StatusDropdown({ prospectId, currentStatus, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ManualStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingStatus(null);
        setNote("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelect(status: ManualStatus) {
    setPendingStatus(status);
  }

  async function handleConfirm() {
    if (!pendingStatus) return;
    setSaving(true);
    const result = await api.updateProspectStatus(prospectId, pendingStatus, note || undefined);
    setSaving(false);
    if (result.success) {
      onChanged(pendingStatus);
      setOpen(false);
      setPendingStatus(null);
      setNote("");
    }
  }

  const badgeClass = STATUS_BADGE_CLASSES[currentStatus] ?? "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="relative inline-block" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold cursor-pointer transition-opacity hover:opacity-80 ${badgeClass}`}
      >
        {statusLabel(currentStatus)}
        <span className="text-[9px] opacity-60">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl min-w-52 p-1.5">
          {!pendingStatus ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">Estado manual</p>
              {MANUAL_STATUSES.map((s) => (
                <button key={s} onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${MANUAL_DOT_COLORS[s]}`} />
                  {MANUAL_STATUS_LABELS[s]}
                </button>
              ))}
              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Automáticos (solo lectura)</p>
              {AUTO_STATUSES.map((s) => (
                <div key={s} className="flex items-center gap-2 px-2.5 py-1.5 opacity-40 cursor-not-allowed text-xs text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
                  {statusLabel(s)}
                </div>
              ))}
            </>
          ) : (
            <div className="p-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Cambiar a: <span className="text-blue-600">{MANUAL_STATUS_LABELS[pendingStatus]}</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nota opcional..."
                rows={2}
                className="w-full text-xs p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 outline-none resize-none focus:border-blue-400 mb-2"
              />
              <div className="flex gap-2">
                <button onClick={handleConfirm} disabled={saving}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg">
                  {saving ? "..." : "Confirmar"}
                </button>
                <button onClick={() => setPendingStatus(null)}
                  className="px-3 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg">
                  Atrás
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
