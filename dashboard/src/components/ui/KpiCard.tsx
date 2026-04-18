interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: "up" | "down" | "neutral";
  progress?: number;
  progressColor?: string;
}

export function KpiCard({ label, value, sub, subColor = "neutral", progress, progressColor = "bg-blue-500" }: KpiCardProps) {
  const subColors = { up: "text-emerald-500", down: "text-red-500", neutral: "text-slate-500" };
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none">{value}</p>
      {progress !== undefined && (
        <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded mt-2 mb-1.5">
          <div className={`h-1 rounded ${progressColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
      {sub && <p className={`text-xs mt-1 ${subColors[subColor]}`}>{sub}</p>}
    </div>
  );
}
