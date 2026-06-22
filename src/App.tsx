import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import NewAnalysis from './pages/NewAnalysis';
import CompanyProfilePage from './pages/CompanyProfile';
import PainPointMapPage from './pages/PainPointMap';
import StakeholderMapPage from './pages/StakeholderMap';
import ToolWorkflowMapPage from './pages/ToolWorkflowMap';
import OpportunityEnginePage from './pages/OpportunityEngine';
import ProfitBuilderPlanPage from './pages/ProfitBuilderPlan';
import CRMExportPage from './pages/CRMExport';
import PublicIntelPage from './pages/PublicIntel';
import AutoFillReconPage from './pages/AutoFillRecon';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-analysis" element={<NewAnalysis />} />
              <Route path="/public-intel" element={<PublicIntelPage />} />
              <Route path="/company/:id" element={<CompanyProfilePage />} />
              <Route path="/company/:id/pain-points" element={<PainPointMapPage />} />
              <Route path="/company/:id/stakeholders" element={<StakeholderMapPage />} />
              <Route path="/company/:id/tools" element={<ToolWorkflowMapPage />} />
              <Route path="/company/:id/opportunities" element={<OpportunityEnginePage />} />
              <Route path="/company/:id/plan" element={<ProfitBuilderPlanPage />} />
              <Route path="/company/:id/export" element={<CRMExportPage />} />
              <Route path="/company/:id/auto-fill-recon" element={<AutoFillReconPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
