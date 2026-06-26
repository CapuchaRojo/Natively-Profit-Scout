// ============================================================
// Public Intel Scanner — v0.2 Feature Layer
// Frontend-safe, ethical, public intel analysis
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLinkedInCompanyViaBackend } from '../services/reconApiClient';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import {
  fetchPublicPageText, createPublicIntelSource,
  analyzePublicText, generateOpeningsFromSignals,
  extractToolMentions, extractStakeholderMentions,
  cleanHtmlToText,
} from '../services/publicIntelEngine';
import type {
  PublicIntelSource, PublicIntelSignal, PublicIntelOpening,
  SourceType, SourceStatus, ConfidenceLevel,
} from '../types';

type TabType = 'sources' | 'signals' | 'openings' | 'linkedin';

const sourceTypeLabels: Record<string, string> = {
  company_homepage: 'Homepage', about_page: 'About', services_products_page: 'Services/Products',
  pricing_page: 'Pricing', careers_page: 'Careers', blog_news_page: 'Blog/News',
  contact_page: 'Contact', other_url: 'Other URL', linkedin_notes: 'LinkedIn Notes',
  manual_paste: 'Manual Paste', user_notes: 'User Notes',
};

const statusColors: Record<string, string> = {
  pending: '#64748b', fetched: '#3b82f6', pasted: '#8b5cf6', analyzed: '#10b981', failed: '#ef4444',
};

const signalCategoryLabels: Record<string, string> = {
  growth_signal: 'Growth', hiring_signal: 'Hiring', tech_stack_signal: 'Tech Stack',
  sales_motion_signal: 'Sales Motion', support_burden_signal: 'Support Burden',
  manual_workflow_signal: 'Manual Workflow', compliance_security_signal: 'Compliance/Security',
  expansion_signal: 'Expansion', funding_revenue_signal: 'Funding/Revenue',
  partnership_signal: 'Partnership', customer_pain_signal: 'Customer Pain',
  market_positioning_signal: 'Market Positioning', decision_maker_signal: 'Decision Maker',
  outreach_opening_signal: 'Outreach Opening',
};

const categoryColors: Record<string, string> = {
  growth_signal: 'green', hiring_signal: 'blue', tech_stack_signal: 'purple',
  sales_motion_signal: 'amber', support_burden_signal: 'red',
  manual_workflow_signal: 'amber', compliance_security_signal: 'red',
  expansion_signal: 'green', funding_revenue_signal: 'green',
  partnership_signal: 'blue', customer_pain_signal: 'red',
  market_positioning_signal: 'blue', decision_maker_signal: 'purple',
  outreach_opening_signal: 'green',
};

export default function PublicIntelPage() {
  const navigate = useNavigate();
  const { state, addPublicIntelSource, updatePublicIntelSource, deletePublicIntelSource, addPublicIntelSignals, addPublicIntelOpenings, updateCompany } = useApp();
  const { companies, currentCompanyId } = state;
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompanyId || companies[0]?.id || '');
  const [tab, setTab] = useState<TabType>('sources');
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({
    company_homepage: '', about_page: '', services_products_page: '', pricing_page: '',
    careers_page: '', blog_news_page: '', contact_page: '', other_url: '',
  });
  const [pastedText, setPastedText] = useState('');
  const [linkedinNotes, setLinkedinNotes] = useState('');
  const [fetching, setFetching] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fetchingLinkedIn, setFetchingLinkedIn] = useState(false);
  const [linkedInFetchError, setLinkedInFetchError] = useState<string | null>(null);

  const company = companies.find(c => c.id === selectedCompanyId);
  const sources = company?.publicIntelSources || [];
  const signals = company?.publicIntelSignals || [];
  const openings = company?.publicIntelOpenings || [];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleFetchUrl = async (sourceType: SourceType) => {
    const url = urlInputs[sourceType]?.trim();
    if (!url || !company) return;
    setFetching(sourceType);
    const result = await fetchPublicPageText(url);
    if (result.success) {
      const source = createPublicIntelSource(company.id, sourceType, url, sourceTypeLabels[sourceType] || 'Unknown', result.text, '');
      const updatedSource = { ...source, status: 'fetched' as SourceStatus };
      addPublicIntelSource(company.id, updatedSource);
      showToast('✅ Fetched: ' + (sourceTypeLabels[sourceType] || url));
    } else {
      const source = createPublicIntelSource(company.id, sourceType, url, sourceTypeLabels[sourceType] || 'Unknown', result.text || '', result.error || '');
      const failedSource = { ...source, status: 'failed' as SourceStatus, notes: result.error || 'Fetch failed' };
      addPublicIntelSource(company.id, failedSource);
      if (result.error?.includes('CORS')) {
        showToast('⚠️ CORS blocked — paste text manually');
      } else {
        showToast('❌ ' + (result.error || 'Fetch failed'));
      }
    }
    setFetching(null);
  };

  const handlePasteText = (sourceType: SourceType) => {
    if (!company) return;
    const text = sourceType === 'linkedin_notes' ? linkedinNotes : pastedText;
    if (!text?.trim()) { showToast('⚠️ Paste some text first'); return; }
    const title = sourceType === 'linkedin_notes' ? 'LinkedIn Intelligence Notes' : 'Manually Pasted Text';
    const source = createPublicIntelSource(company.id, sourceType, '', title, text);
    const pastedSource = { ...source, status: 'pasted' as SourceStatus };
    addPublicIntelSource(company.id, pastedSource);
    showToast('📋 ' + title + ' added');
    if (sourceType === 'linkedin_notes') setLinkedinNotes('');
    else setPastedText('');
  };

  const handleAnalyze = (sourceId: string) => {
    if (!company) return;
    setAnalyzing(sourceId);
    const source = sources.find(s => s.sourceId === sourceId);
    if (!source || !source.rawText) { showToast('⚠️ No text to analyze'); setAnalyzing(null); return; }
    const { signals: newSignals, updatedSource } = analyzePublicText(source);
    updatePublicIntelSource(company.id, sourceId, updatedSource);
    addPublicIntelSignals(company.id, newSignals);
    showToast('🔍 Found ' + newSignals.length + ' signal(s)');
    setAnalyzing(null);
  };

  const handleGenerateOpenings = () => {
    if (!company || signals.length === 0) { showToast('⚠️ Analyze sources first'); return; }
    const newOpenings = generateOpeningsFromSignals(signals, company);
    addPublicIntelOpenings(company.id, newOpenings);
    showToast('💡 Generated ' + newOpenings.length + ' opening(s)');
  };

  const handleApplyToPainPoints = () => {
    if (!company || signals.length === 0) return;
    const painSignals = signals.filter(s => s.possiblePainPoint);
    const newPains = painSignals.slice(0, 5).map(s => ({
      id: 'pub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: s.title.length > 60 ? s.title.slice(0, 60) + '...' : s.title,
      department: 'operations' as const,
      symptoms: s.evidence || s.possiblePainPoint,
      likelyCost: 'Identified through public intel',
      timeLost: 'Needs discovery',
      revenueImpact: 'Needs discovery',
      automationOpportunity: s.nativelyOpportunity,
      suggestedSolution: s.nativelyOpportunity,
      confidence: s.confidence as ConfidenceLevel,
      discoveryQuestion: s.discoveryQuestion,
      severity: s.confidence === 'High' ? 4 : 3,
      frequency: 3,
      revenueImpactScore: 3,
      easeOfSolution: 3,
      decisionMakerVisibility: 2,
    }));
    updateCompany(company.id, { painPoints: [...(company.painPoints || []), ...newPains] });
    showToast('✅ Added ' + newPains.length + ' pain point(s) from public intel');
  };

  const handleApplyToOpportunities = () => {
    if (!company || openings.length === 0) return;
    const newOpps = openings.slice(0, 5).map(o => ({
      id: 'opp-pub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      title: o.title.length > 80 ? o.title.slice(0, 80) + '...' : o.title,
      businessProblem: o.sourceSignal,
      whoFeelsPain: o.whoToApproach,
      whoPaysForFix: 'Company leadership',
      proposedSolution: o.suggestedNativelyDemo,
      nativelyBuildIdea: o.suggestedNativelyDemo,
      requiredFeatures: 'To be determined during discovery',
      estimatedComplexity: 'Medium' as const,
      estimatedBusinessValue: o.confidence === 'High' ? 'High' as const : 'Medium' as const,
      suggestedDemoAngle: o.suggestedNativelyDemo,
      suggestedBuildPrompt: 'Build: ' + o.suggestedNativelyDemo,
      discoveryQuestions: o.suggestedDiscoveryQuestion,
      proofNeeded: 'Client case study in similar industry',
      closeStrategy: 'Start with discovery conversation based on public intel opening',
      opportunityType: 'custom' as const,
    }));
    updateCompany(company.id, { opportunities: [...(company.opportunities || []), ...newOpps] });
    showToast('✅ Added ' + newOpps.length + ' opportunity(ies) from public intel');
  };

  const handleExtractTools = () => {
    if (!company) return;
    const allText = sources.map(s => s.rawText).join(' ');
    const tools = extractToolMentions(allText);
    const workflows = ['booking', 'onboarding', 'intake', 'tickets', 'quotes', 'scheduling', 'dispatch', 'approvals', 'reporting', 'compliance', 'training', 'follow-up', 'lead routing', 'CRM', 'customer portal']
      .filter(w => allText.toLowerCase().includes(w));
    showToast('🔧 Found ' + tools.length + ' tool(s), ' + workflows.length + ' workflow clue(s)');
  };

  const handleExtractStakeholders = () => {
    if (!company) return;
    const allText = sources.map(s => s.rawText).join(' ');
    const mentions = extractStakeholderMentions(allText);
    if (mentions.length > 0) {
      showToast('👤 Found ' + mentions.length + ' stakeholder mention(s)');
    } else {
      showToast('ℹ️ No stakeholder mentions found in text');
    }
  };

  const handleDeleteSource = (sourceId: string) => {
    if (!company) return;
    deletePublicIntelSource(company.id, sourceId);
    showToast('🗑️ Source removed');
  };

  return (
    <div>
      <PageHeader
        title="🌐 Public Intel Scanner"
        subtitle="Gather and analyze public business intelligence"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="input"
              style={{ width: 200 }}
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Select a company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.basic.name}</option>
              ))}
            </select>
            {company && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/company/' + company.id)}>
                View Profile →
              </button>
            )}
          </div>
        }
      />

      {!company ? (
        <EmptyState>
          <EmptyStateIcon icon="🔍" />
          <EmptyStateTitle>Select a Company</EmptyStateTitle>
          <EmptyStateDesc>Choose a company from the dropdown above to start scanning public intelligence.</EmptyStateDesc>
        </EmptyState>
      ) : (
        <div>
          <div className="card mb-4" style={{ borderColor: '#f59e0b', padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>🔒 Compliance Notice:</span>{' '}
            All data is sourced from public websites or user-provided text. No automated LinkedIn scraping.
            No paywall bypass. No personal data harvesting. Labels: Public / User Provided / Assumed.
          </div>

          <div className="tabs">
            <div className={`tab ${tab === 'sources' ? 'active' : ''}`} onClick={() => setTab('sources')}>
              📡 Sources ({sources.length})
            </div>
            <div className={`tab ${tab === 'signals' ? 'active' : ''}`} onClick={() => setTab('signals')}>
              📊 Signals ({signals.length})
            </div>
            <div className={`tab ${tab === 'openings' ? 'active' : ''}`} onClick={() => setTab('openings')}>
              💡 Openings ({openings.length})
            </div>
            <div className={`tab ${tab === 'linkedin' ? 'active' : ''}`} onClick={() => setTab('linkedin')}>
              🔗 LinkedIn Notes
            </div>
          </div>

          {tab === 'sources' && (
            <div>
              <div className="card mb-4">
                <div className="card-header">
                  <span className="input-label" style={{ margin: 0 }}>🌐 Website Snapshot Scanner</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Enter URLs to fetch or paste text manually</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {Object.entries(urlInputs).slice(0, 8).map(([key, val]) => (
                      <div key={key} className="input-group" style={{ margin: 0 }}>
                        <label className="input-label">{sourceTypeLabels[key] || key}</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            className="input"
                            style={{ flex: 1 }}
                            value={val}
                            onChange={e => setUrlInputs(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={'https://' + (company.basic.website || 'example.com') + '...'}
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleFetchUrl(key as SourceType)}
                            disabled={fetching === key || !val.trim()}
                          >
                            {fetching === key ? '...' : 'Fetch'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card mb-4">
                <div className="card-header">
                  <span className="input-label" style={{ margin: 0 }}>📝 Manual Page Text</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    {sources.some(s => s.status === 'failed') ? '⚠️ Some fetches failed — paste text below' : 'Paste text from any page'}
                  </span>
                </div>
                <div className="card-body">
                  <textarea
                    className="input"
                    rows={4}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="Paste page text here for analysis (CORS-safe fallback)..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handlePasteText('manual_paste')} disabled={!pastedText.trim()}>
                      📋 Analyze Pasted Text
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPastedText('')}>
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {sources.length > 0 && (
                <div>
                  <h3 className="section-title">
                    Sources ({sources.length})
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => { if (company) sources.forEach(s => deletePublicIntelSource(company.id, s.sourceId)); showToast('🗑️ All sources cleared'); }}>
                      Clear All
                    </button>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {sources.map(source => (
                      <div key={source.sourceId} className="card">
                        <div className="card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{source.sourceTitle || 'Source'}</span>
                                <span className={'badge badge-' + (statusColors[source.status] === '#10b981' ? 'green' : statusColors[source.status] === '#3b82f6' ? 'blue' : statusColors[source.status] === '#8b5cf6' ? 'purple' : statusColors[source.status] === '#ef4444' ? 'red' : 'assumed')} style={{ fontSize: 9 }}>
                                  {source.status}
                                </span>
                                {source.sourceUrl && (
                                  <span style={{ fontSize: 11, color: '#64748b' }}>{source.sourceUrl}</span>
                                )}
                              </div>
                              {source.notes && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{source.notes}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {source.status !== 'analyzed' && source.rawText && source.rawText.length > 20 && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleAnalyze(source.sourceId)}
                                  disabled={analyzing === source.sourceId}
                                >
                                  {analyzing === source.sourceId ? '...' : '🔍 Analyze'}
                                </button>
                              )}
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDeleteSource(source.sourceId)}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {source.rawText && (
                            <details>
                              <summary style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}>
                                {source.rawText.length > 100 ? 'View text (' + source.rawText.length + ' chars)' : 'View text'}
                              </summary>
                              <pre style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, maxHeight: 200, overflow: 'auto', background: '#0f1525', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {source.rawText}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'signals' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const unanalyzed = sources.filter(s => s.status !== 'analyzed' && s.rawText?.length > 20);
                    if (unanalyzed.length === 0) { showToast('ℹ️ All sources already analyzed'); return; }
                    unanalyzed.forEach(s => handleAnalyze(s.sourceId));
                  }}
                >
                  🔍 Analyze All Sources
                </button>
                <button className="btn btn-secondary" onClick={handleGenerateOpenings} disabled={signals.length === 0}>
                  💡 Generate Openings
                </button>
                <button className="btn btn-secondary" onClick={handleApplyToPainPoints} disabled={signals.length === 0}>
                  ❌ Add as Pain Points
                </button>
                <button className="btn btn-secondary" onClick={handleExtractTools} disabled={sources.length === 0}>
                  🔧 Extract Tools
                </button>
                <button className="btn btn-secondary" onClick={handleExtractStakeholders} disabled={sources.length === 0}>
                  👤 Extract Stakeholders
                </button>
              </div>

              {signals.length === 0 ? (
                <EmptyState>
                  <EmptyStateIcon icon="📊" />
                  <EmptyStateTitle>No signals extracted yet</EmptyStateTitle>
                  <EmptyStateDesc>Add a source and click "Analyze" to extract business signals from the text.</EmptyStateDesc>
                </EmptyState>
              ) : (
                <div>
                  <h3 className="section-title">
                    {signals.length} Signal{signals.length !== 1 ? 's' : ''} Extracted
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>
                      — All signals labeled as Public / User Provided / Assumed
                    </span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {signals.map(signal => (
                      <div key={signal.signalId} className="card" style={{ borderLeft: '3px solid ' + (signal.confidence === 'High' ? '#10b981' : signal.confidence === 'Medium' ? '#f59e0b' : '#64748b') }}>
                        <div className="card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                <span className={'badge badge-' + (categoryColors[signal.category] || 'assumed')} style={{ fontSize: 9 }}>
                                  {signalCategoryLabels[signal.category] || signal.category}
                                </span>
                                <ConfidenceBadge level={signal.confidence} size="sm" />
                                <span className={'badge ' + (signal.isVerified ? 'badge-verified' : 'badge-assumed')} style={{ fontSize: 9 }}>
                                  {signal.isVerified ? 'Verified from source' : 'Assumed'}
                                </span>
                              </div>
                              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{signal.title}</h4>
                            </div>
                            <CopyButton text={signal.title + '\nEvidence: ' + signal.evidence + '\nDiscovery: ' + signal.discoveryQuestion} label="Copy" />
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                            <div><span className="text-muted">Evidence:</span> {signal.evidence}</div>
                            <div><span className="text-muted">Why it matters:</span> {signal.whyItMatters}</div>
                            <div><span className="text-muted">Possible pain:</span> {signal.possiblePainPoint}</div>
                            <div><span className="text-muted">Natively opportunity:</span> {signal.nativelyOpportunity}</div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span className="text-muted">Discovery question:</span> {signal.discoveryQuestion}
                            </div>
                            <div style={{ gridColumn: '1 / -1', fontSize: 10, color: '#64748b' }}>
                              Source: {signal.sourceReference}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'openings' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={handleGenerateOpenings} disabled={signals.length === 0}>
                  💡 Generate Openings
                </button>
                <button className="btn btn-secondary" onClick={handleApplyToOpportunities} disabled={openings.length === 0}>
                  ⚡ Add as Opportunities
                </button>
              </div>

              {openings.length === 0 ? (
                <EmptyState>
                  <EmptyStateIcon icon="💡" />
                  <EmptyStateTitle>No sales openings generated yet</EmptyStateTitle>
                  <EmptyStateDesc>Extract signals from sources first, then generate openings to see hidden sales angles.</EmptyStateDesc>
                </EmptyState>
              ) : (
                <div>
                  <div className="card mb-4" style={{ borderColor: '#3b82f6' }}>
                    <div className="card-header">
                      <span className="input-label" style={{ margin: 0, color: '#3b82f6' }}>
                        💡 Openings I Would Not Have Seen
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        Hidden sales angles from public intel
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {openings.map((opening, idx) => (
                      <div key={opening.openingId} className="card" style={{ borderLeft: '3px solid ' + (opening.confidence === 'High' ? '#10b981' : opening.confidence === 'Medium' ? '#f59e0b' : '#64748b') }}>
                        <div className="card-body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span className="badge badge-blue" style={{ fontSize: 9 }}>#{idx + 1}</span>
                              <ConfidenceBadge level={opening.confidence} size="sm" />
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <CopyButton text={opening.title + '\n\nWhat this means: ' + opening.whatThisMightMean + '\nApproach: ' + opening.whoToApproach + '\nFirst line: ' + opening.suggestedFirstLine + '\nDiscovery: ' + opening.suggestedDiscoveryQuestion + '\nDemo: ' + opening.suggestedNativelyDemo} label="Copy" />
                            </div>
                          </div>
                          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{opening.title}</h4>
                          <div style={{ fontSize: 12, color: '#94a3b8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span className="text-muted">Source signal:</span> {opening.sourceSignal}
                            </div>
                            <div><span className="text-muted">What this might mean:</span> {opening.whatThisMightMean}</div>
                            <div><span className="text-muted">Why Adam might care:</span> {opening.whyAdamMightCare}</div>
                            <div><span className="text-muted">Who to approach:</span> {opening.whoToApproach}</div>
                            <div><span className="text-muted">Suggested first line:</span> "{opening.suggestedFirstLine}"</div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span className="text-muted">Discovery question:</span> {opening.suggestedDiscoveryQuestion}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <span className="text-muted">Natively demo idea:</span> {opening.suggestedNativelyDemo}
                            </div>
                            <div style={{ gridColumn: '1 / -1', fontSize: 10, color: '#64748b' }}>
                              ⚠️ Risk/uncertainty: {opening.riskUncertainty}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'linkedin' && (
            <div>
              {/* NEW: Fetch LinkedIn Company Page via Edge Function */}
              <div className="card mb-4" style={{ borderColor: '#3b82f6' }}>
                <div className="card-header">
                  <span className="input-label" style={{ margin: 0 }}>🔗 Auto-Fetch LinkedIn Company Page</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    Fetches publicly accessible LinkedIn company page via proxy
                  </span>
                </div>
                <div className="card-body">
                  <div className="badge badge-blue" style={{ marginBottom: 12, fontSize: 10 }}>
                    🔒 Uses edge function proxy — fetches publicly accessible LinkedIn HTML
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Fetches the LinkedIn company page for <strong>{company.basic.name}</strong> via the Natively proxy.
                    The raw HTML is cleaned to text and added as a LinkedIn source ready for analysis.
                    This uses LinkedIn's public-facing pages and does not bypass authentication.
                  </p>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        if (!company) return;
                        setFetchingLinkedIn(true);
                        setLinkedInFetchError(null);
                        try {
                          const result = await fetchLinkedInCompanyViaBackend(company.basic.name);
                          if (!result.success || !result.data) {
                            setLinkedInFetchError(result.message || 'Failed to fetch LinkedIn company page.');
                            showToast('❌ ' + (result.message || 'LinkedIn fetch failed'));
                          } else {
                            // Clean the HTML to plain text
                            const cleanedText = cleanHtmlToText(result.data);
                            if (!cleanedText || cleanedText.length < 20) {
                              setLinkedInFetchError('Page returned too little text. The company may not have a LinkedIn page or it may be inaccessible.');
                              showToast('⚠️ LinkedIn page returned insufficient text');
                            } else {
                              // Create a source and add it
                              const source = createPublicIntelSource(
                                company.id,
                                'linkedin_notes',
                                `https://www.linkedin.com/company/${company.basic.name.toLowerCase().replace(/\s+/g, '-')}/`,
                                `LinkedIn Company Page — ${company.basic.name}`,
                                cleanedText,
                                'Auto-fetched via Natively proxy from public LinkedIn company page'
                              );
                              addPublicIntelSource(company.id, { ...source, status: 'fetched' as SourceStatus });
                              showToast(`✅ Fetched LinkedIn page — ${cleanedText.length.toLocaleString()} chars ready for analysis`);
                            }
                          }
                        } catch (err: any) {
                          setLinkedInFetchError(err?.message || 'Unknown error');
                          showToast('❌ ' + (err?.message || 'LinkedIn fetch error'));
                        } finally {
                          setFetchingLinkedIn(false);
                        }
                      }}
                      disabled={fetchingLinkedIn}
                    >
                      {fetchingLinkedIn ? '⏳ Fetching LinkedIn page...' : `🔗 Fetch LinkedIn Page for ${company.basic.name}`}
                    </button>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      May take 5-15 seconds
                    </span>
                  </div>

                  {fetchingLinkedIn && (
                    <div style={{
                      marginTop: 12, padding: 12, textAlign: 'center',
                      background: 'rgba(59,130,246,0.06)', borderRadius: 6,
                      fontSize: 12, color: '#94a3b8',
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>⏳</div>
                      Fetching LinkedIn company page for {company.basic.name} via proxy...
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        This may take 5-15 seconds. The proxy is fetching and cleaning the page.
                      </div>
                    </div>
                  )}

                  {linkedInFetchError && !fetchingLinkedIn && (
                    <div style={{
                      marginTop: 12, padding: '8px 12px',
                      background: 'rgba(239,68,68,0.08)', borderRadius: 6,
                      border: '1px solid rgba(239,68,68,0.2)',
                      fontSize: 12, color: '#ef4444',
                    }}>
                      ⚠️ {linkedInFetchError}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual LinkedIn Notes section */}
              <div className="card mb-4" style={{ borderColor: '#8b5cf6' }}>
                <div className="card-body">
                  <div className="badge badge-purple" style={{ marginBottom: 12, fontSize: 10 }}>
                    🔒 Manual public LinkedIn notes — no automated LinkedIn scraping
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                    Paste publicly available LinkedIn company information you have gathered manually.
                    We do not scrape LinkedIn. All data must be user-provided.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      'LinkedIn company About text',
                      'Recent public posts',
                      'Job listings',
                      'Employee/headcount notes',
                      'Founder/executive names and titles',
                      'Public company page description',
                      'Market positioning notes',
                    ].map(hint => (
                      <div key={hint} style={{ fontSize: 11, color: '#64748b', padding: '4px 8px', background: '#0f1525', borderRadius: 4 }}>
                        • {hint}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="input"
                    rows={6}
                    value={linkedinNotes}
                    onChange={e => setLinkedinNotes(e.target.value)}
                    placeholder="Paste LinkedIn company info, job listings, or public posts here..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handlePasteText('linkedin_notes')} disabled={!linkedinNotes.trim()}>
                      📋 Analyze LinkedIn Notes
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setLinkedinNotes('')}>
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {sources.filter(s => s.sourceType === 'linkedin_notes').length > 0 && (
                <div>
                  <h3 className="section-title">LinkedIn Sources Added</h3>
                  {sources.filter(s => s.sourceType === 'linkedin_notes').map(s => (
                    <div key={s.sourceId} className="card mb-3">
                      <div className="card-body" style={{ fontSize: 13, color: '#94a3b8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span className="badge badge-purple" style={{ fontSize: 9 }}>LinkedIn Notes</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteSource(s.sourceId)}>✕</button>
                        </div>
                        <pre style={{ marginTop: 8, fontSize: 11, whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#0f1525', padding: 12, borderRadius: 6, maxHeight: 200, overflow: 'auto' }}>
                          {s.rawText}
                        </pre>
                        {s.status !== 'analyzed' && (
                          <button className="btn btn-primary btn-sm mt-2" onClick={() => handleAnalyze(s.sourceId)}>
                            🔍 Analyze
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
    </div>
      )}
    </div>
  );
}