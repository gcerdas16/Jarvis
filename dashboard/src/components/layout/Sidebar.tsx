import { House, Bug, Envelope, ClockClockwise, Users, Lightning, Moon, Sun, ProhibitInset } from "@phosphor-icons/react";
import { useTheme } from "../../hooks/useTheme";

const NAV = [
  { label: "Overview", icon: House, href: "/" },
  { label: "Scrapers", icon: Bug, href: "/scrapers" },
  { label: "Emails", icon: Envelope, href: "/emails" },
  { label: "Jobs", icon: ClockClockwise, href: "/jobs" },
  { label: "Prospects", icon: Users, href: "/prospects" },
  { label: "Unsubscribes", icon: ProhibitInset, href: "/unsubscribes" },
];

export function Sidebar({ current }: { current: string }) {
  const { dark, toggle } = useTheme();

  return (
    <aside className="w-60 bg-slate-800 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <Lightning size={18} color="white" weight="fill" />
        </div>
        <span className="text-white font-bold text-lg">Jarvis</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Main</p>
        {NAV.map(({ label, icon: Icon, href }) => {
          const active = current === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              {label}
            </a>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700">
        <button onClick={toggle} className="flex items-center gap-2 text-slate-500 text-xs hover:text-slate-300 transition-colors">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
        </button>
      </div>
    </aside>
  );
}
