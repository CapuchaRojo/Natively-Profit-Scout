// ============================================================
// AppContext — React Context + localStorage + Supabase Persistence
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Company, AppSettings, DashboardMetrics, NewAnalysisData, PublicIntelSource, PublicIntelSignal, PublicIntelOpening } from '../types';
import type { ImportResult } from '../services/providerImportParser';
import { sampleCompanies } from '../data/sampleCompanies';
import { generateFullAnalysis, calculateOpportunityScore, calculateFitScore, calculatePainScore, calculateUrgencyScore } from '../services/analysisEngine';
import { generateOnePageBrief } from '../services/exportUtilities';
import {
  loadAllCompanies,
  loadSettings,
  saveSettings,
  upsertCompany,
  deleteCompanyFromDb,
  upsertAllCompanies,
  isSupabaseReachable,
} from '../services/dataSync';

// ============================================================
// State & Reducer
// ============================================================

interface AppState {
  companies: Company[];
  settings: AppSettings;
  currentCompanyId: string | null;
  dbSynced: boolean;
}

type AppAction =
  | { type: 'SET_COMPANIES'; payload: Company[] }
  | { type: 'ADD_COMPANY'; payload: Company }
  | { type: 'UPDATE_COMPANY'; payload: { id: string; updates: Partial<Company> } }
  | { type: 'DELETE_COMPANY'; payload: string }
  | { type: 'SET_CURRENT_COMPANY'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_DB_SYNCED'; payload: boolean };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_COMPANIES':
      return { ...state, companies: action.payload };
    case 'ADD_COMPANY':
      return { ...state, companies: [...state.companies, action.payload] };
    case 'UPDATE_COMPANY': {
      const { id, updates } = action.payload;
      return {
        ...state,
        companies: state.companies.map(c =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      };
    }
    case 'DELETE_COMPANY':
      return {
        ...state,
        companies: state.companies.filter(c => c.id !== action.payload),
        currentCompanyId: state.currentCompanyId === action.payload ? null : state.currentCompanyId,
      };
    case 'SET_CURRENT_COMPANY':
      return { ...state, currentCompanyId: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_DB_SYNCED':
      return { ...state, dbSynced: action.payload };
    default:
      return state;
  }
}

// ============================================================
// localStorage helpers
// ============================================================

const STORAGE_KEY = 'natively-profit-scout-data';

function normalizeCompany(c: Company): Company {
  return {
    ...c,
    publicIntelSources: c.publicIntelSources || [],
    publicIntelSignals: c.publicIntelSignals || [],
    publicIntelOpenings: c.publicIntelOpenings || [],
    painPoints: c.painPoints || [],
    stakeholders: c.stakeholders || [],
    toolMap: c.toolMap || [],
    highladerRepurpose: c.highladerRepurpose || [],
    opportunities: c.opportunities || [],
    comments: c.comments || [],
    contacts: (c.contacts || []).map(ct => ({
      ...ct,
      id: ct.id || `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: ct.fullName || `${ct.firstName || ''} ${ct.lastName || ''}`.trim(),
      isPrimary: ct.isPrimary ?? false,
      source: ct.source || 'import',
    })),
    sourceImport: c.sourceImport || '',
    importedAt: c.importedAt || '',
    accountType: c.accountType || 'unknown',
    productLane: c.productLane || 'unknown',
    pipelineStatus: c.pipelineStatus || 'new',
    owner: c.owner || '',
    priority: c.priority || 'unset',
    nextAction: c.nextAction || '',
    nextActionDate: c.nextActionDate || '',
    lastContactedAt: c.lastContactedAt || '',
    sourceCampaign: c.sourceCampaign || '',
    utmSource: c.utmSource || '',
    utmMedium: c.utmMedium || '',
    utmCampaign: c.utmCampaign || '',
    utmContent: c.utmContent || '',
    hubspotLifecycleStage: c.hubspotLifecycleStage || '',
    hubspotDealStage: c.hubspotDealStage || '',
  };
}

function loadStateFromLocal(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const companies = (parsed.companies || []).map(normalizeCompany);
      return {
        companies,
        settings: { ...defaultSettings, ...parsed.settings },
        currentCompanyId: parsed.currentCompanyId || null,
        dbSynced: false,
      };
    }
    // First run — seed with sample data
    const analyzedSamples = sampleCompanies.map(c =>
      generateFullAnalysis({ ...c, id: `${c.id}-${Date.now()}` })
    );
    return {
      companies: analyzedSamples,
      settings: defaultSettings,
      currentCompanyId: null,
      dbSynced: false,
    };
  } catch {
    return { companies: [], settings: defaultSettings, currentCompanyId: null, dbSynced: false };
  }
}

function saveStateToLocal(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      companies: state.companies,
      settings: state.settings,
      currentCompanyId: state.currentCompanyId,
    }));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

// ============================================================
// Defaults
// ============================================================

const defaultSettings: AppSettings = {
  userName: '',
  company: '',
  defaultOfferTypes: ['ai_automation', 'workflow_optimization'],
  defaultPackages: 'Growth Package',
  crmExportFormat: 'json',
  scoringWeights: { painSeverity: 1, frequency: 1, revenueImpact: 1, decisionMakerVisibility: 1, easeOfSolution: 1 },
  customDiscoveryQuestions: '',
  customSalesLanguage: '',
  dataPrivacyConsent: false,
  publicIntelSettings: { autoAnalyzeOnFetch: true, maxSourcesPerCompany: 20, showAssumedBadges: true },
  reconSettings: {
    enabled: false,
    backendUrl: '',
    respectRobotsTxt: true,
    maxPagesPerScan: 10,
    maxCharsPerPage: 25000,
    scanDelayMs: 1000,
    enableUrlDiscovery: true,
    enableToolFingerprinting: true,
    enableWorkflowInference: true,
    enablePeopleRoleInference: true,
    defaultConfidenceThreshold: 'Medium',
  },
};

// ============================================================
// Context
// ============================================================

interface AppContextType {
  state: AppState;
  createCompany: (data: NewAnalysisData) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  getCompany: (id: string) => Company | undefined;
  setCurrentCompany: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  regenerateAnalysis: (id: string) => Company | undefined;
  getDashboardMetrics: () => DashboardMetrics;
  getOnePageBrief: (id: string) => string;
  addPublicIntelSource: (companyId: string, source: PublicIntelSource) => void;
  updatePublicIntelSource: (companyId: string, sourceId: string, updates: Partial<PublicIntelSource>) => void;
  deletePublicIntelSource: (companyId: string, sourceId: string) => void;
  addPublicIntelSignals: (companyId: string, signals: PublicIntelSignal[]) => void;
  addPublicIntelOpenings: (companyId: string, openings: PublicIntelOpening[]) => void;
  clearPublicIntelForCompany: (companyId: string) => void;
  addCompany: (company: Company) => void;
  bulkImportCompanies: (results: ImportResult[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, loadStateFromLocal);
  const isInitialMount = useRef(true);

  // ── Initial Supabase load (runs once on mount) ──
  useEffect(() => {
    async function hydrateFromSupabase() {
      const reachable = await isSupabaseReachable();
      if (!reachable) {
        console.log('[AppContext] Supabase unreachable, using localStorage only');
        dispatch({ type: 'SET_DB_SYNCED', payload: true });
        return;
      }

      const [dbCompanies, dbSettings] = await Promise.all([
        loadAllCompanies(),
        loadSettings(),
      ]);

      // If Supabase has data, use it (it's the source of truth after first sync).
      // Otherwise, push our localStorage data to Supabase.
      if (dbCompanies.length > 0) {
        dispatch({ type: 'SET_COMPANIES', payload: dbCompanies.map(normalizeCompany) });
        console.log(`[AppContext] Loaded ${dbCompanies.length} companies from Supabase`);
      } else if (state.companies.length > 0) {
        // Push local data up to Supabase (first-time migration)
        await upsertAllCompanies(state.companies);
        console.log(`[AppContext] Migrated ${state.companies.length} companies to Supabase`);
      }

      if (dbSettings) {
        dispatch({ type: 'SET_SETTINGS', payload: { ...defaultSettings, ...dbSettings } });
      } else {
        await saveSettings(state.settings);
      }

      dispatch({ type: 'SET_DB_SYNCED', payload: true });
    }

    hydrateFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to localStorage on every state change ──
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveStateToLocal(state);
  }, [state]);

  // ── Persist to Supabase (debounced on relevant changes) ──
  useEffect(() => {
    if (!state.dbSynced) return;

    // We debounce saving to Supabase by 2s to avoid excessive writes
    const timer = setTimeout(async () => {
      await upsertAllCompanies(state.companies);
      await saveSettings(state.settings);
    }, 2000);

    return () => clearTimeout(timer);
  }, [state.companies, state.settings, state.dbSynced]);

  // ── Actions ──

  const createCompany = useCallback((data: NewAnalysisData): Company => {
    const now = new Date().toISOString();
    const newCompany: Company = {
      id: `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      basic: data.basic, business: data.business, people: data.people, tools: data.tools,
      workloadFriction: data.workloadFriction, salesContext: data.salesContext,
      painPoints: [], stakeholders: [], toolMap: [], highladerRepurpose: [], opportunities: [],
      publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [],
      reconFindings: undefined,
      comments: [], contacts: [],
      sourceImport: '', importedAt: '',
      accountType: 'unknown', productLane: 'unknown', pipelineStatus: 'new',
      owner: '', priority: 'unset', nextAction: '', nextActionDate: '', lastContactedAt: '',
      sourceCampaign: '', utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
      hubspotLifecycleStage: '', hubspotDealStage: '',
      createdAt: now, updatedAt: now,
    };
    const analyzed = generateFullAnalysis(newCompany);
    dispatch({ type: 'ADD_COMPANY', payload: analyzed });
    dispatch({ type: 'SET_CURRENT_COMPANY', payload: analyzed.id });
    return analyzed;
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    dispatch({ type: 'UPDATE_COMPANY', payload: { id, updates } });
  }, []);

  const deleteCompany = useCallback((id: string) => {
    dispatch({ type: 'DELETE_COMPANY', payload: id });
  }, []);

  const getCompany = useCallback((id: string): Company | undefined => {
    return state.companies.find(c => c.id === id);
  }, [state.companies]);

  const setCurrentCompany = useCallback((id: string | null) => {
    dispatch({ type: 'SET_CURRENT_COMPANY', payload: id });
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, ...updates } });
  }, [state.settings]);

  const regenerateAnalysis = useCallback((id: string): Company | undefined => {
    const company = state.companies.find(c => c.id === id);
    if (!company) return undefined;
    const analyzed = generateFullAnalysis(company);
    dispatch({ type: 'UPDATE_COMPANY', payload: { id, updates: analyzed } });
    return analyzed;
  }, [state.companies]);

  const getDashboardMetrics = useCallback((): DashboardMetrics => {
    const companies = state.companies;
    let hot = 0, warm = 0, cold = 0, totalScore = 0;
    for (const c of companies) {
      const score = calculateOpportunityScore(c.painPoints);
      if (score >= 70) hot++; else if (score >= 40) warm++; else cold++;
      totalScore += score;
    }
    const sorted = [...companies].sort((a, b) => calculateOpportunityScore(b.painPoints) - calculateOpportunityScore(a.painPoints));
    return {
      totalCompanies: companies.length, hotProspects: hot, warmProspects: warm, coldUnknown: cold,
      averageOpportunityScore: companies.length > 0 ? Math.round(totalScore / companies.length) : 0,
      upcomingFollowups: companies.filter(c => {
        if (!c.crmExport?.followupDate) return false;
        const d = new Date(c.crmExport.followupDate);
        return d >= new Date() && d <= new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      }).length,
      recentAnalyses: [...companies].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
      topTargets: sorted.slice(0, 5),
      exportQueue: 0,
    };
  }, [state.companies]);

  const getOnePageBrief = useCallback((id: string): string => {
    const company = state.companies.find(c => c.id === id);
    return company ? generateOnePageBrief(company) : 'Company not found';
  }, [state.companies]);

  const addPublicIntelSource = useCallback((companyId: string, source: PublicIntelSource) => {
    const c = state.companies.find(x => x.id === companyId);
    if (!c) return;
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelSources: [...(c.publicIntelSources || []), source] } } });
  }, [state.companies]);

  const updatePublicIntelSource = useCallback((companyId: string, sourceId: string, updates: Partial<PublicIntelSource>) => {
    const c = state.companies.find(x => x.id === companyId);
    if (!c) return;
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelSources: (c.publicIntelSources || []).map(s => s.sourceId === sourceId ? { ...s, ...updates } : s) } } });
  }, [state.companies]);

  const deletePublicIntelSource = useCallback((companyId: string, sourceId: string) => {
    const c = state.companies.find(x => x.id === companyId);
    if (!c) return;
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelSources: (c.publicIntelSources || []).filter(s => s.sourceId !== sourceId) } } });
  }, [state.companies]);

  const addPublicIntelSignals = useCallback((companyId: string, signals: PublicIntelSignal[]) => {
    const c = state.companies.find(x => x.id === companyId);
    if (!c) return;
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelSignals: [...(c.publicIntelSignals || []), ...signals] } } });
  }, [state.companies]);

  const addPublicIntelOpenings = useCallback((companyId: string, openings: PublicIntelOpening[]) => {
    const c = state.companies.find(x => x.id === companyId);
    if (!c) return;
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelOpenings: [...(c.publicIntelOpenings || []), ...openings] } } });
  }, [state.companies]);

  const clearPublicIntelForCompany = useCallback((companyId: string) => {
    dispatch({ type: 'UPDATE_COMPANY', payload: { id: companyId, updates: { publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [], publicIntelSummary: undefined } } });
  }, []);

  const addCompany = useCallback((company: Company) => {
    dispatch({ type: 'ADD_COMPANY', payload: company });
  }, []);

  const bulkImportCompanies = useCallback((results: ImportResult[]) => {
    for (const result of results) {
      if (result.action === 'create') {
        dispatch({ type: 'ADD_COMPANY', payload: result.company });
      } else if (result.action === 'update') {
        dispatch({ type: 'UPDATE_COMPANY', payload: { id: result.company.id, updates: result.company } });
      }
      // 'skip' — do nothing
    }
  }, []);

  const value: AppContextType = {
    state, createCompany, updateCompany, deleteCompany, getCompany, setCurrentCompany,
    updateSettings, regenerateAnalysis, getDashboardMetrics, getOnePageBrief,
    addPublicIntelSource, updatePublicIntelSource, deletePublicIntelSource,
    addPublicIntelSignals, addPublicIntelOpenings, clearPublicIntelForCompany,
    addCompany, bulkImportCompanies,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}