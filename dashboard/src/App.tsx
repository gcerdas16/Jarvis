import { Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Outreach Engine
        </h1>
        <p className="text-sm text-gray-500">
          Sistema de prospección automatizado
        </p>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
