import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import OverviewPage from "./pages/OverviewPage";
import ScrapersPage from "./pages/ScrapersPage";
import EmailsPage from "./pages/EmailsPage";
import JobsPage from "./pages/JobsPage";
import ProspectsPage from "./pages/ProspectsPage";
import WeekPage from "./pages/WeekPage";
import SistemaPage from "./pages/SistemaPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/scrapers" element={<ScrapersPage />} />
        <Route path="/emails" element={<EmailsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/prospects" element={<ProspectsPage />} />
        <Route path="/semana" element={<WeekPage />} />
        <Route path="/sistema" element={<SistemaPage />} />
      </Routes>
    </Layout>
  );
}
