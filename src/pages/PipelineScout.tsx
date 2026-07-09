// ============================================================
// Pipeline Scout Page (v1.3 — Event Import + Bulk Provider Import)
// ============================================================
import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { AccountComments } from '../components/pipeline/AccountComments';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import { scoreClientFit, scoreProviderFit } from '../services/pipelineFitScoring';
import {
  generateDiscoveryCandidates,
  generateClientSalesBrief,
  generateProviderBrief,
  generateHubspotNote,
} from '../services/publicLeadDiscovery';
import {
  Radar, Clock,
  Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, X, ChevronDown, ChevronUp, FileText, BookmarkCheck,
} from 'lucide-react';
import {
  parseWorkbookFile,
  normalizeCompanyName,
  matchExistingCompany,
  transformRowToCompany,
  validateRow,
  computeImportStats,
} from '../services/providerImportParser';
import {
  parseEventMarkdown,
  deduplicateCandidates,
} from '../services/eventMarkdownParser';
import type { ImportResult, ImportStats, ImportWarning } from '../services/providerImportParser';
import type {
  AccountType, ProductLane, PipelineStatus, ProviderType, Company,
  ScoutComment, PipelineDiscoveryCandidate, EventDiscoveryCandidate,
} from '../types';

const accountTypeLabels: Record<AccountType, string> = {
  client_lead: 'Client Lead',
  compute_provider: 'Compute Provider',
  partner: 'Partner',
  internal_target: 'Internal Target',
  unknown: 'Unknown',
};

const productLaneLabels: Record<ProductLane, string> = {
  builder: 'Builder',
  compute: 'Compute',
  relay: 'Relay',
  multiple: 'Multiple',
  unknown: 'Unknown',
};

const pipelineStatusColumns: { status: PipelineStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'researching', label: 'Researching' },
  { status: 'research', label: 'Research' },
  { status: 'qualified', label: 'Qualified' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'meeting', label: 'Meeting' },
  { status: 'meeting_booked', label: 'Meeting Booked' },
  { status: 'active_conversation', label: 'Active' },
  { status: 'nda_diligence', label: 'NDA / Diligence' },
  { status: 'qualified_constituent', label: 'Qualified Constituent' },
  { status: 'follow_up_later', label: 'Follow Up' },
  { status: 'not_fit', label: 'Not Fit' },
  { status: 'monitor', label: 'Monitor' },
  { status: 'converted', label: 'Converted' },
  { status: 'archived', label: 'Archived' },
];

const providerTypeLabels: Record<ProviderType, string> = {
  gpu_provider: 'GPU Provider',
  data_center: 'Data Center',
  cloud_partner: 'Cloud Partner',
  edge_compute: 'Edge Compute',
  hardware_partner: 'Hardware Partner',
  infrastructure_reseller: 'Infra Reseller',
  chip_manufacturer: 'Chip Manufacturer',
  hyperscaler: 'Hyperscaler',
  neo_cloud: 'Neo Cloud',
  unknown: 'Unknown',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatSourceImportLabel(raw: string): string {
  const parts = raw.split('_');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (parts.length >= 5) {
    const year = parts[parts.length - 3];
    const month = parts[parts.length - 2];
    const nameParts = parts.slice(0, parts.length - 3);
    const label = nameParts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const monthNum = parseInt(month, 10);
    const monthLabel = (monthNum >= 1 && monthNum <= 12) ? months[monthNum - 1] : month;
    return `${label} (${monthLabel} ${year})`;
  }
  return raw;
}

export default function PipelineScoutPage() {
  const navigate = useNavigate();
  const { state, updateCompany, addCompany } = useApp();
  const { showToast } = useToast();
  const { companies } = state;

  const [filterType, setFilterType] = useState<AccountType | 'all'>('all');
  const [filterLane, setFilterLane] = useState<ProductLane | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'all'>('all');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterReconOnly, setFilterReconOnly] = useState(false);
  const [filterSourceImport, setFilterSourceImport] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryCandidates, setDiscoveryCandidates] = useState<PipelineDiscoveryCandidate[]>([]);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('client_lead');
  const [newProductLane, setNewProductLane] = useState<ProductLane>('builder');
  const [newProviderType, setNewProviderType] = useState<ProviderType>('unknown');
  const [newRegion, setNewRegion] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newPriority, setNewPriority] = useState<string>('medium');
  const [newNotes, setNewNotes] = useState('');
  const [newEvidenceUrl, setNewEvidenceUrl] = useState('');

  // ── Import state ────────────────────────────────────────────
  const [importMode, setImportMode] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Event Import state ───────────────────────────────────────
  const [eventImportMode, setEventImportMode] = useState(false);
  const [eventMarkdown, setEventMarkdown] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventFile, setEventFile] = useState<File | null>(null);
  const [eventDragOver, setEventDragOver] = useState(false);
  const [eventParsing, setEventParsing] = useState(false);
  const [eventCandidates, setEventCandidates] = useState<EventDiscoveryCandidate[]>([]);
  const [eventProcessing, setEventProcessing] = useState(false);
  const [eventStep, setEventStep] = useState<'paste' | 'parsing' | 'review'>('paste');
  const [eventError, setEventError] = useState<string | null>(null);
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const eventFileInputRef = useRef<HTMLInputElement>(null);

  // ── Research Queue state ────────────────────────────────────
  const [showResearchQueue, setShowResearchQueue] = useState(false);
  const [researchQueueCandidates, setResearchQueueCandidates] = useState<EventDiscoveryCandidate[]>([]);
  const [researchQueueSelectedIds, setResearchQueueSelectedIds] = useState<Set<string>>(new Set());
  const [researchQueueProcessing, setResearchQueueProcessing] = useState(false);

  // Load research queue from localStorage
  const loadResearchQueue = useCallback(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('profit-scout-event-research-queue') || '[]');
      setResearchQueueCandidates(raw);
      return raw.length;
    } catch { return 0; }
  }, []);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    byType: false,
    byPriority: false,
    byOwner: false,
    warnings: true,
  });


  // Source import filter options
  const sourceImportOptions = useMemo(() => {
    const imports = new Set<string>();
    for (const c of companies) {
      if (c.sourceImport) imports.add(c.sourceImport);
    }
    return Array.from(imports).sort();
  }, [companies]);

  // Filter companies
  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (filterType !== 'all' && c.accountType !== filterType) return false;
      if (filterLane !== 'all' && c.productLane !== filterLane) return false;
      if (filterStatus !== 'all' && c.pipelineStatus !== filterStatus) return false;
      if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
      if (filterOwner && !(c.owner || '').toLowerCase().includes(filterOwner.toLowerCase())) return false;
      if (filterReconOnly && !c.aggressiveRecon) return false;
      if (filterSourceImport !== 'all' && c.sourceImport !== filterSourceImport) return false;
      return true;
    });
  }, [companies, filterType, filterLane, filterStatus, filterOwner, filterPriority, filterReconOnly, filterSourceImport]);

  const selectedAccount = selectedAccountId
    ? companies.find(c => c.id === selectedAccountId)
    : undefined;

  // ── Import handlers ─────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImportDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xlsm') || file.name.endsWith('.csv'))) {
      setImportFile(file);
      setImportError(null);
      setImportStep('upload');
    } else {
      setImportError('Please upload a .xlsx, .xlsm, or .csv file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError(null);
      setImportStep('upload');
    }
  };

  const handleProcessImport = async () => {
    if (!importFile) return;
    setImportStep('processing');
    setImportError(null);

    try {
      const rows = await parseWorkbookFile(importFile);
      if (rows.length === 0) {
        setImportError('No data rows found in the "Providers" sheet. Ensure data starts at row 6.');
        setImportStep('upload');
        return;
      }

      const results: ImportResult[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const normalized = normalizeCompanyName(row.company);
        const existing = matchExistingCompany(normalized, companies);
        const { company, action } = transformRowToCompany(row, existing);
        const rawWarnings = validateRow(row, rows);
        const warnings: ImportWarning[] = rawWarnings.map(w => ({ ...w, rowIndex: i + 6 }));
        results.push({ row, company, action, warnings });
      }

      for (const result of results) {
        if (result.action === 'create') addCompany(result.company);
        else if (result.action === 'update') updateCompany(result.company.id, result.company);
      }

      const stats = computeImportStats(results);
      setImportResults(results);
      setImportStats(stats);
      setImportStep('review');
      showToast(`Imported ${stats.created + stats.updated} providers (${stats.warnings} warnings)`, 'success');
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse workbook. Ensure the file has a "Providers" sheet.');
      setImportStep('upload');
    }
  };

  const handleExportWarningsCSV = () => {
    if (!importResults) return;
    const allWarnings = importResults.flatMap(r => r.warnings);
    if (allWarnings.length === 0) return;

    const header = 'Company Name,Warning Type,Field Value';
    const rows = allWarnings.map(w =>
      `"${w.companyName}","${w.warningType}","${w.fieldValue.replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-warnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Warnings CSV downloaded', 'success');
  };

  const handleViewInPipeline = () => {
    setFilterSourceImport('willem_provider_list_2026_06_29');
    setImportMode(false);
    setImportFile(null);
    setImportResults(null);
    setImportStats(null);
    setImportError(null);
    setImportStep('upload');
    showToast('Showing pipeline — filtered to imported providers', 'success');
  };

  const handleDismissImport = () => {
    setImportMode(false);
    setImportFile(null);
    setImportResults(null);
    setImportStats(null);
    setImportError(null);
    setImportStep('upload');
  };

  // ── Review screen computed data ────────────────────────────

  const providersByType = useMemo(() => {
    if (!importResults) return [];
    const map = new Map<string, number>();
    for (const r of importResults) {
      const t = r.company.providerProfile?.providerType || 'unknown';
      map.set(t, (map.get(t) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, label: providerTypeLabels[type as ProviderType] || type }))
      .sort((a, b) => b.count - a.count);
  }, [importResults]);

  const providersByPriority = useMemo(() => {
    if (!importResults) return [];
    const map = new Map<string, number>();
    for (const r of importResults) {
      const p = r.company.priority;
      map.set(p, (map.get(p) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => b.count - a.count);
  }, [importResults]);

  const providersByOwner = useMemo(() => {
    if (!importResults) return [];
    const map = new Map<string, number>();
    for (const r of importResults) {
      const owners = (r.company.owner || 'Unassigned').split(',').map(o => o.trim()).filter(Boolean);
      for (const o of owners) {
        map.set(o, (map.get(o) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count);
  }, [importResults]);

  const allWarnings = useMemo(() => {
    if (!importResults) return [];
    return importResults.flatMap(r => r.warnings);
  }, [importResults]);

  const maxTypeCount = useMemo(() => Math.max(...providersByType.map(t => t.count), 1), [providersByType]);

  // ── Existing handlers ──────────────────────────────────────

  const handleAddAccount = () => {
    if (!newName.trim()) { showToast('Company name is required', 'error'); return; }
    const now = new Date().toISOString();
    const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newCompany = {
      id,
      basic: { name: newName.trim(), website: newWebsite.trim(), industry: '', location: newRegion.trim(), employeeCount: 0, revenueEstimate: '', notes: newNotes.trim() },
      business: { productsServices: '', targetCustomers: '', salesModel: '', deliveryModel: '', supportModel: '', operationsModel: '' },
      people: { leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '', supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '', unknownDecisionMaker: '' },
      tools: { crm: '', websitePlatform: '', schedulingTools: '', emailTools: '', projectManagement: '', communicationTools: '', supportTools: '', billingTools: '', automationTools: '', aiTools: '', securityTools: '', unknownTools: '' },
      workloadFriction: { dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '', employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '', softwareCouldAssist: '' },
      salesContext: { approachReason: '', likelyBusinessPain: '', desiredResult: '', budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '' },
      painPoints: [], stakeholders: [], toolMap: [], highladerRepurpose: [], opportunities: [],
      publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [],
      comments: [],
      accountType: newAccountType,
      productLane: newAccountType === 'compute_provider' ? 'compute' : newProductLane,
      pipelineStatus: 'new' as PipelineStatus,
      owner: newOwner.trim(),
      priority: newPriority as 'high' | 'medium' | 'low' | 'unset',
      nextAction: '', nextActionDate: '', lastContactedAt: '',
      sourceCampaign: '',
      utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
      hubspotLifecycleStage: '', hubspotDealStage: '',
      providerProfile: newAccountType === 'compute_provider' ? {
        providerType: newProviderType,
        gpuCapacityNotes: '', region: newRegion.trim(), infrastructureType: '',
        onboardingStage: 'not_started', computeFitScore: 0,
        providerPriority: newPriority as 'high' | 'medium' | 'low' | 'unset',
        willemNotes: newNotes.trim(), providerSource: 'Manual entry',
        providerEvidenceUrls: newEvidenceUrl.trim() ? [newEvidenceUrl.trim()] : [],
      } : undefined,
      sourceImport: '',
      importedAt: '',
      contacts: [],
      createdAt: now, updatedAt: now,
      isSample: false,
    };

    addCompany(newCompany as Company);

    setTimeout(() => {
      const fit = newAccountType === 'compute_provider'
        ? scoreProviderFit(newCompany as any)
        : scoreClientFit(newCompany as any);
      updateCompany(id, { fitScore: fit });
    }, 100);

    showToast(`Added ${newName} to pipeline`, 'success');
    setShowAddForm(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewName(''); setNewWebsite(''); setNewAccountType('client_lead');
    setNewProductLane('builder'); setNewProviderType('unknown');
    setNewRegion(''); setNewOwner(''); setNewPriority('medium');
    setNewNotes(''); setNewEvidenceUrl('');
  };

  const handleStatusChange = (id: string, status: PipelineStatus) => {
    updateCompany(id, { pipelineStatus: status });
    showToast(`Status updated to ${status.replace(/_/g, ' ')}`, 'success');
  };

  const handleAddComment = (comment: ScoutComment) => {
    if (!selectedAccount) return;
    updateCompany(selectedAccount.id, {
      comments: [...(selectedAccount.comments || []), comment],
    });
    if (comment.nextAction) {
      updateCompany(selectedAccount.id, {
        nextAction: comment.nextAction,
        nextActionDate: comment.nextActionDate || '',
      });
    }
  };

  const handleScoreAccount = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    const fit = company.accountType === 'compute_provider'
      ? scoreProviderFit(company)
      : scoreClientFit(company);
    updateCompany(id, { fitScore: fit });
    showToast(`Scored: ${fit.total}/100 (${fit.confidence})`, 'success');
  };

  const handleDiscovery = () => {
    if (!discoveryQuery.trim()) return;
    setDiscoveryRunning(true);
    const candidates = generateDiscoveryCandidates({
      query: discoveryQuery.trim(),
      accountTypeTarget: filterType !== 'all' ? filterType : undefined,
      productLaneTarget: filterLane !== 'all' ? filterLane : undefined,
    });
    setDiscoveryCandidates(candidates);
    setDiscoveryRunning(false);
    showToast(`Found ${candidates.length} search targets`, 'success');
  };

  const handleCopyBrief = (type: 'client' | 'provider' | 'hubspot') => {
    if (!selectedAccount) return;
    let text = '';
    switch (type) {
      case 'client': text = generateClientSalesBrief(selectedAccount); break;
      case 'provider': text = generateProviderBrief(selectedAccount); break;
      case 'hubspot': text = generateHubspotNote(selectedAccount); break;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard', 'success');
    }).catch(() => showToast('Copy failed', 'error'));
  };

  // Counts
  const counts = useMemo(() => ({
    all: companies.length,
    client_lead: companies.filter(c => c.accountType === 'client_lead').length,
    compute_provider: companies.filter(c => c.accountType === 'compute_provider').length,
    partner: companies.filter(c => c.accountType === 'partner').length,
    internal_target: companies.filter(c => c.accountType === 'internal_target').length,
    withRecon: companies.filter(c => !!c.aggressiveRecon).length,
  }), [companies]);

  // ── Event Import handlers ────────────────────────────────────

  const handleEventFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setEventDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      setEventFile(file);
      setEventError(null);
      // Read file content and fill textarea
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setEventMarkdown(text);
        setEventName(guessEventNameFromFile(file.name));
      };
      reader.readAsText(file);
    } else {
      setEventError('Please upload a .txt or .md file');
    }
  };

  const handleEventFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventFile(file);
      setEventError(null);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setEventMarkdown(text);
        setEventName(guessEventNameFromFile(file.name));
      };
      reader.readAsText(file);
    }
  };

  function guessEventNameFromFile(fileName: string): string {
    return fileName
      .replace(/\.(txt|md)$/i, '')
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const handleParseEventMarkdown = () => {
    if (!eventMarkdown.trim()) return;
    setEventParsing(true);
    setEventError(null);
    setEventStep('parsing');

    try {
      const candidates = parseEventMarkdown(eventMarkdown, eventFile?.name || 'Pasted text');
      const existingNames = companies.map(c => c.basic.name);
      const deduped = deduplicateCandidates(candidates, existingNames);

      setEventCandidates(deduped);
      // Default: select all non-duplicate candidates
      const defaultSelected = new Set(
        deduped.filter(c => !c.matchedExistingCompanyId).map(c => c.id)
      );
      setSelectedForImport(defaultSelected);
      setEventStep('review');
      showToast(`Parsed ${candidates.length} companies from event list`, 'success');
    } catch (err: any) {
      setEventError(err?.message || 'Failed to parse event markdown');
      setEventStep('paste');
    } finally {
      setEventParsing(false);
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedForImport(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    setSelectedForImport(new Set(eventCandidates.map(c => c.id)));
  };

  const handleDeselectAllCandidates = () => {
    setSelectedForImport(new Set());
  };

  const handleUpdateCandidateField = (id: string, field: string, value: string) => {
    setEventCandidates(prev => prev.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleImportSelectedToPipeline = () => {
    const selected = eventCandidates.filter(c => selectedForImport.has(c.id));
    if (selected.length === 0) {
      showToast('No candidates selected for import', 'error');
      return;
    }
    setEventProcessing(true);
    const now = new Date().toISOString();
    let imported = 0;

    for (const candidate of selected) {
      const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${imported}`;
      const sourceTag = `event_${(candidate.eventName || eventName || 'unknown').replace(/\s+/g, '_').toLowerCase()}`;

      const company = {
        id,
        basic: {
          name: candidate.companyName,
          website: candidate.website,
          industry: candidate.industry || '',
          location: '',
          employeeCount: 0,
          revenueEstimate: '',
          notes: [
            candidate.description,
            candidate.extractedPeople.length > 0
              ? `People: ${candidate.extractedPeople.map(p => p.name + (p.role ? ` (${p.role})` : '')).join(', ')}`
              : '',
            candidate.extractedTechStack.length > 0
              ? `Tech: ${candidate.extractedTechStack.join(', ')}`
              : '',
            candidate.editableNotes,
          ].filter(Boolean).join('\n'),
        },
        business: { productsServices: '', targetCustomers: '', salesModel: '', deliveryModel: '', supportModel: '', operationsModel: '' },
        people: { leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '', supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '', unknownDecisionMaker: '' },
        tools: { crm: '', websitePlatform: '', schedulingTools: '', emailTools: '', projectManagement: '', communicationTools: '', supportTools: '', billingTools: '', automationTools: '', aiTools: '', securityTools: '', unknownTools: '' },
        workloadFriction: { dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '', employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '', softwareCouldAssist: '' },
        salesContext: { approachReason: '', likelyBusinessPain: '', desiredResult: '', budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '' },
        painPoints: [], stakeholders: [], toolMap: [], highladerRepurpose: [], opportunities: [],
        publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [],
        comments: [],
        accountType: candidate.suggestedAccountType,
        productLane: candidate.suggestedProductLane,
        pipelineStatus: 'new' as PipelineStatus,
        owner: '',
        priority: candidate.confidence === 'High' ? 'high' as const : 'medium' as const,
        nextAction: '', nextActionDate: '', lastContactedAt: '',
        sourceCampaign: sourceTag,
        utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
        hubspotLifecycleStage: '', hubspotDealStage: '',
        sourceImport: sourceTag,
        importedAt: now,
        contacts: candidate.extractedPeople.map(p => ({
          id: `contact-${id}-${Math.random().toString(36).slice(2, 6)}`,
          firstName: p.name.split(' ')[0] || '',
          lastName: p.name.split(' ').slice(1).join(' ') || '',
          fullName: p.name,
          position: p.role || '',
          email: '',
          phone: '',
          relationshipNote: `From event: ${candidate.eventName || eventName || 'Event list'}`,
          isPrimary: true,
          source: sourceTag,
        })),
        createdAt: now, updatedAt: now,
        isSample: false,
      };

      addCompany(company as Company);
      imported++;
    }

    // Mark imported candidates
    setEventCandidates(prev => prev.map(c =>
      selectedForImport.has(c.id) ? { ...c, status: 'imported' as const } : c
    ));

    setEventProcessing(false);
    showToast(`✅ Imported ${imported} companies from event list to pipeline`, 'success');
  };

  const handleSendToResearchQueue = () => {
    const selected = eventCandidates.filter(c => selectedForImport.has(c.id));
    if (selected.length === 0) {
      showToast('No candidates selected for research queue', 'error');
      return;
    }

    // Persist research queue to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('profit-scout-event-research-queue') || '[]');
      const updated = [
        ...existing,
        ...selected.map(c => ({ ...c, status: 'research_queue' as const, savedAt: new Date().toISOString() })),
      ];
      localStorage.setItem('profit-scout-event-research-queue', JSON.stringify(updated));

      setEventCandidates(prev => prev.map(c =>
        selectedForImport.has(c.id) ? { ...c, status: 'research_queue' as const } : c
      ));
      showToast(`📋 ${selected.length} saved to Research Queue`, 'success');
    } catch {
      showToast('Failed to save research queue', 'error');
    }
  };

  const handleClearEventMarkdown = () => {
    setEventMarkdown('');
    setEventFile(null);
    setEventError(null);
  };

  const handleDismissEventImport = () => {
    setEventImportMode(false);
    setEventMarkdown('');
    setEventName('');
    setEventFile(null);
    setEventCandidates([]);
    setSelectedForImport(new Set());
    setEventError(null);
    setEventStep('paste');
  };

  // ── Research Queue handlers ──────────────────────────────────

  const handleToggleResearchQueueTab = () => {
    const next = !showResearchQueue;
    setShowResearchQueue(next);
    if (next) {
      loadResearchQueue();
      setResearchQueueSelectedIds(new Set());
    }
  };

  const handleToggleRQSelectCandidate = (id: string) => {
    setResearchQueueSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllRQ = () => {
    setResearchQueueSelectedIds(new Set(researchQueueCandidates.map(c => c.id)));
  };

  const handleDeselectAllRQ = () => {
    setResearchQueueSelectedIds(new Set());
  };

  const handleUpdateRQField = (id: string, field: string, value: string) => {
    const updated = researchQueueCandidates.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    );
    setResearchQueueCandidates(updated);
    try {
      localStorage.setItem('profit-scout-event-research-queue', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const handleImportSelectedRQToPipeline = () => {
    const selected = researchQueueCandidates.filter(c => researchQueueSelectedIds.has(c.id));
    if (selected.length === 0) {
      showToast('No candidates selected for import', 'error');
      return;
    }
    setResearchQueueProcessing(true);

    const now = new Date().toISOString();
    let imported = 0;

    for (const candidate of selected) {
      const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-rq-${imported}`;
      const eventName = candidate.eventName || 'Research Queue';
      const sourceTag = `research_queue_${eventName.replace(/\s+/g, '_').toLowerCase()}`;

      const company = {
        id,
        basic: {
          name: candidate.companyName,
          website: candidate.website,
          industry: candidate.industry || '',
          location: '',
          employeeCount: 0,
          revenueEstimate: '',
          notes: [
            candidate.description,
            candidate.extractedPeople.length > 0
              ? `People: ${candidate.extractedPeople.map(p => p.name + (p.role ? ` (${p.role})` : '')).join(', ')}`
              : '',
            candidate.extractedTechStack.length > 0
              ? `Tech: ${candidate.extractedTechStack.join(', ')}`
              : '',
            candidate.editableNotes,
          ].filter(Boolean).join('\n'),
        },
        business: { productsServices: '', targetCustomers: '', salesModel: '', deliveryModel: '', supportModel: '', operationsModel: '' },
        people: { leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '', supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '', unknownDecisionMaker: '' },
        tools: { crm: '', websitePlatform: '', schedulingTools: '', emailTools: '', projectManagement: '', communicationTools: '', supportTools: '', billingTools: '', automationTools: '', aiTools: '', securityTools: '', unknownTools: '' },
        workloadFriction: { dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '', employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '', softwareCouldAssist: '' },
        salesContext: { approachReason: '', likelyBusinessPain: '', desiredResult: '', budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '' },
        painPoints: [], stakeholders: [], toolMap: [], highladerRepurpose: [], opportunities: [],
        publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [],
        comments: [],
        accountType: candidate.suggestedAccountType,
        productLane: candidate.suggestedProductLane,
        pipelineStatus: 'new' as PipelineStatus,
        owner: '',
        priority: candidate.confidence === 'High' ? 'high' as const : 'medium' as const,
        nextAction: '', nextActionDate: '', lastContactedAt: '',
        sourceCampaign: sourceTag,
        utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
        hubspotLifecycleStage: '', hubspotDealStage: '',
        sourceImport: sourceTag,
        importedAt: now,
        contacts: candidate.extractedPeople.map(p => ({
          id: `contact-${id}-${Math.random().toString(36).slice(2, 6)}`,
          firstName: p.name.split(' ')[0] || '',
          lastName: p.name.split(' ').slice(1).join(' ') || '',
          fullName: p.name,
          position: p.role || '',
          email: '',
          phone: '',
          relationshipNote: `From research queue: ${eventName}`,
          isPrimary: true,
          source: sourceTag,
        })),
        createdAt: now, updatedAt: now,
        isSample: false,
      };

      addCompany(company as Company);
      imported++;
    }

    // Mark imported in localStorage
    const updated = researchQueueCandidates.map(c =>
      researchQueueSelectedIds.has(c.id) ? { ...c, status: 'imported' as const } : c
    );
    setResearchQueueCandidates(updated);
    try {
      localStorage.setItem('profit-scout-event-research-queue', JSON.stringify(updated));
    } catch { /* ignore */ }

    setResearchQueueProcessing(false);
    setResearchQueueSelectedIds(new Set());
    showToast(`✅ Imported ${imported} from Research Queue to pipeline`, 'success');
  };

  const handleRemoveSelectedRQ = () => {
    const selected = researchQueueCandidates.filter(c => researchQueueSelectedIds.has(c.id));
    if (selected.length === 0) {
      showToast('No candidates selected for removal', 'error');
      return;
    }

    const updated = researchQueueCandidates.filter(c => !researchQueueSelectedIds.has(c.id));
    setResearchQueueCandidates(updated);
    try {
      localStorage.setItem('profit-scout-event-research-queue', JSON.stringify(updated));
    } catch { /* ignore */ }
    setResearchQueueSelectedIds(new Set());
    showToast(`🗑️ Removed ${selected.length} from Research Queue`, 'success');
  };

  const handleMarkAsActionRQ = (id: string, action: 'imported' | 'skipped') => {
    const updated = researchQueueCandidates.map(c =>
      c.id === id ? { ...c, status: action as any } : c
    );
    setResearchQueueCandidates(updated);
    try {
      localStorage.setItem('profit-scout-event-research-queue', JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCollapsibleHeader = (key: string, label: string, count: number) => (
    <button className="btn btn-ghost btn-sm"
      onClick={() => toggleSection(key)}
      style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px', fontSize: 12, color: '#e2e8f0', cursor: 'pointer' }}>
      <span>{label} ({count})</span>
      {expandedSections[key] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Pipeline Scout"
        subtitle="Client & Provider Pipeline Workspace"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {!importMode && !eventImportMode && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? 'Cancel' : '+ Add Account'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDiscovery(!showDiscovery)}>
                  Public Discovery
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm"
              onClick={() => importMode ? handleDismissImport() : setImportMode(true)}
              style={importMode ? { background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#fff' } : undefined}>
              {importMode ? <><X size={12} /> Close Import</> : <><Upload size={12} /> Import Providers</>}
            </button>
            <button className="btn btn-secondary btn-sm"
              onClick={() => eventImportMode ? handleDismissEventImport() : setEventImportMode(true)}
              style={eventImportMode ? { background: 'linear-gradient(135deg, #06b6d4, #10b981)', color: '#fff' } : undefined}>
              {eventImportMode ? <><X size={12} /> Close Event Import</> : <><FileText size={12} /> Import Event</>}
            </button>
          </div>
        }
      />

      <div className="card mb-4" style={{ borderColor: '#f59e0b', padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Safe Discovery:</span>{' '}
        Use public websites, public pages, team-provided lists, and pasted public text only.
        This tool does not bypass logins, scrape LinkedIn, read private profiles, or access restricted content.
      </div>

      {/* ══════════════ BULK PROVIDER IMPORT MODE ══════════════ */}
      {importMode && (
        <div className="card mb-4" style={{ borderColor: '#3b82f6' }}>
          <div className="card-header">
            <span className="input-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={16} style={{ color: '#3b82f6' }} />
              Bulk Provider Import
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Reads the &ldquo;Providers&rdquo; sheet from Willem&rsquo;s workbook
            </span>
          </div>
          <div className="card-body">

            {importStep === 'upload' && (
              <>
                <div onDragOver={e => { e.preventDefault(); setImportDragOver(true); }}
                  onDragLeave={() => setImportDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${importDragOver ? '#3b82f6' : '#2a3a5c'}`, borderRadius: 8,
                    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: importDragOver ? 'rgba(59,130,246,0.05)' : 'transparent', marginBottom: 16,
                  }}>
                  <Upload size={32} style={{ color: importDragOver ? '#3b82f6' : '#64748b', marginBottom: 8 }} />
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>
                    {importFile ? importFile.name : 'Drop .xlsm/.xlsx file here or click to browse'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Accepts .xlsm, .xlsx, .csv — expects a sheet named <strong style={{ color: '#94a3b8' }}>"Providers"</strong>
                  </div>
                  <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4 }}>
                    Expected format: Company Name in Column A, data starts at row 6
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xlsm,.csv" onChange={handleFileSelect} style={{ display: 'none' }} />
                {importError && (
                  <div style={{ 
                    padding: '10px 14px', 
                    background: 'rgba(239,68,68,0.08)', 
                    border: '1px solid rgba(239,68,68,0.3)', 
                    borderRadius: 6, 
                    color: '#fca5a5', 
                    fontSize: 12, 
                    marginBottom: 12,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {importError}
                  </div>
                )}
                <button className="btn btn-primary" onClick={handleProcessImport} disabled={!importFile} style={{ width: '100%' }}>
                  <FileSpreadsheet size={14} /> Parse & Import Providers
                </button>
              </>
            )}

            {importStep === 'processing' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #2a3a5c', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>Processing workbook...</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{importFile?.name}</div>
              </div>
            )}

            {importStep === 'review' && importStats && importResults && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
                    <CheckCircle size={16} style={{ color: '#10b981', display: 'inline', marginRight: 6 }} />
                    Import Complete
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    <div className="stat-card" style={{ padding: 12 }}><div className="stat-card-label">Total Rows</div><div className="stat-card-value" style={{ fontSize: 22, color: '#e2e8f0' }}>{importStats.totalRows}</div></div>
                    <div className="stat-card" style={{ padding: 12, borderColor: 'rgba(16,185,129,0.3)' }}><div className="stat-card-label">Created</div><div className="stat-card-value" style={{ fontSize: 22, color: '#10b981' }}>{importStats.created}</div></div>
                    <div className="stat-card" style={{ padding: 12, borderColor: 'rgba(59,130,246,0.3)' }}><div className="stat-card-label">Updated</div><div className="stat-card-value" style={{ fontSize: 22, color: '#3b82f6' }}>{importStats.updated}</div></div>
                    <div className="stat-card" style={{ padding: 12 }}><div className="stat-card-label">Contacts</div><div className="stat-card-value" style={{ fontSize: 22, color: '#a855f7' }}>{importStats.contactsCreated}</div></div>
                    <div className="stat-card" style={{ padding: 12, borderColor: importStats.warnings > 0 ? 'rgba(245,158,11,0.3)' : undefined }}>
                      <div className="stat-card-label">{importStats.warnings > 0 && <AlertTriangle size={10} style={{ color: '#f59e0b', display: 'inline', marginRight: 3 }} />} Warnings</div>
                      <div className="stat-card-value" style={{ fontSize: 22, color: importStats.warnings > 0 ? '#f59e0b' : '#10b981' }}>{importStats.warnings}</div>
                    </div>
                    <div className="stat-card" style={{ padding: 12 }}><div className="stat-card-label">Skipped</div><div className="stat-card-value" style={{ fontSize: 22, color: '#64748b' }}>{importStats.skipped}</div></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    {renderCollapsibleHeader('byType', 'Providers by Type', providersByType.length)}
                    {expandedSections.byType && (
                      <div style={{ padding: '0 12px 8px' }}>
                        {providersByType.map(({ type, count, label }) => (
                          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
                            <span style={{ width: 160, color: '#94a3b8' }}>{label}</span>
                            <div style={{ flex: 1, height: 6, background: '#0f1525', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${(count / maxTypeCount) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 3, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ width: 30, textAlign: 'right', color: '#e2e8f0', fontWeight: 600 }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    {renderCollapsibleHeader('byPriority', 'Providers by Priority', providersByPriority.length)}
                    {expandedSections.byPriority && (
                      <div style={{ padding: '0 12px 8px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {providersByPriority.map(({ priority, count }) => (
                          <div key={priority} style={{ padding: '4px 10px', background: '#0f1525', borderRadius: 4, fontSize: 11, color: '#e2e8f0' }}>
                            <span style={{ color: priority === 'high' ? '#ef4444' : priority === 'medium' ? '#f59e0b' : priority === 'low' ? '#94a3b8' : '#64748b' }}>
                              {priority === 'high' ? 'Tier 1' : priority === 'medium' ? 'Tier 2' : priority === 'low' ? 'Tier 3' : 'Unset'}
                            </span>
                            <span style={{ marginLeft: 6, fontWeight: 600 }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    {renderCollapsibleHeader('byOwner', 'Providers by Owner', providersByOwner.length)}
                    {expandedSections.byOwner && (
                      <div style={{ padding: '0 12px 8px' }}>
                        {providersByOwner.map(({ owner, count }) => (
                          <div key={owner} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '2px 0', color: '#94a3b8' }}>
                            <span>{owner}</span>
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    {renderCollapsibleHeader('warnings', allWarnings.length > 0 ? `Validation Warnings (${allWarnings.length})` : 'Validation Warnings', allWarnings.length)}
                    {expandedSections.warnings && (
                      <div style={{ padding: '0 12px 8px', maxHeight: 300, overflow: 'auto' }}>
                        {allWarnings.length === 0 ? (
                          <div style={{ fontSize: 11, color: '#10b981', padding: '8px 0' }}><CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> No warnings — all rows are clean</div>
                        ) : (
                          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                            <thead><tr style={{ borderBottom: '1px solid #2a3a5c' }}>
                              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600 }}>Company</th>
                              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600 }}>Warning</th>
                              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#64748b', fontWeight: 600 }}>Detail</th>
                            </tr></thead>
                            <tbody>
                              {allWarnings.map((w, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(42,58,92,0.4)' }}>
                                  <td style={{ padding: '4px 6px', color: '#e2e8f0' }}>{w.companyName}</td>
                                  <td style={{ padding: '4px 6px' }}>
                                    <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 10, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{w.warningType.replace(/_/g, ' ')}</span>
                                  </td>
                                  <td style={{ padding: '4px 6px', color: '#94a3b8', fontSize: 10 }} className="truncate">{w.fieldValue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleViewInPipeline}>View in Pipeline</button>
                  <button className="btn btn-secondary" onClick={handleDismissImport}>Dismiss</button>
                  {allWarnings.length > 0 && (
                    <button className="btn btn-ghost" onClick={handleExportWarningsCSV} style={{ color: '#f59e0b' }}>
                      <Download size={12} /> Export Warnings CSV
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ EVENT IMPORT MODE ══════════════ */}
      {eventImportMode && !importMode && (
        <div className="card mb-4" style={{ borderColor: '#06b6d4' }}>
          <div className="card-header">
            <span className="input-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} style={{ color: '#06b6d4' }} />
              Event Markdown Import
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Parse .txt/.md files from event attendee/sponsor lists
            </span>
          </div>
          <div className="card-body">

            {eventStep === 'paste' && (
              <>
                {/* File upload area */}
                <div onDragOver={e => { e.preventDefault(); setEventDragOver(true); }}
                  onDragLeave={() => setEventDragOver(false)}
                  onDrop={handleEventFileDrop}
                  onClick={() => eventFileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${eventDragOver ? '#06b6d4' : '#2a3a5c'}`, borderRadius: 8,
                    padding: '30px 20px', textAlign: 'center', cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    background: eventDragOver ? 'rgba(6,182,212,0.05)' : 'transparent', marginBottom: 16,
                  }}>
                  <Upload size={28} style={{ color: eventDragOver ? '#06b6d4' : '#64748b', marginBottom: 6 }} />
                  <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 4 }}>
                    {eventFile ? eventFile.name : 'Drop .txt/.md file here or click to browse'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Accepts .txt or .md files — event attendee lists with <strong style={{ color: '#94a3b8' }}>**Company Name**</strong> format
                  </div>
                </div>
                <input ref={eventFileInputRef} type="file" accept=".txt,.md" onChange={handleEventFileSelect} style={{ display: 'none' }} />

                {/* Event name override */}
                <div className="input-group">
                  <label className="input-label">Event Name (auto-detected, overridable)</label>
                  <input className="input" value={eventName} onChange={e => setEventName(e.target.value)}
                    placeholder="e.g. SXSW 2025, NVIDIA GTC 2026" style={{ fontSize: 12 }} />
                </div>

                {/* Markdown textarea */}
                <div className="input-group">
                  <label className="input-label">Paste Event Markdown / Text</label>
                  {eventFile && (
                    <div style={{ fontSize: 10, color: '#10b981', marginBottom: 4 }}>
                      ✅ File loaded: {eventFile.name} ({Math.round(eventMarkdown.length / 1024)} KB)
                    </div>
                  )}
                  <textarea
                    className="input"
                    rows={12}
                    value={eventMarkdown}
                    onChange={e => setEventMarkdown(e.target.value)}
                    placeholder={`Example format:\n\n**NVIDIA** *https://nvidia.com* [sponsor]\n- World leader in AI computing and GPUs\n- Sarah Chen (VP of Partnerships)\n- Uses: Salesforce, Slack, Datadog\n\n**CoreWeave** *https://coreweave.com* [speaker]\n- GPU cloud provider for AI workloads\n- Mike Jones (CTO)\n\n**Lambda Labs** [scout]\n- Cloud GPU provider ...`}
                    style={{ fontSize: 12 }}
                  />
                </div>

                {eventError && (
                  <div style={{ 
                    padding: '10px 14px', 
                    background: 'rgba(239,68,68,0.08)', 
                    border: '1px solid rgba(239,68,68,0.3)', 
                    borderRadius: 6, 
                    color: '#fca5a5', 
                    fontSize: 12, 
                    marginBottom: 12,
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {eventError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleParseEventMarkdown} disabled={!eventMarkdown.trim() || eventParsing} style={{ flex: 1 }}>
                    <FileText size={14} />
                    {eventParsing ? 'Parsing...' : 'Parse & Extract Companies'}
                  </button>
                  {eventMarkdown && (
                    <button className="btn btn-ghost" onClick={handleClearEventMarkdown} style={{ fontSize: 11 }}>
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}

            {eventStep === 'parsing' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #2a3a5c', borderTopColor: '#06b6d4', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>Parsing event markdown...</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Extracting companies, people, and signals</div>
              </div>
            )}

            {eventStep === 'review' && eventCandidates.length > 0 && (
              <>
                {/* Summary stats */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 12 }}>
                    <CheckCircle size={16} style={{ color: '#10b981', display: 'inline', marginRight: 6 }} />
                    {eventCandidates.length} companies extracted from "{eventName || eventFile?.name || 'Pasted text'}"
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    <div className="stat-card" style={{ padding: 10 }}><div className="stat-card-label">Total Found</div><div className="stat-card-value" style={{ fontSize: 20, color: '#e2e8f0' }}>{eventCandidates.length}</div></div>
                    <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(16,185,129,0.3)' }}><div className="stat-card-label">Selected</div><div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{selectedForImport.size}</div></div>
                    <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(59,130,246,0.3)' }}><div className="stat-card-label">People Found</div><div className="stat-card-value" style={{ fontSize: 20, color: '#3b82f6' }}>{eventCandidates.reduce((s, c) => s + c.extractedPeople.length, 0)}</div></div>
                    <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(6,182,212,0.3)' }}><div className="stat-card-label">Duplicates</div><div className="stat-card-value" style={{ fontSize: 20, color: '#f59e0b' }}>{eventCandidates.filter(c => c.matchedExistingCompanyId).length}</div></div>
                  </div>
                </div>

                {/* Bulk actions */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleSelectAllCandidates} style={{ fontSize: 12 }}>Select All</button>
                  <button className="btn btn-ghost" onClick={handleDeselectAllCandidates} style={{ fontSize: 12 }}>Deselect All</button>
                  <button className="btn btn-primary" onClick={handleImportSelectedToPipeline} disabled={selectedForImport.size === 0 || eventProcessing}
                    style={{ fontSize: 12 }}>
                    {eventProcessing ? 'Importing...' : `Add Selected (${selectedForImport.size}) to Pipeline`}
                  </button>
                  <button className="btn btn-secondary" onClick={handleSendToResearchQueue} disabled={selectedForImport.size === 0}
                    style={{ fontSize: 12 }}>
                    Send to Research Queue
                  </button>
                  <button className="btn btn-ghost" onClick={handleDismissEventImport} style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                    <X size={12} /> Close Import
                  </button>
                </div>

                {/* Candidates grid */}
                <div style={{ maxHeight: 500, overflow: 'auto', display: 'grid', gap: 8 }}>
                  {eventCandidates.map(candidate => (
                    <div key={candidate.id} style={{
                      padding: 12,
                      background: candidate.status === 'imported' ? 'rgba(16,185,129,0.04)' :
                        candidate.status === 'research_queue' ? 'rgba(245,158,11,0.04)' : '#0f1525',
                      borderRadius: 6,
                      border: `1px solid ${candidate.matchedExistingCompanyId ? 'rgba(245,158,11,0.3)' : '#2a3a5c'}`,
                      fontSize: 12,
                      opacity: candidate.status === 'imported' || candidate.status === 'skipped' ? 0.6 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* Checkbox for selection */}
                        {(candidate.status === 'pending' || candidate.status === 'research_queue') && (
                          <input type="checkbox"
                            checked={selectedForImport.has(candidate.id)}
                            onChange={() => handleToggleSelectCandidate(candidate.id)}
                            style={{ marginTop: 2, accentColor: '#06b6d4' }} />
                        )}

                        <div style={{ flex: 1 }}>
                          {/* Company name & badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                            <input className="input" value={candidate.companyName}
                              onChange={e => handleUpdateCandidateField(candidate.id, 'companyName', e.target.value)}
                              style={{ fontSize: 13, fontWeight: 600, padding: '2px 6px', width: 240, border: '1px solid transparent', background: 'transparent', color: '#e2e8f0' }}
                              title="Click to edit company name" />
                            <span className={`badge ${candidate.confidence === 'High' ? 'badge-green' : candidate.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 9 }}>{candidate.confidence}</span>
                            <span className="badge" style={{ fontSize: 9, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{accountTypeLabels[candidate.suggestedAccountType]}</span>
                            {candidate.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: tag === 'scout' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)', color: tag === 'scout' ? '#f59e0b' : '#3b82f6' }}>
                                [{tag}]
                              </span>
                            ))}
                            {candidate.matchedExistingCompanyId && (
                              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                ⚠️ Already in pipeline
                              </span>
                            )}
                            {candidate.status === 'imported' && <span style={{ fontSize: 9, color: '#10b981' }}>✅ Imported</span>}
                            {candidate.status === 'research_queue' && <span style={{ fontSize: 9, color: '#f59e0b' }}>📋 Research Queue</span>}
                          </div>

                          {/* Website */}
                          <div style={{ marginBottom: 4 }}>
                            <input className="input" value={candidate.website}
                              onChange={e => handleUpdateCandidateField(candidate.id, 'website', e.target.value)}
                              placeholder="Website URL..."
                              style={{ fontSize: 11, padding: '2px 6px', width: 300, color: '#3b82f6' }} />
                          </div>

                          {/* Description */}
                          {candidate.description && (
                            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{candidate.description}</div>
                          )}

                          {/* Extracted people */}
                          {candidate.extractedPeople.length > 0 && (
                            <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {candidate.extractedPeople.map((p, i) => (
                                <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
                                  {p.name}{p.role ? ` — ${p.role}` : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Tech stack */}
                          {candidate.extractedTechStack.length > 0 && (
                            <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {candidate.extractedTechStack.map((tech, i) => (
                                <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>{tech}</span>
                              ))}
                            </div>
                          )}

                          {/* Raw bullets (collapsible) */}
                          {candidate.rawBullets.length > 0 && (
                            <details style={{ marginTop: 4 }}>
                              <summary style={{ fontSize: 10, color: '#64748b', cursor: 'pointer' }}>
                                {candidate.rawBullets.length} raw bullet{candidate.rawBullets.length !== 1 ? 's' : ''}
                              </summary>
                              <div style={{ padding: 4, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                                {candidate.rawBullets.map((b, i) => (
                                  <div key={i} style={{ paddingLeft: 8, borderLeft: '2px solid #2a3a5c', marginBottom: 2 }}>{b}</div>
                                ))}
                              </div>
                            </details>
                          )}

                          {/* Editable notes */}
                          <div style={{ marginTop: 4 }}>
                            <textarea className="input" value={candidate.editableNotes}
                              onChange={e => handleUpdateCandidateField(candidate.id, 'editableNotes', e.target.value)}
                              placeholder="Add notes..."
                              rows={1}
                              style={{ fontSize: 10, padding: '3px 6px', resize: 'vertical' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PIPELINE MODE ══════════════ */}
      {!importMode && !eventImportMode && (
        <>
          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body" style={{ padding: '8px 12px' }}>
              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 4, marginBottom: showResearchQueue ? 0 : 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowResearchQueue(false); setSelectedAccountId(null); }}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: !showResearchQueue ? '#06b6d4' : '#64748b',
                    borderBottom: !showResearchQueue ? '2px solid #06b6d4' : '2px solid transparent',
                    borderRadius: 0, padding: '4px 0',
                  }}>
                  <Radar size={13} style={{ marginRight: 4 }} /> Pipeline ({companies.length})
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleToggleResearchQueueTab}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: showResearchQueue ? '#f59e0b' : '#64748b',
                    borderBottom: showResearchQueue ? '2px solid #f59e0b' : '2px solid transparent',
                    borderRadius: 0, padding: '4px 0', marginLeft: 16,
                  }}>
                  <BookmarkCheck size={13} style={{ marginRight: 4 }} /> Research Queue ({researchQueueCandidates.length})
                </button>
              </div>
              {!showResearchQueue && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Filters:</span>
                <select className="input" style={{ fontSize: 12, width: 130 }} value={filterType} onChange={e => setFilterType(e.target.value as AccountType | 'all')}>
                  <option value="all">All Types ({counts.all})</option>
                  <option value="client_lead">Client Leads ({counts.client_lead})</option>
                  <option value="compute_provider">Providers ({counts.compute_provider})</option>
                  <option value="partner">Partners ({counts.partner})</option>
                  <option value="internal_target">Internal ({counts.internal_target})</option>
                </select>
                <select className="input" style={{ fontSize: 12, width: 120 }} value={filterLane} onChange={e => setFilterLane(e.target.value as ProductLane | 'all')}>
                  <option value="all">All Lanes</option>
                  <option value="builder">Builder</option>
                  <option value="compute">Compute</option>
                  <option value="relay">Relay</option>
                  <option value="multiple">Multiple</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select className="input" style={{ fontSize: 12, width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value as PipelineStatus | 'all')}>
                  <option value="all">All Statuses</option>
                  {pipelineStatusColumns.map(col => (
                    <option key={col.status} value={col.status}>{col.label}</option>
                  ))}
                </select>
                <input className="input" style={{ fontSize: 12, width: 120 }} placeholder="Owner..." value={filterOwner} onChange={e => setFilterOwner(e.target.value)} />
                <select className="input" style={{ fontSize: 12, width: 110 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unset">Unset</option>
                </select>
                {sourceImportOptions.length > 0 && (
                  <select className="input" style={{ fontSize: 12, width: 200 }} value={filterSourceImport} onChange={e => setFilterSourceImport(e.target.value)}>
                    <option value="all">All Imports</option>
                    {sourceImportOptions.map(si => (
                      <option key={si} value={si}>{formatSourceImportLabel(si)}</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, color: filterReconOnly ? '#06b6d4' : '#64748b' }}>
                  <input type="checkbox" checked={filterReconOnly} onChange={e => setFilterReconOnly(e.target.checked)} style={{ accentColor: '#06b6d4' }} />
                  <Radar size={12} /> Recon ({counts.withRecon})
                </label>
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
                  {filtered.length} account{filtered.length !== 1 ? 's' : ''}
                </span>
                </div>
              )}
            </div>
          </div>

          {/* Research Queue View */}
          {showResearchQueue && (
            <div className="card mb-4" style={{ borderColor: '#f59e0b' }}>
              <div className="card-header">
                <span className="input-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookmarkCheck size={16} style={{ color: '#f59e0b' }} />
                  Research Queue
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {researchQueueCandidates.length} candidate{researchQueueCandidates.length !== 1 ? 's' : ''} saved for later
                </span>
              </div>
              <div className="card-body">
                {researchQueueCandidates.length === 0 ? (
                  <EmptyState>
                    <EmptyStateIcon icon="&#128203;" />
                    <EmptyStateTitle>Research Queue is empty</EmptyStateTitle>
                    <EmptyStateDesc>
                      When you parse an event attendee list, use &ldquo;Send to Research Queue&rdquo; to save candidates for later review.
                    </EmptyStateDesc>
                  </EmptyState>
                ) : (
                  <>
                    {/* Summary stats */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                        <div className="stat-card" style={{ padding: 10 }}><div className="stat-card-label">Total</div><div className="stat-card-value" style={{ fontSize: 20, color: '#e2e8f0' }}>{researchQueueCandidates.length}</div></div>
                        <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(16,185,129,0.3)' }}>
                          <div className="stat-card-label">Selected</div>
                          <div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{researchQueueSelectedIds.size}</div>
                        </div>
                        <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(245,158,11,0.3)' }}>
                          <div className="stat-card-label">Pending</div>
                          <div className="stat-card-value" style={{ fontSize: 20, color: '#f59e0b' }}>{researchQueueCandidates.filter(c => c.status === 'research_queue' || c.status === 'pending_research').length}</div>
                        </div>
                        <div className="stat-card" style={{ padding: 10, borderColor: 'rgba(16,185,129,0.3)' }}>
                          <div className="stat-card-label">Imported</div>
                          <div className="stat-card-value" style={{ fontSize: 20, color: '#10b981' }}>{researchQueueCandidates.filter(c => c.status === 'imported').length}</div>
                        </div>
                        <div className="stat-card" style={{ padding: 10 }}>
                          <div className="stat-card-label">People</div>
                          <div className="stat-card-value" style={{ fontSize: 20, color: '#3b82f6' }}>{researchQueueCandidates.reduce((s, c) => s + c.extractedPeople.length, 0)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bulk actions */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleSelectAllRQ} style={{ fontSize: 12 }}>Select All</button>
                      <button className="btn btn-ghost" onClick={handleDeselectAllRQ} style={{ fontSize: 12 }}>Deselect All</button>
                      <button className="btn btn-primary" onClick={handleImportSelectedRQToPipeline}
                        disabled={researchQueueSelectedIds.size === 0 || researchQueueProcessing}
                        style={{ fontSize: 12 }}>
                        {researchQueueProcessing ? 'Importing...' : `Add Selected (${researchQueueSelectedIds.size}) to Pipeline`}
                      </button>
                      <button className="btn btn-ghost" onClick={handleRemoveSelectedRQ}
                        disabled={researchQueueSelectedIds.size === 0}
                        style={{ fontSize: 12, color: '#ef4444' }}>
                        <X size={12} /> Remove Selected
                      </button>
                    </div>

                    {/* Candidates grid */}
                    <div style={{ maxHeight: 500, overflow: 'auto', display: 'grid', gap: 8 }}>
                      {researchQueueCandidates.map(candidate => (
                        <div key={candidate.id} style={{
                          padding: 12,
                          background: candidate.status === 'imported' ? 'rgba(16,185,129,0.04)' :
                            candidate.status === 'skipped' ? 'rgba(100,116,139,0.04)' : '#0f1525',
                          borderRadius: 6,
                          border: `1px solid ${candidate.matchedExistingCompanyId ? 'rgba(245,158,11,0.3)' : '#2a3a5c'}`,
                          fontSize: 12,
                          opacity: candidate.status === 'imported' || candidate.status === 'skipped' ? 0.6 : 1,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            {/* Checkbox for selection */}
                            {(candidate.status === 'research_queue' || candidate.status === 'pending_research') && (
                              <input type="checkbox"
                                checked={researchQueueSelectedIds.has(candidate.id)}
                                onChange={() => handleToggleRQSelectCandidate(candidate.id)}
                                style={{ marginTop: 2, accentColor: '#f59e0b' }} />
                            )}

                            <div style={{ flex: 1 }}>
                              {/* Company name & badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                <input className="input" value={candidate.companyName}
                                  onChange={e => handleUpdateRQField(candidate.id, 'companyName', e.target.value)}
                                  style={{ fontSize: 13, fontWeight: 600, padding: '2px 6px', width: 240, border: '1px solid transparent', background: 'transparent', color: '#e2e8f0' }}
                                  title="Click to edit company name" />
                                <span className={`badge ${candidate.confidence === 'High' ? 'badge-green' : candidate.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 9 }}>{candidate.confidence}</span>
                                <span className="badge" style={{ fontSize: 9, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{accountTypeLabels[candidate.suggestedAccountType]}</span>
                                {candidate.eventName && (
                                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{candidate.eventName}</span>
                                )}
                                {candidate.status === 'imported' && <span style={{ fontSize: 9, color: '#10b981' }}>✅ Imported</span>}
                                {candidate.status === 'skipped' && <span style={{ fontSize: 9, color: '#64748b' }}>⏭ Skipped</span>}
                                {candidate.savedAt && (
                                  <span style={{ fontSize: 8, color: '#4a5568' }}>Saved {new Date(candidate.savedAt).toLocaleDateString()}</span>
                                )}
                              </div>

                              {/* Website */}
                              <div style={{ marginBottom: 4 }}>
                                <input className="input" value={candidate.website}
                                  onChange={e => handleUpdateRQField(candidate.id, 'website', e.target.value)}
                                  placeholder="Website URL..."
                                  style={{ fontSize: 11, padding: '2px 6px', width: 300, color: '#3b82f6' }} />
                              </div>

                              {/* Description */}
                              {candidate.description && (
                                <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{candidate.description}</div>
                              )}

                              {/* Extracted people */}
                              {candidate.extractedPeople.length > 0 && (
                                <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {candidate.extractedPeople.map((p, i) => (
                                    <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
                                      {p.name}{p.role ? ` — ${p.role}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Tech stack */}
                              {candidate.extractedTechStack.length > 0 && (
                                <div style={{ marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {candidate.extractedTechStack.map((tech, i) => (
                                    <span key={i} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}>{tech}</span>
                                  ))}
                                </div>
                              )}

                              {/* Raw bullets (collapsible) */}
                              {candidate.rawBullets.length > 0 && (
                                <details style={{ marginTop: 4 }}>
                                  <summary style={{ fontSize: 10, color: '#64748b', cursor: 'pointer' }}>
                                    {candidate.rawBullets.length} raw bullet{candidate.rawBullets.length !== 1 ? 's' : ''}
                                  </summary>
                                  <div style={{ padding: 4, fontSize: 10, color: '#64748b', lineHeight: 1.5 }}>
                                    {candidate.rawBullets.map((b, i) => (
                                      <div key={i} style={{ paddingLeft: 8, borderLeft: '2px solid #2a3a5c', marginBottom: 2 }}>{b}</div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* Editable notes */}
                              <div style={{ marginTop: 4 }}>
                                <textarea className="input" value={candidate.editableNotes}
                                  onChange={e => handleUpdateRQField(candidate.id, 'editableNotes', e.target.value)}
                                  placeholder="Add notes..."
                                  rows={1}
                                  style={{ fontSize: 10, padding: '3px 6px', resize: 'vertical' }} />
                              </div>

                              {/* Per-candidate actions */}
                              {(candidate.status === 'research_queue' || candidate.status === 'pending_research') && (
                                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleMarkAsActionRQ(candidate.id, 'imported')}
                                    style={{ fontSize: 10, color: '#10b981' }}>Mark Imported</button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleMarkAsActionRQ(candidate.id, 'skipped')}
                                    style={{ fontSize: 10, color: '#64748b' }}>Skip</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Add Account Form */}
          {showAddForm && (
            <div className="card mb-4" style={{ borderColor: '#3b82f6' }}>
              <div className="card-header"><span className="input-label" style={{ margin: 0 }}>+ Add Account to Pipeline</span></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group" style={{ margin: 0 }}><label className="input-label">Company / Provider Name *</label><input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. CoreWeave" /></div>
                  <div className="input-group" style={{ margin: 0 }}><label className="input-label">Website</label><input className="input" value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="https://..." /></div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Account Type</label>
                    <select className="input" value={newAccountType} onChange={e => { setNewAccountType(e.target.value as AccountType); if (e.target.value === 'compute_provider') setNewProductLane('compute'); }}>
                      {Object.entries(accountTypeLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Product Lane</label>
                    <select className="input" value={newProductLane} onChange={e => setNewProductLane(e.target.value as ProductLane)}>
                      {Object.entries(productLaneLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                    </select>
                  </div>
                  {newAccountType === 'compute_provider' && (
                    <>
                      <div className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">Provider Type</label>
                        <select className="input" value={newProviderType} onChange={e => setNewProviderType(e.target.value as ProviderType)}>
                          {Object.entries(providerTypeLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                        </select>
                      </div>
                      <div className="input-group" style={{ margin: 0 }}><label className="input-label">Region</label><input className="input" value={newRegion} onChange={e => setNewRegion(e.target.value)} placeholder="e.g. US East, EU" /></div>
                    </>
                  )}
                  <div className="input-group" style={{ margin: 0 }}><label className="input-label">Owner</label><input className="input" value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="e.g. Willem, Adam" /></div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Priority</label>
                    <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                      <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="input-group"><label className="input-label">Notes</label><textarea className="input" rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Any initial notes..." /></div>
                <div className="input-group"><label className="input-label">Evidence URL</label><input className="input" value={newEvidenceUrl} onChange={e => setNewEvidenceUrl(e.target.value)} placeholder="URL with public info about this account" /></div>
                <button className="btn btn-primary" onClick={handleAddAccount} disabled={!newName.trim()}>Add to Pipeline</button>
              </div>
            </div>
          )}

          {/* Discovery Section */}
          {showDiscovery && (
            <div className="card mb-4" style={{ borderColor: '#8b5cf6' }}>
              <div className="card-header"><span className="input-label" style={{ margin: 0 }}>Public Lead Discovery</span><span style={{ fontSize: 11, color: '#64748b' }}>Safe, public-source-only candidate search</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="input" style={{ flex: 1, fontSize: 12 }} value={discoveryQuery} onChange={e => setDiscoveryQuery(e.target.value)}
                    placeholder="Search query: GPU provider, SaaS company Austin, cloud partner..."
                    onKeyDown={e => e.key === 'Enter' && handleDiscovery()} />
                  <button className="btn btn-primary btn-sm" onClick={handleDiscovery} disabled={discoveryRunning}>{discoveryRunning ? 'Searching...' : 'Discover'}</button>
                </div>
                {discoveryCandidates.length > 0 && (
                  <div style={{ display: 'grid', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                    {discoveryCandidates.map(c => (
                      <div key={c.id} style={{ padding: '8px 10px', background: '#0f1525', borderRadius: 4, border: '1px solid #2a3a5c', fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.name}</span>
                            {c.accountTypeSuggestion !== 'unknown' && <span className="badge badge-blue" style={{ fontSize: 8, marginLeft: 6 }}>{accountTypeLabels[c.accountTypeSuggestion]}</span>}
                            {c.productLaneSuggestion !== 'unknown' && <span className="badge badge-purple" style={{ fontSize: 8, marginLeft: 4 }}>{productLaneLabels[c.productLaneSuggestion]}</span>}
                          </div>
                          <span className={`badge ${c.confidence === 'High' ? 'badge-green' : c.confidence === 'Medium' ? 'badge-amber' : ''}`} style={{ fontSize: 8 }}>{c.confidence}</span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{c.reason}</div>
                        {c.evidenceUrls.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {c.evidenceUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: 9, textDecoration: 'none', display: 'block' }}>
                                {url.length > 60 ? url.slice(0, 60) + '...' : url}
                              </a>
                            ))}
                          </div>
                        )}
                        <div style={{ color: '#10b981', fontSize: 10, marginTop: 4 }}>{c.suggestedNextAction}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pipeline Board */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {filtered.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EmptyState>
                      <EmptyStateIcon icon="&#127919;" />
                      <EmptyStateTitle>No pipeline accounts found</EmptyStateTitle>
                      <EmptyStateDesc>
                        {companies.length === 0
                          ? 'Add your first account using the + Add Account button above.'
                          : 'No accounts match the current filters. Try adjusting them.'}
                      </EmptyStateDesc>
                      {companies.length === 0 && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)} style={{ marginTop: 12 }}>+ Add Your First Account</button>
                      )}
                    </EmptyState>
                  </div>
                ) : (
                  filtered.map(company => (
                    <div key={company.id} className="card" style={{ cursor: 'pointer', borderColor: selectedAccountId === company.id ? '#3b82f6' : undefined, transition: 'border-color 0.15s' }}
                      onClick={() => setSelectedAccountId(selectedAccountId === company.id ? null : company.id)}>
                      <div className="card-body" style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{company.basic.name}</div>
                            {company.basic.website && <div style={{ fontSize: 10, color: '#64748b' }} className="truncate">{company.basic.website}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span className="badge" style={{ fontSize: 8, padding: '1px 5px',
                              background: company.accountType === 'client_lead' ? 'rgba(59,130,246,0.12)' : company.accountType === 'compute_provider' ? 'rgba(245,158,11,0.12)' : company.accountType === 'partner' ? 'rgba(168,85,247,0.12)' : 'rgba(100,116,139,0.1)',
                              color: company.accountType === 'client_lead' ? '#3b82f6' : company.accountType === 'compute_provider' ? '#f59e0b' : company.accountType === 'partner' ? '#a855f7' : '#94a3b8',
                            }}>{accountTypeLabels[company.accountType]}</span>
                            <span className="badge" style={{ fontSize: 8, padding: '1px 5px',
                              background: company.productLane === 'compute' ? 'rgba(245,158,11,0.12)' : company.productLane === 'relay' ? 'rgba(168,85,247,0.12)' : 'rgba(59,130,246,0.1)',
                              color: company.productLane === 'compute' ? '#f59e0b' : company.productLane === 'relay' ? '#a855f7' : '#3b82f6',
                            }}>{productLaneLabels[company.productLane]}</span>
                            {company.sourceImport && (
                              <span style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', borderRadius: 3 }} title={`Imported: ${company.sourceImport}`}>&#8595;</span>
                            )}
                            {company.aggressiveRecon && (
                              <span style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(6,182,212,0.12)', color: '#06b6d4', display: 'inline-flex', alignItems: 'center', gap: 2, borderRadius: 3 }}
                                title={`Reconned: ${new Date(company.aggressiveRecon.scannedAt).toLocaleDateString()}`}><Radar size={8} /> Recon</span>
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <select className="input" style={{ fontSize: 11, width: '100%', padding: '3px 6px' }}
                            value={company.pipelineStatus}
                            onChange={e => { e.stopPropagation(); handleStatusChange(company.id, e.target.value as PipelineStatus); }}
                            onClick={e => e.stopPropagation()}>
                            {pipelineStatusColumns.map(col => (<option key={col.status} value={col.status}>{col.label}</option>))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#64748b', flexWrap: 'wrap', marginBottom: 4 }}>
                          {company.owner && <span>{company.owner}</span>}
                          {company.priority !== 'unset' && <span style={{ color: company.priority === 'high' ? '#ef4444' : company.priority === 'medium' ? '#f59e0b' : '#94a3b8' }}>{company.priority}</span>}
                          {company.fitScore && <span style={{ color: company.fitScore.total >= 50 ? '#10b981' : '#f59e0b' }}>Score: {company.fitScore.total}</span>}
                          {company.aggressiveRecon && (
                            <span style={{ color: '#06b6d4', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              title={`Reconned: ${new Date(company.aggressiveRecon.scannedAt).toLocaleDateString()}`}>
                              <Radar size={10} />{company.aggressiveRecon.extractedPeople?.length || 0}P {company.aggressiveRecon.linkedInJobs?.length || 0}J <Clock size={10} />{timeAgo(company.aggressiveRecon.scannedAt)}
                            </span>
                          )}
                        </div>
                        {company.nextAction && (
                          <div style={{ fontSize: 10, padding: '3px 6px', background: 'rgba(16,185,129,0.06)', borderRadius: 3, color: '#10b981', marginBottom: 4 }}>
                            {company.nextAction.slice(0, 80)}
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: '#4a5568' }}>Updated: {new Date(company.updatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Account Detail Sidebar */}
            {selectedAccount && (
              <div style={{ flex: '0 0 360px', position: 'sticky', top: 12, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 100px)', overflow: 'auto' }}>
                <div className="card">
                  <div className="card-header">
                    <span className="input-label" style={{ margin: 0 }}>{selectedAccount.basic.name}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAccountId(null)} style={{ fontSize: 14 }}><X size={14} /></button>
                  </div>
                  <div className="card-body" style={{ padding: '12px 14px', fontSize: 12 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${selectedAccount.id}`)}>Full Profile</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleScoreAccount(selectedAccount.id)}>Score Fit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('client')}>Copy Brief</button>
                      {selectedAccount.accountType === 'compute_provider' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('provider')}>Copy Provider Brief</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('hubspot')}>Copy HubSpot Note</button>
                    </div>

                    {selectedAccount.aggressiveRecon && (
                      <div style={{ padding: 10, background: 'rgba(6,182,212,0.04)', borderRadius: 4, marginBottom: 12, border: '1px solid rgba(6,182,212,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Radar size={14} style={{ color: '#06b6d4' }} />
                          <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>Aggressive Recon</span>
                          <span style={{ fontSize: 9, color: '#64748b', marginLeft: 'auto' }}><Clock size={9} /> {timeAgo(selectedAccount.aggressiveRecon.scannedAt)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 10 }}>
                          <span style={{ color: '#10b981' }}>{selectedAccount.aggressiveRecon.extractedPeople?.length || 0} People</span>
                          <span style={{ color: '#06b6d4' }}>{selectedAccount.aggressiveRecon.linkedInJobs?.length || 0} Jobs</span>
                          <span style={{ color: '#3b82f6' }}>{selectedAccount.aggressiveRecon.searchIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0} Signals</span>
                          <span style={{ color: '#f59e0b' }}>{selectedAccount.aggressiveRecon.newsIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0} News</span>
                        </div>
                        {selectedAccount.aggressiveRecon.extractedPeople?.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>People Found</div>
                            {selectedAccount.aggressiveRecon.extractedPeople.slice(0, 4).map((p, i) => (
                              <div key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#0f1525', borderRadius: 3, marginBottom: 2, color: '#e2e8f0' }}>
                                <span style={{ fontWeight: 500 }}>{p.name}</span>
                                {p.role && <span style={{ color: '#94a3b8' }}> — {p.role}</span>}
                                {p.department && <span style={{ color: '#64748b' }}> ({p.department})</span>}
                              </div>
                            ))}
                            {selectedAccount.aggressiveRecon.extractedPeople.length > 4 && <div style={{ fontSize: 9, color: '#64748b' }}>+{selectedAccount.aggressiveRecon.extractedPeople.length - 4} more</div>}
                          </div>
                        )}
                        {selectedAccount.aggressiveRecon.linkedInJobs?.length > 0 && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>Job Postings</div>
                            {selectedAccount.aggressiveRecon.linkedInJobs.slice(0, 3).map((j, i) => (
                              <div key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#0f1525', borderRadius: 3, marginBottom: 2, color: '#e2e8f0' }}>
                                {j.title}{j.department && <span style={{ color: '#64748b' }}> — {j.department}</span>}
                                {j.growthSignal && <span style={{ color: '#10b981', display: 'block', fontSize: 9 }}>{j.growthSignal}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedAccount.aggressiveRecon.searchIntel?.some(q => q.signals?.length > 0) && (
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>Top Signals</div>
                            {selectedAccount.aggressiveRecon.searchIntel.flatMap(q => q.signals || []).slice(0, 3).map((s, i) => (
                              <div key={i} style={{ fontSize: 10, padding: '2px 6px', background: '#0f1525', borderRadius: 3, marginBottom: 2, color: '#94a3b8' }}>
                                {s.title}{s.nativelyAngle && <span style={{ color: '#3b82f6', display: 'block', fontSize: 9 }}>{s.nativelyAngle.slice(0, 100)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedAccount.aggressiveRecon.summary && (
                          <div style={{ fontSize: 10, color: '#94a3b8', padding: '4px 6px', background: '#0f1525', borderRadius: 3, fontStyle: 'italic', lineHeight: 1.4 }}>{selectedAccount.aggressiveRecon.summary}</div>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, width: '100%', color: '#06b6d4' }} onClick={() => navigate(`/company/${selectedAccount.id}?tab=recon`)}>View Full Recon Report</button>
                        </div>
                      </div>
                    )}

                    {!selectedAccount.aggressiveRecon && (
                      <div style={{ padding: 10, background: 'rgba(6,182,212,0.03)', borderRadius: 4, marginBottom: 12, border: '1px dashed rgba(6,182,212,0.15)', textAlign: 'center' }}>
                        <Radar size={16} style={{ color: '#64748b', marginBottom: 4 }} />
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>No aggressive recon data yet</div>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: '#06b6d4' }} onClick={() => navigate(`/company/${selectedAccount.id}?tab=recon`)}>Run Recon</button>
                      </div>
                    )}

                    {selectedAccount.fitScore && (
                      <div style={{ padding: 8, background: '#0f1525', borderRadius: 4, marginBottom: 12, border: '1px solid #2a3a5c' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>Fit Score</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                          <div><span className="text-muted">Total:</span> {selectedAccount.fitScore.total}/100 ({selectedAccount.fitScore.confidence})</div>
                          <div><span className="text-muted">Builder:</span> {selectedAccount.fitScore.builderFit}</div>
                          <div><span className="text-muted">Compute:</span> {selectedAccount.fitScore.computeFit}</div>
                          <div><span className="text-muted">Relay:</span> {selectedAccount.fitScore.relayFit}</div>
                          <div><span className="text-muted">Provider:</span> {selectedAccount.fitScore.providerFit}</div>
                        </div>
                        {selectedAccount.fitScore.reasons.length > 0 && (
                          <div style={{ marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
                            {selectedAccount.fitScore.reasons.slice(0, 3).map((r, i) => <div key={i}>* {r}</div>)}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 11 }}>
                        <div><span className="text-muted">Type:</span> {accountTypeLabels[selectedAccount.accountType]}</div>
                        <div><span className="text-muted">Lane:</span> {productLaneLabels[selectedAccount.productLane]}</div>
                        <div><span className="text-muted">Status:</span> {selectedAccount.pipelineStatus.replace(/_/g, ' ')}</div>
                        <div><span className="text-muted">Owner:</span> {selectedAccount.owner || '—'}</div>
                        <div><span className="text-muted">Priority:</span> {selectedAccount.priority}</div>
                        <div><span className="text-muted">Website:</span> {selectedAccount.basic.website || '—'}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <span className="input-label" style={{ fontSize: 11 }}>Next Action</span>
                      <input className="input" style={{ fontSize: 11 }} value={selectedAccount.nextAction}
                        onChange={e => updateCompany(selectedAccount.id, { nextAction: e.target.value })} placeholder="e.g. Schedule intro call..." />
                    </div>

                    {selectedAccount.accountType === 'compute_provider' && selectedAccount.providerProfile && (
                      <div style={{ padding: 8, background: 'rgba(245,158,11,0.04)', borderRadius: 4, marginBottom: 12, border: '1px solid rgba(245,158,11,0.15)' }}>
                        <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>Provider Profile</div>
                        <div style={{ fontSize: 10, display: 'grid', gap: 2 }}>
                          <div><span className="text-muted">Type:</span> {providerTypeLabels[selectedAccount.providerProfile.providerType]}</div>
                          <div><span className="text-muted">Region:</span> {selectedAccount.providerProfile.region || '—'}</div>
                          <div><span className="text-muted">Stage:</span> {selectedAccount.providerProfile.onboardingStage || '—'}</div>
                        </div>
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                      <AccountComments comments={selectedAccount.comments || []} accountId={selectedAccount.id} onAddComment={handleAddComment} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
