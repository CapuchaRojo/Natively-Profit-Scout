// ============================================================
// Pipeline Scout Page (v1.1 — Aggressive Recon Integration)
// ============================================================
import { useState, useMemo } from 'react';
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
import { Radar, Clock } from 'lucide-react';
import type {
  AccountType, ProductLane, PipelineStatus, ProviderType, Company,
  ScoutComment, PipelineDiscoveryCandidate,
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
  { status: 'qualified', label: 'Qualified' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'meeting_booked', label: 'Meeting Booked' },
  { status: 'active_conversation', label: 'Active' },
  { status: 'follow_up_later', label: 'Follow Up' },
  { status: 'not_fit', label: 'Not Fit' },
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

  // Filter companies
  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (filterType !== 'all' && c.accountType !== filterType) return false;
      if (filterLane !== 'all' && c.productLane !== filterLane) return false;
      if (filterStatus !== 'all' && c.pipelineStatus !== filterStatus) return false;
      if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
      if (filterOwner && !(c.owner || '').toLowerCase().includes(filterOwner.toLowerCase())) return false;
      if (filterReconOnly && !c.aggressiveRecon) return false;
      return true;
    });
  }, [companies, filterType, filterLane, filterStatus, filterOwner, filterPriority, filterReconOnly]);

  const selectedAccount = selectedAccountId
    ? companies.find(c => c.id === selectedAccountId)
    : undefined;

  const handleAddAccount = () => {
    if (!newName.trim()) { showToast('⚠️ Company name is required', 'error'); return; }
    const now = new Date().toISOString();
    const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newCompany = {
      id,
      basic: {
        name: newName.trim(),
        website: newWebsite.trim(),
        industry: '',
        location: newRegion.trim(),
        employeeCount: 0,
        revenueEstimate: '',
        notes: newNotes.trim(),
      },
      business: {
        productsServices: '', targetCustomers: '', salesModel: '',
        deliveryModel: '', supportModel: '', operationsModel: '',
      },
      people: {
        leadership: '', salesTeam: '', technicalTeam: '',
        operationsTeam: '', supportTeam: '', financeAdmin: '',
        knownChampions: '', knownBlockers: '', unknownDecisionMaker: '',
      },
      tools: {
        crm: '', websitePlatform: '', schedulingTools: '', emailTools: '',
        projectManagement: '', communicationTools: '', supportTools: '',
        billingTools: '', automationTools: '', aiTools: '', securityTools: '',
        unknownTools: '',
      },
      workloadFriction: {
        dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '',
        employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '',
        softwareCouldAssist: '',
      },
      salesContext: {
        approachReason: '', likelyBusinessPain: '', desiredResult: '',
        budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '',
      },
      painPoints: [], stakeholders: [], toolMap: [], highladerRepurpose: [], opportunities: [],
      publicIntelSources: [], publicIntelSignals: [], publicIntelOpenings: [],
      comments: [],
      accountType: newAccountType,
      productLane: newAccountType === 'compute_provider' ? 'compute' : newProductLane,
      pipelineStatus: 'new' as PipelineStatus,
      owner: newOwner.trim(),
      priority: newPriority as 'high' | 'medium' | 'low' | 'unset',
      nextAction: '',
      nextActionDate: '',
      lastContactedAt: '',
      sourceCampaign: '',
      utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
      hubspotLifecycleStage: '', hubspotDealStage: '',
      providerProfile: newAccountType === 'compute_provider' ? {
        providerType: newProviderType,
        gpuCapacityNotes: '',
        region: newRegion.trim(),
        infrastructureType: '',
        onboardingStage: 'not_started',
        computeFitScore: 0,
        providerPriority: newPriority as 'high' | 'medium' | 'low' | 'unset',
        willemNotes: newNotes.trim(),
        providerSource: 'Manual entry',
        providerEvidenceUrls: newEvidenceUrl.trim() ? [newEvidenceUrl.trim()] : [],
      } : undefined,
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

    showToast(`✅ Added ${newName} to pipeline`, 'success');
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
      case 'client':
        text = generateClientSalesBrief(selectedAccount);
        break;
      case 'provider':
        text = generateProviderBrief(selectedAccount);
        break;
      case 'hubspot':
        text = generateHubspotNote(selectedAccount);
        break;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Copied to clipboard', 'success');
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

  return (
    <div>
      <PageHeader
        title="🎯 Pipeline Scout"
        subtitle="Client & Provider Pipeline Workspace"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Add Account'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDiscovery(!showDiscovery)}>
              🔍 Public Discovery
            </button>
          </div>
        }
      />

      {/* Compliance notice */}
      <div className="card mb-4" style={{ borderColor: '#f59e0b', padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔒 Safe Discovery:</span>{' '}
        Use public websites, public pages, team-provided lists, and pasted public text only.
        This tool does not bypass logins, scrape LinkedIn, read private profiles, or access restricted content.
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '12px 16px' }}>
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
            <input
              className="input"
              style={{ fontSize: 12, width: 120 }}
              placeholder="Owner..."
              value={filterOwner}
              onChange={e => setFilterOwner(e.target.value)}
            />
            <select className="input" style={{ fontSize: 12, width: 110 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="unset">Unset</option>
            </select>
            <label
              className="flex items-center gap-1.5 cursor-pointer"
              style={{ fontSize: 11, color: filterReconOnly ? '#06b6d4' : '#64748b' }}
            >
              <input
                type="checkbox"
                checked={filterReconOnly}
                onChange={e => setFilterReconOnly(e.target.checked)}
                style={{ accentColor: '#06b6d4' }}
              />
              <Radar size={12} />
              Recon ({counts.withRecon})
            </label>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
              {filtered.length} account{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="card mb-4" style={{ borderColor: '#3b82f6' }}>
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>+ Add Account to Pipeline</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Company / Provider Name *</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. CoreWeave" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Website</label>
                <input className="input" value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="https://..." />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Account Type</label>
                <select className="input" value={newAccountType} onChange={e => {
                  setNewAccountType(e.target.value as AccountType);
                  if (e.target.value === 'compute_provider') setNewProductLane('compute');
                }}>
                  {Object.entries(accountTypeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Product Lane</label>
                <select className="input" value={newProductLane} onChange={e => setNewProductLane(e.target.value as ProductLane)}>
                  {Object.entries(productLaneLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {newAccountType === 'compute_provider' && (
                <>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Provider Type</label>
                    <select className="input" value={newProviderType} onChange={e => setNewProviderType(e.target.value as ProviderType)}>
                      {Object.entries(providerTypeLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Region</label>
                    <input className="input" value={newRegion} onChange={e => setNewRegion(e.target.value)} placeholder="e.g. US East, EU" />
                  </div>
                </>
              )}
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Owner</label>
                <input className="input" value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="e.g. Willem, Adam" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Priority</label>
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Notes</label>
              <textarea className="input" rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Any initial notes..." />
            </div>
            <div className="input-group">
              <label className="input-label">Evidence URL</label>
              <input className="input" value={newEvidenceUrl} onChange={e => setNewEvidenceUrl(e.target.value)} placeholder="URL with public info about this account" />
            </div>
            <button className="btn btn-primary" onClick={handleAddAccount} disabled={!newName.trim()}>
              Add to Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Discovery Section */}
      {showDiscovery && (
        <div className="card mb-4" style={{ borderColor: '#8b5cf6' }}>
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>🔍 Public Lead Discovery</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>Safe, public-source-only candidate search</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                className="input"
                style={{ flex: 1, fontSize: 12 }}
                value={discoveryQuery}
                onChange={e => setDiscoveryQuery(e.target.value)}
                placeholder="Search query: GPU provider, SaaS company Austin, cloud partner..."
                onKeyDown={e => e.key === 'Enter' && handleDiscovery()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleDiscovery} disabled={discoveryRunning}>
                {discoveryRunning ? 'Searching...' : 'Discover'}
              </button>
            </div>
            {discoveryCandidates.length > 0 && (
              <div style={{ display: 'grid', gap: 6, maxHeight: 300, overflow: 'auto' }}>
                {discoveryCandidates.map(c => (
                  <div key={c.id} style={{
                    padding: '8px 10px', background: '#0f1525', borderRadius: 4,
                    border: '1px solid #2a3a5c', fontSize: 11,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.name}</span>
                        {c.accountTypeSuggestion !== 'unknown' && (
                          <span className="badge badge-blue" style={{ fontSize: 8, marginLeft: 6 }}>
                            {accountTypeLabels[c.accountTypeSuggestion]}
                          </span>
                        )}
                        {c.productLaneSuggestion !== 'unknown' && (
                          <span className="badge badge-purple" style={{ fontSize: 8, marginLeft: 4 }}>
                            {productLaneLabels[c.productLaneSuggestion]}
                          </span>
                        )}
                      </div>
                      <span className={`badge ${c.confidence === 'High' ? 'badge-green' : c.confidence === 'Medium' ? 'badge-amber' : ''}`} style={{ fontSize: 8 }}>
                        {c.confidence}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{c.reason}</div>
                    {c.evidenceUrls.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {c.evidenceUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#3b82f6', fontSize: 9, textDecoration: 'none', display: 'block' }}>
                            🔗 {url.length > 60 ? url.slice(0, 60) + '...' : url}
                          </a>
                        ))}
                      </div>
                    )}
                    <div style={{ color: '#10b981', fontSize: 10, marginTop: 4 }}>▶ {c.suggestedNextAction}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Board */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
        {/* Main board columns */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <EmptyState>
                  <EmptyStateIcon icon="🎯" />
                  <EmptyStateTitle>No pipeline accounts found</EmptyStateTitle>
                  <EmptyStateDesc>
                    {companies.length === 0
                      ? 'Add your first account using the + Add Account button above.'
                      : 'No accounts match the current filters. Try adjusting them.'}
                  </EmptyStateDesc>
                  {companies.length === 0 && (
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)} style={{ marginTop: 12 }}>
                      + Add Your First Account
                    </button>
                  )}
                </EmptyState>
              </div>
            ) : (
              filtered.map(company => (
                <div
                  key={company.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedAccountId === company.id ? '#3b82f6' : undefined,
                    transition: 'border-color 0.15s',
                  }}
                  onClick={() => setSelectedAccountId(selectedAccountId === company.id ? null : company.id)}
                >
                  <div className="card-body" style={{ padding: '10px 14px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>
                          {company.basic.name}
                        </div>
                        {company.basic.website && (
                          <div style={{ fontSize: 10, color: '#64748b' }} className="truncate">
                            {company.basic.website}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className="badge" style={{
                          fontSize: 8, padding: '1px 5px',
                          background: company.accountType === 'client_lead' ? 'rgba(59,130,246,0.12)' :
                            company.accountType === 'compute_provider' ? 'rgba(245,158,11,0.12)' :
                            company.accountType === 'partner' ? 'rgba(168,85,247,0.12)' :
                            'rgba(100,116,139,0.1)',
                          color: company.accountType === 'client_lead' ? '#3b82f6' :
                            company.accountType === 'compute_provider' ? '#f59e0b' :
                            company.accountType === 'partner' ? '#a855f7' : '#94a3b8',
                        }}>
                          {accountTypeLabels[company.accountType]}
                        </span>
                        <span className="badge" style={{
                          fontSize: 8, padding: '1px 5px',
                          background: company.productLane === 'compute' ? 'rgba(245,158,11,0.12)' :
                            company.productLane === 'relay' ? 'rgba(168,85,247,0.12)' :
                            'rgba(59,130,246,0.1)',
                          color: company.productLane === 'compute' ? '#f59e0b' :
                            company.productLane === 'relay' ? '#a855f7' : '#3b82f6',
                        }}>
                          {productLaneLabels[company.productLane]}
                        </span>
                        {/* Recon badge */}
                        {company.aggressiveRecon && (
                          <span style={{
                            fontSize: 8, padding: '1px 5px',
                            background: 'rgba(6,182,212,0.12)',
                            color: '#06b6d4',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            borderRadius: 3,
                          }} title={`Reconned: ${new Date(company.aggressiveRecon.scannedAt).toLocaleDateString()}`}>
                            <Radar size={8} /> Recon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Status Dropdown */}
                    <div style={{ marginBottom: 6 }}>
                      <select
                        className="input"
                        style={{ fontSize: 11, width: '100%', padding: '3px 6px' }}
                        value={company.pipelineStatus}
                        onChange={e => {
                          e.stopPropagation();
                          handleStatusChange(company.id, e.target.value as PipelineStatus);
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {pipelineStatusColumns.map(col => (
                          <option key={col.status} value={col.status}>{col.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#64748b', flexWrap: 'wrap', marginBottom: 4 }}>
                      {company.owner && <span>👤 {company.owner}</span>}
                      {company.priority !== 'unset' && (
                        <span style={{
                          color: company.priority === 'high' ? '#ef4444' : company.priority === 'medium' ? '#f59e0b' : '#94a3b8',
                        }}>
                          {company.priority === 'high' ? '🔴' : company.priority === 'medium' ? '🟡' : '⚪'} {company.priority}
                        </span>
                      )}
                      {company.fitScore && (
                        <span style={{ color: company.fitScore.total >= 50 ? '#10b981' : '#f59e0b' }}>
                          Score: {company.fitScore.total}
                        </span>
                      )}
                      {/* Recon meta */}
                      {company.aggressiveRecon && (
                        <span style={{
                          color: '#06b6d4',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }} title={`Reconned: ${new Date(company.aggressiveRecon.scannedAt).toLocaleDateString()}`}>
                          <Radar size={10} />
                          {company.aggressiveRecon.extractedPeople?.length || 0}P
                          {' '}
                          {company.aggressiveRecon.linkedInJobs?.length || 0}J
                          {' '}
                          <Clock size={10} />
                          {timeAgo(company.aggressiveRecon.scannedAt)}
                        </span>
                      )}
                    </div>

                    {/* Next action */}
                    {company.nextAction && (
                      <div style={{
                        fontSize: 10, padding: '3px 6px', background: 'rgba(16,185,129,0.06)',
                        borderRadius: 3, color: '#10b981', marginBottom: 4,
                      }}>
                        ▶ {company.nextAction.slice(0, 80)}
                      </div>
                    )}

                    {/* Last updated */}
                    <div style={{ fontSize: 9, color: '#4a5568' }}>
                      Updated: {new Date(company.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Account Detail Sidebar */}
        {selectedAccount && (
          <div style={{
            flex: '0 0 360px', position: 'sticky', top: 12, alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 100px)', overflow: 'auto',
          }}>
            <div className="card">
              <div className="card-header">
                <span className="input-label" style={{ margin: 0 }}>
                  {selectedAccount.basic.name}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedAccountId(null)}
                  style={{ fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
              <div className="card-body" style={{ padding: '12px 14px', fontSize: 12 }}>

                {/* Quick actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${selectedAccount.id}`)}>
                    Full Profile
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleScoreAccount(selectedAccount.id)}>
                    Score Fit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('client')}>
                    Copy Brief
                  </button>
                  {selectedAccount.accountType === 'compute_provider' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('provider')}>
                      Copy Provider Brief
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => handleCopyBrief('hubspot')}>
                    Copy HubSpot Note
                  </button>
                </div>

                {/* ── Aggressive Recon Section (NEW) ── */}
                {selectedAccount.aggressiveRecon && (
                  <div style={{
                    padding: 10, background: 'rgba(6,182,212,0.04)', borderRadius: 4, marginBottom: 12,
                    border: '1px solid rgba(6,182,212,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Radar size={14} style={{ color: '#06b6d4' }} />
                      <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>Aggressive Recon</span>
                      <span style={{ fontSize: 9, color: '#64748b', marginLeft: 'auto' }}>
                        <Clock size={9} className="inline" /> {timeAgo(selectedAccount.aggressiveRecon.scannedAt)}
                      </span>
                    </div>

                    {/* Signal counts */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 10 }}>
                      <span style={{ color: '#10b981' }}>
                        {selectedAccount.aggressiveRecon.extractedPeople?.length || 0} People
                      </span>
                      <span style={{ color: '#06b6d4' }}>
                        {selectedAccount.aggressiveRecon.linkedInJobs?.length || 0} Jobs
                      </span>
                      <span style={{ color: '#3b82f6' }}>
                        {selectedAccount.aggressiveRecon.searchIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0} Signals
                      </span>
                      <span style={{ color: '#f59e0b' }}>
                        {selectedAccount.aggressiveRecon.newsIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0} News
                      </span>
                    </div>

                    {/* People list */}
                    {selectedAccount.aggressiveRecon.extractedPeople?.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>People Found</div>
                        {selectedAccount.aggressiveRecon.extractedPeople.slice(0, 4).map((p, i) => (
                          <div key={i} style={{
                            fontSize: 10, padding: '2px 6px', background: '#0f1525',
                            borderRadius: 3, marginBottom: 2, color: '#e2e8f0',
                          }}>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                            {p.role && <span style={{ color: '#94a3b8' }}> — {p.role}</span>}
                            {p.department && <span style={{ color: '#64748b' }}> ({p.department})</span>}
                          </div>
                        ))}
                        {selectedAccount.aggressiveRecon.extractedPeople.length > 4 && (
                          <div style={{ fontSize: 9, color: '#64748b' }}>
                            +{selectedAccount.aggressiveRecon.extractedPeople.length - 4} more
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jobs list */}
                    {selectedAccount.aggressiveRecon.linkedInJobs?.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>Job Postings</div>
                        {selectedAccount.aggressiveRecon.linkedInJobs.slice(0, 3).map((j, i) => (
                          <div key={i} style={{
                            fontSize: 10, padding: '2px 6px', background: '#0f1525',
                            borderRadius: 3, marginBottom: 2, color: '#e2e8f0',
                          }}>
                            {j.title}
                            {j.department && <span style={{ color: '#64748b' }}> — {j.department}</span>}
                            {j.growthSignal && (
                              <span style={{ color: '#10b981', display: 'block', fontSize: 9 }}>
                                {j.growthSignal}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Top search signals */}
                    {selectedAccount.aggressiveRecon.searchIntel?.some(q => q.signals?.length > 0) && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginBottom: 3 }}>Top Signals</div>
                        {selectedAccount.aggressiveRecon.searchIntel
                          .flatMap(q => q.signals || [])
                          .slice(0, 3)
                          .map((s, i) => (
                            <div key={i} style={{
                              fontSize: 10, padding: '2px 6px', background: '#0f1525',
                              borderRadius: 3, marginBottom: 2, color: '#94a3b8',
                            }}>
                              {s.title}
                              {s.nativelyAngle && (
                                <span style={{ color: '#3b82f6', display: 'block', fontSize: 9 }}>
                                  ▶ {s.nativelyAngle.slice(0, 100)}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Summary */}
                    {selectedAccount.aggressiveRecon.summary && (
                      <div style={{
                        fontSize: 10, color: '#94a3b8', padding: '4px 6px',
                        background: '#0f1525', borderRadius: 3, fontStyle: 'italic',
                        lineHeight: 1.4,
                      }}>
                        {selectedAccount.aggressiveRecon.summary}
                      </div>
                    )}

                    {/* Link to re-run */}
                    <div style={{ marginTop: 8 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, width: '100%', color: '#06b6d4' }}
                        onClick={() => navigate(`/company/${selectedAccount.id}?tab=recon`)}
                      >
                        View Full Recon Report →
                      </button>
                    </div>
                  </div>
                )}

                {/* No recon — prompt */}
                {!selectedAccount.aggressiveRecon && (
                  <div style={{
                    padding: 10, background: 'rgba(6,182,212,0.03)', borderRadius: 4, marginBottom: 12,
                    border: '1px dashed rgba(6,182,212,0.15)', textAlign: 'center',
                  }}>
                    <Radar size={16} style={{ color: '#64748b', marginBottom: 4 }} />
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                      No aggressive recon data yet
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 10, color: '#06b6d4' }}
                      onClick={() => navigate(`/company/${selectedAccount.id}?tab=recon`)}
                    >
                      Run Recon →
                    </button>
                  </div>
                )}

                {/* Fit Score */}
                {selectedAccount.fitScore && (
                  <div style={{
                    padding: 8, background: '#0f1525', borderRadius: 4, marginBottom: 12,
                    border: '1px solid #2a3a5c',
                  }}>
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
                        {selectedAccount.fitScore.reasons.slice(0, 3).map((r, i) => (
                          <div key={i}>• {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Account details */}
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

                {/* Next Action */}
                <div style={{ marginBottom: 12 }}>
                  <span className="input-label" style={{ fontSize: 11 }}>Next Action</span>
                  <input
                    className="input"
                    style={{ fontSize: 11 }}
                    value={selectedAccount.nextAction}
                    onChange={e => updateCompany(selectedAccount.id, { nextAction: e.target.value })}
                    placeholder="e.g. Schedule intro call..."
                  />
                </div>

                {/* Provider-specific info */}
                {selectedAccount.accountType === 'compute_provider' && selectedAccount.providerProfile && (
                  <div style={{
                    padding: 8, background: 'rgba(245,158,11,0.04)', borderRadius: 4, marginBottom: 12,
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}>
                    <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>🔌 Provider Profile</div>
                    <div style={{ fontSize: 10, display: 'grid', gap: 2 }}>
                      <div><span className="text-muted">Type:</span> {providerTypeLabels[selectedAccount.providerProfile.providerType]}</div>
                      <div><span className="text-muted">Region:</span> {selectedAccount.providerProfile.region || '—'}</div>
                      <div><span className="text-muted">Stage:</span> {selectedAccount.providerProfile.onboardingStage || '—'}</div>
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                  <AccountComments
                    comments={selectedAccount.comments || []}
                    accountId={selectedAccount.id}
                    onAddComment={handleAddComment}
                  />
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}