interface TierBadgeProps {
  tier: string | null | undefined;
}

const TIER_CONFIG = {
  N1: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    label: "N1 — Alta prioridad",
    score: "Score 80–100",
    criteria: ["Sitio web activo y profesional", "Email directo (no genérico)", "Industria objetivo principal", "Tech stack compatible con GCWARE"],
  },
  N2: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "N2 — Potencial medio",
    score: "Score 50–79",
    criteria: ["Información parcial del negocio", "Industria secundaria o mixta", "Email posiblemente genérico"],
  },
  N3: {
    className: "bg-slate-100 text-slate-600 border-slate-200",
    label: "N3 — Baja prioridad",
    score: "Score 0–49",
    criteria: ["Datos mínimos disponibles", "Industria fuera del target", "Sin tech stack detectado"],
  },
};

export function TierBadge({ tier }: TierBadgeProps) {
  if (!tier) return <span className="text-slate-300">—</span>;
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];
  if (!config) return <span className="text-slate-300">{tier}</span>;

  return (
    <span className="relative inline-block group">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-default ${config.className}`}>
        {tier}
      </span>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 w-52 bg-slate-800 text-slate-200 text-[11px] rounded-lg px-3 py-2.5 shadow-xl z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="font-bold text-white text-xs mb-0.5">{config.label}</p>
        <p className="text-slate-400 text-[10px] mb-1.5">{config.score}</p>
        <ul className="list-disc list-inside space-y-0.5">
          {config.criteria.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-800" />
      </div>
    </span>
  );
}
