import { CalendarBlank } from "@phosphor-icons/react";
import { todayISO } from "../../lib/utils";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const today = todayISO();

  function applyPreset(days: number) {
    if (days === 0) { onChange(today, today); return; }
    const d = new Date();
    d.setDate(d.getDate() - days);
    onChange(d.toISOString().slice(0, 10), today);
  }

  const activePreset = from === to && to === today ? 0 : from === new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10) ? 7 : from === new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) ? 30 : -1;

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {PRESETS.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => applyPreset(days)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
              activePreset === days
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg">
        <CalendarBlank size={14} className="text-blue-500" />
        <input type="date" value={from} max={to} onChange={(e) => onChange(e.target.value, to)}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none" />
        <span className="text-slate-400 text-xs">→</span>
        <input type="date" value={to} min={from} max={today} onChange={(e) => onChange(from, e.target.value)}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none" />
      </div>
    </div>
  );
}
