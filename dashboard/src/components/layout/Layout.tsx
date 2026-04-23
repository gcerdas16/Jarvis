import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { Sidebar } from "./Sidebar";
import { useLocation } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && <Sidebar current={pathname} onClose={() => setSidebarOpen(false)} />}
      <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-10 p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-md"
          >
            <List size={18} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
