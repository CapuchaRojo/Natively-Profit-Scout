import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { AuthGuard } from './components/AuthGuard';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
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
import PipelineScoutPage from './pages/PipelineScout';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth routes — no guard, no sidebar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected app routes */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <AppProvider>
                  <ToastProvider>
                    <div className="app-layout">
                      <Sidebar />
                      <main className="main-content">
                        <ErrorBoundary>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/pipeline" element={<PipelineScoutPage />} />
                            <Route path="/new-analysis" element={<NewAnalysis />} />
                            <Route path="/public-intel" element={<PublicIntelPage />} />
                            <Route path="/company/:id" element={<CompanyProfilePage />} />
                            <Route path="/company/:id/pain-points" element={<PainPointMapPage />} />
                            <Route path="/company/:id/stakeholders" element={<StakeholderMapPage />} />
                            <Route path="/company/:id/tools" element={<ToolWorkflowMapPage />} />
                            <Route path="/company/:id/opportunities" element={<OpportunityEnginePage />} />
                            <Route path="/company/:id/plan" element={<ProfitBuilderPlanPage />} />
                            <Route path="/crm-export" element={<CRMExportPage />} />
                            <Route path="/company/:id/export" element={<CRMExportPage />} />
                            <Route path="/company/:id/auto-fill-recon" element={<AutoFillReconPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </ErrorBoundary>
                      </main>
                    </div>
                  </ToastProvider>
                </AppProvider>
              </AuthGuard>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}