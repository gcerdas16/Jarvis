import { Sidebar } from "./Sidebar";
import { useLocation } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar current={pathname} />
      <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900">
        {children}
      </main>
    </div>
  );
}
