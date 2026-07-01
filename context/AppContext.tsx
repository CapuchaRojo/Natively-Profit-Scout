// ============================================================
// AppContext — React Context + localStorage + Supabase Persistence
// ============================================================
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Company, AppSettings, DashboardMetrics, NewAnalysisData, PublicIntelSource, PublicIntelSignal, PublicIntelOpening, AIFactoryChannelSalesRecord } from '../types';
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
  aiFactoryRecords: AIFactoryChannelSalesRecord[];
}

type AppAction =
  | { type: 'SET_COMPANIES'; payload: Company[] }
  | { type: 'ADD_COMPANY'; payload: Company }
  | { type: 'UPDATE_COMPANY'; payload: { id: string; updates: Partial<Company> } }
  | { type: 'DELETE_COMPANY'; payload: string }
  | { type: 'SET_CURRENT_COMPANY'; payload: string | null }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_DB_SYNCED'; payload: boolean }
  | { type: 'SET_AI_FACTORY_RECORDS'; payload: AIFactoryChannelSalesRecord[] }
  | { type: 'ADD_AI_FACTORY_RECORD'; payload: AIFactoryChannelSalesRecord }
  | { type: 'UPDATE_AI_FACTORY_RECORD'; payload: { id: string; updates: Partial<AIFactoryChannelSalesRecord> } }
  | { type: 'DELETE_AI_FACTORY_RECORD'; payload: string };

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
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_DB_SYNCED':
      return { ...state, dbSynced: action.payload };
    case 'SET_AI_FACTORY_RECORDS':
      return { ...state, aiFactoryRecords: action.payload };
    case 'ADD_AI_FACTORY_RECORD':
      return { ...state, aiFactoryRecords: [...state.aiFactoryRecords, action.payload] };
    case 'UPDATE_AI_FACTORY_RECORD': {
      const { id, updates } = action.payload;
      return {
        ...state,
        aiFactoryRecords: state.aiFactoryRecords.map(r =>
          r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
        ),
      };
    }
    case 'DELETE_AI_FACTORY_RECORD':
      return { ...state, aiFactoryRecords: state.aiFactoryRecords.filter(r => r.id !== action.payload) };
    default:
      return state;
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
        aiFactoryRecords: parsed.aiFactoryRecords || createDefaultAIFactoryRecords(),
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
      aiFactoryRecords: createDefaultAIFactoryRecords(),
    };
  } catch {
    return { companies: [], settings: defaultSettings, currentCompanyId: null, dbSynced: false, aiFactoryRecords: createDefaultAIFactoryRecords() };
  }
}

function saveStateToLocal(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      companies: state.companies,
      settings: state.settings,
      currentCompanyId: state.currentCompanyId,
      aiFactoryRecords: state.aiFactoryRecords,
    }));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

// ============================================================
// Defaults
// ============================================================
// ============================================================
// AI Factory Channel Sales — Default Seed Records
// ============================================================

function createDefaultAIFactoryRecords(): AIFactoryChannelSalesRecord[] {
  const now = new Date().toISOString();

  const nvidia: AIFactoryChannelSalesRecord = {
    id: 'ai-factory-nvidia',
    account_name: 'NVIDIA',
    normalized_account_name: 'nvidia',
    segment: 'AI Factory Channel Sales',
    source: 'push_meeting_pawel_ai_factory_channel_sales',
    source_import: 'ai_factory_channel_sales_2026_07',
    channel_angle: 'Position NativelyAI around the AI Factory narrative: Builder as a developer-facing creation layer, Compute as workload execution infrastructure, and Relay / Inference as model access and routing layer for AI-native software.',
    gpu_ecosystem_relevance: 'NVIDIA is strategically relevant because its GPU ecosystem, developer platform, and enterprise AI infrastructure footprint align with Native.Compute, AI workload execution, and partner-led AI software deployment.',
    builder_default_developer_tool_angle: 'Explore whether Native.Builder can be framed as a developer-facing AI-native app creation layer for teams building on top of GPU-enabled infrastructure.',
    compute_relay_relevance: 'Strong relevance for Native.Compute and Native.Relay / Inference through GPU workload execution, model routing, inference access, usage tracking, and cost-aware AI deployment.',
    known_warm_connections: '',
    target_department: 'Developer Relations, AI Platform, Enterprise AI, Partner Ecosystem, Cloud/Infrastructure Partnerships, Startup/Developer Programs.',
    buyer_role_hypothesis: 'DevRel lead, AI infrastructure partner manager, enterprise AI platform leader, GPU cloud ecosystem lead, developer tools partnership lead.',
    natively_lane: 'Multi-lane',
    priority: 'Tier 1',
    owner: 'Adam',
    technical_validator: 'Pawel',
    status: 'Research',
    next_action: 'Research NVIDIA partner programs, developer ecosystem contacts, AI Factory messaging overlap, and possible warm intros through the team.',
    notes: 'High-priority channel-sales target for Pawel\'s AI Factory narrative. Do not outreach until the target angle and warm connection map are reviewed.',
    needs_clarification: false,
    clarification_note: '',
    created_at: now,
    updated_at: now,
    last_checked: now,
  };

  const dell: AIFactoryChannelSalesRecord = {
    id: 'ai-factory-dell',
    account_name: 'Dell',
    normalized_account_name: 'dell',
    segment: 'AI Factory Channel Sales',
    source: 'push_meeting_pawel_ai_factory_channel_sales',
    source_import: 'ai_factory_channel_sales_2026_07',
    channel_angle: 'Position NativelyAI as a complementary AI execution stack for Dell\'s enterprise infrastructure and developer/customer ecosystem: Builder for AI-native app creation, Compute for workload execution, and Relay / Inference for model access and routing.',
    gpu_ecosystem_relevance: 'Dell is relevant through enterprise infrastructure, AI servers, GPU-enabled systems, and customer deployment channels.',
    builder_default_developer_tool_angle: 'Explore Native.Builder as a default or recommended tool for developers and enterprise teams building AI-native internal tools or workflows on Dell-backed AI infrastructure.',
    compute_relay_relevance: 'Strong relevance for Native.Compute and Relay / Inference if Dell customers need workload execution, model routing, usage tracking, and governed AI deployment paths.',
    known_warm_connections: '',
    target_department: 'AI Solutions, Enterprise Infrastructure, Developer/Partner Programs, Channel Partnerships, AI Factory / AI Infrastructure GTM, Customer Innovation.',
    buyer_role_hypothesis: 'AI solutions leader, partner/channel manager, enterprise AI infrastructure lead, customer innovation lead, developer platform ecosystem lead.',
    natively_lane: 'Multi-lane',
    priority: 'Tier 1',
    owner: 'Adam',
    technical_validator: 'Pawel',
    status: 'Research',
    next_action: 'Research Dell AI Factory messaging, partner ecosystem, developer programs, and possible alignment with Builder as a software layer for AI infrastructure customers.',
    notes: 'High-priority channel-sales target. Clarify with Pawel whether Dell means Dell Technologies broadly or a specific Dell AI infrastructure team.',
    needs_clarification: false,
    clarification_note: '',
    created_at: now,
    updated_at: now,
    last_checked: now,
  };

  const hpe: AIFactoryChannelSalesRecord = {
    id: 'ai-factory-hpe',
    account_name: 'Hewlett Packard Enterprise (HPE)',
    normalized_account_name: 'hewlett_packard_enterprise_hpe',
    segment: 'AI Factory Channel Sales',
    source: 'push_meeting_pawel_ai_factory_channel_sales',
    source_import: 'ai_factory_channel_sales_2026_07',
    channel_angle: 'Position NativelyAI around HPE\'s enterprise AI infrastructure ecosystem: Builder for AI-native software creation, Compute for workload execution, and Relay / Inference for routed model access and usage tracking.',
    gpu_ecosystem_relevance: 'HPE is relevant through enterprise infrastructure, hybrid cloud, AI systems, and customer deployment environments.',
    builder_default_developer_tool_angle: 'Explore whether Native.Builder can act as a developer-facing layer for HPE customers building AI-native apps, internal workflows, and governed enterprise tools.',
    compute_relay_relevance: 'Strong relevance for Native.Compute and Relay / Inference in hybrid cloud, enterprise AI workload execution, model routing, and governed infrastructure environments.',
    known_warm_connections: '',
    target_department: 'Hybrid Cloud, AI Infrastructure, Enterprise AI, Partner Ecosystem, Developer Programs, Customer Innovation.',
    buyer_role_hypothesis: 'Hybrid cloud leader, AI infrastructure partner lead, enterprise AI solutions lead, developer ecosystem lead, customer innovation executive.',
    natively_lane: 'Multi-lane',
    priority: 'Tier 1',
    owner: 'Adam',
    technical_validator: 'Pawel',
    status: 'Research',
    next_action: 'Clarify whether Pawel meant HPE, HP Inc., or both. Then research HPE AI infrastructure ecosystem and partner route.',
    notes: 'Likely stronger fit than HP Inc. for Compute/Relay/channel-sales due to enterprise infrastructure relevance, but needs confirmation.',
    needs_clarification: true,
    clarification_note: 'Confirm whether Pawel meant HPE specifically, HP Inc., or both.',
    created_at: now,
    updated_at: now,
    last_checked: now,
  };

  const hpInc: AIFactoryChannelSalesRecord = {
    id: 'ai-factory-hp-inc',
    account_name: 'HP Inc.',
    normalized_account_name: 'hp_inc',
    segment: 'AI Factory Channel Sales',
    source: 'push_meeting_pawel_ai_factory_channel_sales',
    source_import: 'ai_factory_channel_sales_2026_07',
    channel_angle: 'Potential AI PC, developer, and workforce productivity channel angle. Needs clarification because HP Inc. may be less directly aligned with GPU infrastructure than HPE.',
    gpu_ecosystem_relevance: 'Possible relevance through AI PCs, workstations, developer devices, and enterprise customer channels, but less direct Compute/provider relevance than HPE.',
    builder_default_developer_tool_angle: 'Explore whether Native.Builder can be positioned for developers, SMBs, agencies, or internal teams building AI-native software on HP-supported workstations or AI PC ecosystems.',
    compute_relay_relevance: 'Potential Relay / Inference and Builder relevance. Compute relevance needs validation.',
    known_warm_connections: '',
    target_department: 'AI PC, Workstations, Developer Ecosystem, Partner Programs, Enterprise Productivity, Innovation.',
    buyer_role_hypothesis: 'AI PC ecosystem lead, workstation partner manager, developer ecosystem lead, enterprise innovation lead.',
    natively_lane: 'Multi-lane',
    priority: 'Tier 2',
    owner: 'Adam',
    technical_validator: 'Pawel',
    status: 'Research',
    next_action: 'Clarify whether Pawel meant HP Inc. or HPE. Keep this record in Research until clarified.',
    notes: 'Create as draft/review record only. Do not prioritize until clarified.',
    needs_clarification: true,
    clarification_note: 'Confirm whether Pawel meant HP Inc., HPE, or both.',
    created_at: now,
    updated_at: now,
    last_checked: now,
  };

  return [nvidia, dell, hpe, hpInc];
}

// ============================================================
// Defaults
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
  addAIFactoryRecord: (record: AIFactoryChannelSalesRecord) => void;
  updateAIFactoryRecord: (id: string, updates: Partial<AIFactoryChannelSalesRecord>) => void;
  deleteAIFactoryRecord: (id: string) => void;
  setAIFactoryRecords: (records: AIFactoryChannelSalesRecord[]) => void;
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
  // ── AI Factory actions ──

  const addAIFactoryRecord = useCallback((record: AIFactoryChannelSalesRecord) => {
    dispatch({ type: 'ADD_AI_FACTORY_RECORD', payload: record });
  }, []);

  const updateAIFactoryRecord = useCallback((id: string, updates: Partial<AIFactoryChannelSalesRecord>) => {
    dispatch({ type: 'UPDATE_AI_FACTORY_RECORD', payload: { id, updates } });
  }, []);

  const deleteAIFactoryRecord = useCallback((id: string) => {
    dispatch({ type: 'DELETE_AI_FACTORY_RECORD', payload: id });
  }, []);

  const setAIFactoryRecords = useCallback((records: AIFactoryChannelSalesRecord[]) => {
    dispatch({ type: 'SET_AI_FACTORY_RECORDS', payload: records });
  }, []);

  const value: AppContextType = {
    state, createCompany, updateCompany, deleteCompany, getCompany, setCurrentCompany,
    updateSettings, regenerateAnalysis, getDashboardMetrics, getOnePageBrief,
    addPublicIntelSource, updatePublicIntelSource, deletePublicIntelSource,
    addPublicIntelSignals, addPublicIntelOpenings, clearPublicIntelForCompany,
    addCompany, bulkImportCompanies,
    addAIFactoryRecord, updateAIFactoryRecord, deleteAIFactoryRecord, setAIFactoryRecords,
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