import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { DashboardPage } from "./pages/DashboardPage";
import { CRMPage } from "./pages/CRMPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { BPMPage } from "./pages/BPMPage";
import { AutomationPage } from "./pages/AutomationPage";
import { TicketsPage } from "./pages/TicketsPage";
import { AIPage } from "./pages/AIPage";
import { AuditPage } from "./pages/AuditPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/crm" element={<CRMPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/bpm" element={<BPMPage />} />
        <Route path="/automation" element={<AutomationPage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Route>
    </Routes>
  );
}
