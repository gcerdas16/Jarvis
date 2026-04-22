import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { api } from "../../lib/api";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function AddProspectModal({ onClose, onCreated }: Props) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [country, setCountry] = useState("CR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await api.createProspect({
      email,
      ...(companyName && { companyName }),
      ...(website && { website }),
      ...(industry && { industry }),
      ...(companyType && { companyType }),
      country,
    });
    setSaving(false);
    if (result.success) {
      onCreated();
      onClose();
    } else {
      setError(result.error ?? "Error al crear prospecto");
    }
  }

  const fieldClass = "w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-400";
  const labelClass = "text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Agregar prospecto</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className={fieldClass} placeholder="contacto@empresa.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Empresa</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                className={fieldClass} placeholder="Empresa S.A." />
            </div>
            <div>
              <label className={labelClass}>País</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                className={fieldClass} placeholder="CR" maxLength={10} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Sitio web</label>
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
              className={fieldClass} placeholder="https://empresa.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Industria</label>
              <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
                className={fieldClass} placeholder="Tecnología" />
            </div>
            <div>
              <label className={labelClass}>Tipo empresa</label>
              <input type="text" value={companyType} onChange={(e) => setCompanyType(e.target.value)}
                className={fieldClass} placeholder="pyme" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
              {saving ? "Guardando..." : "Agregar prospecto"}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
