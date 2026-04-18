const styles: Record<string, string> = {
  NEW: "bg-emerald-50 text-emerald-700",
  CONTACTED: "bg-blue-50 text-blue-700",
  FOLLOW_UP_1: "bg-yellow-50 text-yellow-700",
  FOLLOW_UP_2: "bg-orange-50 text-orange-700",
  FOLLOW_UP_3: "bg-orange-100 text-orange-800",
  RESPONDED: "bg-emerald-100 text-emerald-800",
  BOUNCED: "bg-red-50 text-red-700",
  UNSUBSCRIBED: "bg-slate-100 text-slate-500",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  OPENED: "bg-blue-50 text-blue-600",
  CLICKED: "bg-blue-100 text-blue-800",
  COMPLAINED: "bg-red-100 text-red-800",
  INITIAL: "bg-blue-50 text-blue-700",
  QUEUED: "bg-slate-100 text-slate-600",
  SUCCESS: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
  PARTIAL: "bg-yellow-50 text-yellow-700",
  RUNNING: "bg-blue-50 text-blue-600",
  OK: "bg-emerald-50 text-emerald-700",
  ZERO: "bg-yellow-50 text-yellow-700",
  ERROR: "bg-red-50 text-red-700",
};

const labels: Record<string, string> = {
  NEW: "Nuevo", CONTACTED: "Contactado", FOLLOW_UP_1: "Follow-up 1",
  FOLLOW_UP_2: "Follow-up 2", FOLLOW_UP_3: "Follow-up 3", RESPONDED: "Respondió",
  BOUNCED: "Bounce", UNSUBSCRIBED: "Unsub", DELIVERED: "Entregado",
  OPENED: "Abierto", CLICKED: "Clic", COMPLAINED: "Queja",
  INITIAL: "Inicial", QUEUED: "En cola", SUCCESS: "OK", FAILED: "Error",
  PARTIAL: "Parcial", RUNNING: "Corriendo", OK: "OK", ZERO: "Sin resultados", ERROR: "Error",
};

export function Badge({ status }: { status: string }) {
  const cls = styles[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {labels[status] ?? status}
    </span>
  );
}
