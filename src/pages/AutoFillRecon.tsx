// ============================================================
// Auto-Fill Recon Page — v0.3
// Public web intelligence collector + auto-fill
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import {
  discoverPublicUrls, fetchPublicUrl,
  applyReconFindingsToCompany,
  generateAutoFillSuggestions, generateReconOpenings,
} from '../services/reconScanner';
import { analyzePeopleText } from '../services/peopleSignalEngine';
import type {
  Company, ReconDiscoveredUrl, DetectedTool, InferredWorkflow,
  ReconAutoFillSuggestion, ReconOpening, ReconFindings,
  ConfidenceLevel, PeopleSignalSourceType,
  RoleMapEntry, StakeholderHypothesis, HiringSignal,
  MilestoneSignal, OutreachAngle, PeopleDiscoveryQuestion, PeopleSignals,
} from '../types';

type Tab = 'discover' | 'fetch' | 'tools' | 'workflows' | 'suggestions' | 'openings' | 'people' | 'apply';

export default function AutoFillReconPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, getCompany, updateCompany } = useApp();

  const company = id ? getCompany(id) : (state.currentCompanyId ? getCompany(state.currentCompanyId) : undefined);

  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [homepageUrl, setHomepageUrl] = useState(company?.basic.website || '');
  const [discoveredUrls, setDiscoveredUrls] = useState<ReconDiscoveredUrl[]>([]);
  const [detectedTools, setDetectedTools] = useState<DetectedTool[]>([]);
  const [inferredWorkflows, setInferredWorkflows] = useState<InferredWorkflow[]>([]);
  const [suggestions, setSuggestions] = useState<ReconAutoFillSuggestion[]>([]);
  const [openings, setOpenings] = useState<ReconOpening[]>([]);
  const [manualPeopleText, setManualPeopleText] = useState('');
  const [publicPeopleNotes, setPublicPeopleNotes] = useState('');
  const [publicLeadershipText, setPublicLeadershipText] = useState('');
  const [extraUrls, setExtraUrls] = useState('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'discovering' | 'fetching' | 'analyzing' | 'done' | 'error'>('idle');
  // People Signal Engine state
  const [peopleSourceType, setPeopleSourceType] = useState<PeopleSignalSourceType>('linkedin_company_about');
  const [peopleSourceUrl, setPeopleSourceUrl] = useState('');
  const [peopleRoleMap, setPeopleRoleMap] = useState<RoleMapEntry[]>([]);
  const [peopleStakeholderHyps, setPeopleStakeholderHyps] = useState<StakeholderHypothesis[]>([]);
  const [peopleHiringSignals, setPeopleHiringSignals] = useState<HiringSignal[]>([]);
  const [peopleMilestoneSignals, setPeopleMilestoneSignals] = useState<MilestoneSignal[]>([]);
  const [peopleOutreachAngles, setPeopleOutreachAngles] = useState<OutreachAngle[]>([]);
  const [peopleDiscoveryQuestions, setPeopleDiscoveryQuestions] = useState<PeopleDiscoveryQuestion[]>([]);
  const [peopleAnalyzing, setPeopleAnalyzing] = useState(false);
  const [scanError, setScanError] = useState('');
  const [fetchProgress, setFetchProgress] = useState('');
  const [manualPasteText, setManualPasteText] = useState('');
  useEffect(() => {
    if (company?.basic.website) {
      setHomepageUrl(company.basic.website);
    }
  }, [company?.id]);

  // Restore recon state from company on mount
  useEffect(() => {
    if (company?.reconFindings) {
      const rf = company.reconFindings;
      if (rf.status === 'scanned' || rf.status === 'analyzed') {
        setDiscoveredUrls(rf.discoveredUrls || []);
        setDetectedTools(rf.detectedTools || []);
        setInferredWorkflows(rf.inferredWorkflows || []);
        setSuggestions(rf.autoFillSuggestions || []);
        setOpenings(rf.openings || []);
        // Restore people signals
        const ps = rf.peopleSignals;
        if (ps) {
          setPeopleRoleMap(ps.roleMap || []);
          setPeopleStakeholderHyps(ps.stakeholderHypotheses || []);
          setPeopleHiringSignals(ps.hiringSignals || []);
          setPeopleMilestoneSignals(ps.milestoneSignals || []);
          setPeopleOutreachAngles(ps.outreachAngles || []);
          setPeopleDiscoveryQuestions(ps.discoveryQuestions || []);
        }
        if (rf.status === 'analyzed') { setScanStatus('done'); }
        if (rf.status === 'analyzed') { setActiveTab('fetch'); }
        else if (rf.discoveredUrls.length > 0) { setActiveTab('fetch'); }
      }
    }
  }, [company?.id]);

  if (!company) {
    return (
      <EmptyState>
        <EmptyStateIcon icon="🔍" />
        <EmptyStateTitle>No Company Selected</EmptyStateTitle>
        <EmptyStateDesc>Select a company first, then use Auto-Fill Recon to discover public intelligence.</EmptyStateDesc>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Go to Dashboard</button>
      </EmptyState>
    );
  }

  // ─── Step 1: Discover URLs ──────────────────────────────────

  const handleDiscover = async () => {
    if (!homepageUrl) return;
    setScanStatus('discovering');
    setScanError('');

    // Clear local state for a fresh scan
    setDiscoveredUrls([]);
    setDetectedTools([]);
    setInferredWorkflows([]);
    setSuggestions([]);
    setOpenings([]);

    try {
      let homepageHtml: string | undefined;

      // Try to fetch homepage
      const result = await fetchPublicUrl(homepageUrl);
      if (result.success && result.html) {
        homepageHtml = result.html;
        setFetchProgress('Homepage fetched successfully');
      } else if (result.blocked) {
        setFetchProgress(`Homepage: ${result.error}. Paste text manually below.`);
      } else {
        setFetchProgress(`Homepage: ${result.error || 'Failed to fetch'}`);
      }

      const urls = discoverPublicUrls(homepageUrl, homepageHtml);
      setDiscoveredUrls(urls);

      // Persist discovered URLs immediately so state survives navigation
      updateCompany(company.id, {
        reconFindings: {
          companyId: company.id,
          discoveredUrls: urls,
          detectedTools: [],
          inferredWorkflows: [],
          autoFillSuggestions: [],
          openings: [],
          publicPeopleNotes: '',
          publicLeadershipText: '',
          scanDate: new Date().toISOString(),
          status: 'scanned',
        }
      });

      setScanStatus('idle');
      setActiveTab('fetch');
    } catch (err) {
      setScanError(String(err));
      setScanStatus('error');
    }
  };

  const handleAddExtraUrl = () => {
    if (!extraUrls.trim()) return;
    const newUrls = extraUrls.split('\n').filter(Boolean);
    const newDiscovered = newUrls.map(url => ({
      urlId: `url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: url.trim(),
      pageType: 'User Added Page' as string,
      discoveryMethod: 'user-added' as const,
      status: 'unscanned' as const,
      confidence: 'Medium' as ConfidenceLevel,
      notes: 'Added manually by user',
    }));
    setDiscoveredUrls(prev => [...prev, ...newDiscovered]);
    setExtraUrls('');
  };

  const handleRemoveUrl = (urlId: string) => {
    setDiscoveredUrls(prev => prev.filter(u => u.urlId !== urlId));
  };

  const handlePasteUrlContent = (urlId: string, text: string) => {
    setDiscoveredUrls(prev => prev.map(u =>
      u.urlId === urlId ? { ...u, status: 'pasted', fetchedText: text, fetchSourceType: 'pasted-public-page' } : u
    ));
  };

  // ─── Step 2: Fetch & Analyze ────────────────────────────────

  const handleFetchAndAnalyze = async () => {
    setScanStatus('fetching');
    setScanError('');

    const settings = state.settings.reconSettings;
    const urlsToScan = discoveredUrls.filter(u => u.status === 'unscanned').slice(0, settings.maxPagesPerScan);

    const localDetected: DetectedTool[] = [];
    const allPageTexts: { text: string; url: string; html?: string }[] = [];
    let updatedUrls = [...discoveredUrls];

    for (let i = 0; i < urlsToScan.length; i++) {
      const urlInfo = urlsToScan[i];
      setFetchProgress(`Fetching ${i + 1}/${urlsToScan.length}: ${urlInfo.pageType}`);
      const result = await fetchPublicUrl(urlInfo.url);
      if (result.success && result.html) {
        updatedUrls = updatedUrls.map(u =>
          u.urlId === urlInfo.urlId
            ? { ...u, status: 'scanned', fetchedText: (result.text || '').slice(0, settings.maxCharsPerPage), fetchSourceType: 'browser-fetch' }
            : u
        );
        allPageTexts.push({ text: result.text || '', url: urlInfo.url, html: result.html });
        if (settings.enableToolFingerprinting) {
          const { fingerprintPage, inferToolsFromText } = await import('../services/toolFingerprintEngine');
          localDetected.push(...fingerprintPage(result.html, urlInfo.url).detected);
          localDetected.push(...inferToolsFromText(result.text || '', urlInfo.url));
        }
      } else if (result.blocked) {
        updatedUrls = updatedUrls.map(u =>
          u.urlId === urlInfo.urlId ? { ...u, status: 'blocked', notes: result.error || 'Blocked' } : u
        );
      } else {
        updatedUrls = updatedUrls.map(u =>
          u.urlId === urlInfo.urlId ? { ...u, status: 'failed', notes: result.error || 'Failed' } : u
        );
      }
      if (i < urlsToScan.length - 1) {
        await new Promise(r => setTimeout(r, settings.scanDelayMs));
      }
    }

    const pastedUrls = discoveredUrls.filter(u => u.status === 'pasted' && u.fetchedText);
    for (const urlInfo of pastedUrls) {
      if (urlInfo.fetchedText) {
        allPageTexts.push({ text: urlInfo.fetchedText, url: urlInfo.url });
        if (settings.enableToolFingerprinting) {
          const { inferToolsFromText } = await import('../services/toolFingerprintEngine');
          localDetected.push(...inferToolsFromText(urlInfo.fetchedText, urlInfo.url));
        }
      }
    }

    setDiscoveredUrls(updatedUrls);
    setFetchProgress('Analyzing...');
    setScanStatus('analyzing');

    const toolMap = new Map<string, DetectedTool>();
    for (const t of localDetected) {
      const existing = toolMap.get(t.toolName);
      if (!existing || (t.detectionMethod === 'Detected' && existing.detectionMethod === 'Inferred')) {
        toolMap.set(t.toolName, t);
      }
    }
    const localTools = Array.from(toolMap.values());

    let localWorkflows: InferredWorkflow[] = [];
    if (settings.enableWorkflowInference && allPageTexts.length > 0) {
      const { inferWorkflowsFromText } = await import('../services/workflowInferenceEngine');
      const wfMap = new Map<string, InferredWorkflow>();
      for (const page of allPageTexts) {
        for (const w of inferWorkflowsFromText(page.text, page.url, localTools)) {
          const existing = wfMap.get(w.workflowName);
          if (!existing || w.confidence === 'High') wfMap.set(w.workflowName, w);
        }
      }
      localWorkflows = Array.from(wfMap.values());
    }

    const localSuggestions = generateAutoFillSuggestions(company, localTools, localWorkflows, allPageTexts.map(p => ({ text: p.text, url: p.url })));
    const localOpenings = generateReconOpenings(localTools, localWorkflows, company, allPageTexts.map(p => ({ text: p.text, url: p.url })));

    setDetectedTools(localTools);
    setInferredWorkflows(localWorkflows);
    setSuggestions(localSuggestions);
    setOpenings(localOpenings);

    updateCompany(company.id, {
      reconFindings: {
        companyId: company.id,
        discoveredUrls: updatedUrls,
        detectedTools: localTools,
        inferredWorkflows: localWorkflows,
        autoFillSuggestions: localSuggestions,
        openings: localOpenings,
        publicPeopleNotes: publicPeopleNotes,
        publicLeadershipText: publicLeadershipText,
        scanDate: new Date().toISOString(),
        status: 'analyzed',
      }
    });

    setScanStatus('done');
    setFetchProgress(`Completed: ${urlsToScan.length} URLs fetched + ${pastedUrls.length} pasted sources analyzed`);
  };

  // ─── Step 3: Apply Findings ─────────────────────────────────

  const handleApplySuggestion = (field: string, value: string) => {
    const updates: Partial<Company> = {};
    switch (field.replace('Tool:', '').trim()) {
      case 'Industry':
        updates.basic = { ...company.basic, industry: value };
        break;
      case 'Description':
        updates.business = { ...company.business, productsServices: value };
        break;
      case 'Location':
        updates.basic = { ...company.basic, location: value };
        break;
      case 'Target Customers':
        updates.business = { ...company.business, targetCustomers: value };
        break;
      default:
        if (field.startsWith('Tool:')) {
          const cat = field.replace('Tool:', '').trim().toLowerCase();
          const toolUpdates: Partial<Company['tools']> = {};
          if (cat.includes('crm')) toolUpdates.crm = value;
          else if (cat.includes('cms') || cat.includes('website')) toolUpdates.websitePlatform = value;
          else if (cat.includes('scheduling')) toolUpdates.schedulingTools = value;
          else if (cat.includes('support') || cat.includes('chat')) toolUpdates.supportTools = value;
          else if (cat.includes('payment') || cat.includes('billing')) toolUpdates.billingTools = value;
          else if (cat.includes('marketing') || cat.includes('email')) toolUpdates.emailTools = value;
          else toolUpdates.unknownTools = value;
          updates.tools = { ...company.tools, ...toolUpdates };
        }
        break;
    }
    if (Object.keys(updates).length > 0) {
      updateCompany(company.id, updates);
    }
  };

  const handleApplyAllToProfile = () => {
    const findings: ReconFindings = {
      companyId: company.id,
      discoveredUrls,
      detectedTools,
      inferredWorkflows,
      autoFillSuggestions: suggestions,
      openings,
      publicPeopleNotes,
      publicLeadershipText,
      scanDate: new Date().toISOString(),
      status: 'applied',
    };
    const updates = applyReconFindingsToCompany(company, findings);
    updateCompany(company.id, updates);
    setScanStatus('idle');
  };

  const handleGeneratePainPoints = () => {
    const newPains = inferredWorkflows.map(wf => ({
      id: `pain-recon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: wf.workflowName,
      department: wf.department.toLowerCase() as any,
      symptoms: wf.possibleBottleneck,
      likelyCost: 'Recon estimate — validate',
      timeLost: 'To be quantified',
      revenueImpact: 'To be quantified',
      automationOpportunity: wf.automationOpportunity,
      suggestedSolution: wf.suggestedNativeBuilderDemo,
      confidence: wf.confidence,
      discoveryQuestion: wf.discoveryQuestion,
      severity: 3, frequency: 3, revenueImpactScore: 3, easeOfSolution: 3, decisionMakerVisibility: 3,
    }));
    updateCompany(company.id, {
      painPoints: [...company.painPoints, ...newPains],
    });
  };
  const handleGenerateOpportunities = () => {
    const newOpps = openings.map(o => ({
      id: `opp-recon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: o.title,
      businessProblem: o.likelyBusinessPain,
      whoFeelsPain: 'Recon-based inference',
      whoPaysForFix: 'Company leadership',
      proposedSolution: o.suggestedNativelyDemo,
      nativelyBuildIdea: o.suggestedBuildPrompt,
      requiredFeatures: 'To be determined during discovery',
      estimatedComplexity: 'Medium' as const,
      estimatedBusinessValue: 'Medium' as const,
      suggestedDemoAngle: `Recon-based: ${o.title}`,
      suggestedBuildPrompt: o.suggestedBuildPrompt,
      discoveryQuestions: o.discoveryQuestion,
      proofNeeded: 'Recon-based — validate in conversation',
      closeStrategy: 'Recon-driven — start with discovery question',
      opportunityType: 'custom' as const,
    }));
    updateCompany(company.id, {
      opportunities: [...company.opportunities, ...newOpps],
    });
  };

  // ─── People Signal Handlers ───────────────────────────────────

  const handleAnalyzePeopleText = () => {
    const text = manualPeopleText.trim();
    if (!text) return;
    setPeopleAnalyzing(true);
    try {
      const result = analyzePeopleText(text, peopleSourceType, peopleSourceUrl || company.basic.website);
      setPeopleRoleMap(result.roleMap);
      setPeopleStakeholderHyps(result.stakeholderHypotheses);
      setPeopleHiringSignals(result.hiringSignals);
      setPeopleMilestoneSignals(result.milestoneSignals);
      setPeopleOutreachAngles(result.outreachAngles);
      setPeopleDiscoveryQuestions(result.discoveryQuestions);
      setPublicPeopleNotes(text.slice(0, 2000));
      const roleTitles = result.roleMap.map(r => r.roleTitle).join(', ');
      setPublicLeadershipText(roleTitles
        ? `Detected roles: ${roleTitles}. ${result.roleMap.length} role signals identified from public source.`
        : 'No specific roles detected from public source.');
      const existing = company.reconFindings;
      const peopleSignals: PeopleSignals = {
        roleMap: result.roleMap,
        stakeholderHypotheses: result.stakeholderHypotheses,
        hiringSignals: result.hiringSignals,
        milestoneSignals: result.milestoneSignals,
        outreachAngles: result.outreachAngles,
        discoveryQuestions: result.discoveryQuestions,
      };
      updateCompany(company.id, {
        reconFindings: {
          companyId: company.id,
          discoveredUrls: existing?.discoveredUrls || [],
          detectedTools: existing?.detectedTools || [],
          inferredWorkflows: existing?.inferredWorkflows || [],
          autoFillSuggestions: existing?.autoFillSuggestions || [],
          openings: existing?.openings || [],
          publicPeopleNotes: text.slice(0, 2000),
          publicLeadershipText: roleTitles ? `Detected roles: ${roleTitles}` : 'No specific roles detected',
          peopleSignals,
          scanDate: new Date().toISOString(),
          status: existing?.status || 'analyzed',
        } as ReconFindings,
      });
    } catch (err) {
      console.error('People analysis error:', err);
    }
    setPeopleAnalyzing(false);
  };

  const handleClearPeopleNotes = () => {
    setManualPeopleText('');
    setPeopleSourceType('linkedin_company_about');
    setPeopleSourceUrl('');
    setPeopleRoleMap([]);
    setPeopleStakeholderHyps([]);
    setPeopleHiringSignals([]);
    setPeopleMilestoneSignals([]);
    setPeopleOutreachAngles([]);
    setPeopleDiscoveryQuestions([]);
    setPublicPeopleNotes('');
    setPublicLeadershipText('');
    if (company.reconFindings) {
      updateCompany(company.id, {
        reconFindings: {
          ...company.reconFindings,
          publicPeopleNotes: '',
          publicLeadershipText: '',
          peopleSignals: {
            roleMap: [],
            stakeholderHypotheses: [],
            hiringSignals: [],
            milestoneSignals: [],
            outreachAngles: [],
            discoveryQuestions: [],
          },
          scanDate: new Date().toISOString(),
        },
      });
    }
  };

  const handleGenerateStakeholdersFromPeople = () => {
    if (peopleStakeholderHyps.length === 0) return;
    const newStakeholders = peopleStakeholderHyps.map((h, i) => ({
      id: `stk-people-${Date.now()}-${i}`,
      category: h.likelyBuyingInfluence >= 4 ? ('economic_buyer' as const) : ('influencer' as const),
      name: undefined,
      role: h.roleTitle,
      department: h.department,
      likelyPriorities: h.likelyConcern,
      likelyObjections: 'Unknown — validate during discovery',
      whatTheyCareAbout: h.likelyConcern,
      bestTalkTrack: h.likelyDiscoveryQuestion,
      bestProof: 'To be determined during discovery',
      buyingInfluence: h.likelyBuyingInfluence,
      accessStatus: 'unknown' as const,
      confidence: h.confidence,
    }));
    updateCompany(company.id, {
      stakeholders: [...company.stakeholders, ...newStakeholders],
      reconFindings: {
        ...company.reconFindings!,
        peopleSignals: {
          roleMap: peopleRoleMap,
          stakeholderHypotheses: peopleStakeholderHyps,
          hiringSignals: peopleHiringSignals,
          milestoneSignals: peopleMilestoneSignals,
          outreachAngles: peopleOutreachAngles,
          discoveryQuestions: peopleDiscoveryQuestions,
        },
      },
    });
  };

  const handleCopyPeopleIntelligence = () => {
    const lines: string[] = [];
    lines.push(`Public People Intelligence for ${company.basic.name}`);
    lines.push('='.repeat(50));
    if (peopleRoleMap.length > 0) {
      peopleRoleMap.forEach(r => lines.push(`  [${r.confidence}] ${r.roleTitle} (${r.department})`));
      lines.push('');
    }
    lines.push('STAKEHOLDER HYPOTHESES');
    if (peopleStakeholderHyps.length > 0) {
      peopleStakeholderHyps.forEach(h => lines.push(`  ${h.roleTitle} — ${h.likelyConcern}`));
      lines.push('');
    }
    lines.push('HIRING SIGNALS');
    if (peopleHiringSignals.length > 0) {
      peopleHiringSignals.forEach(h => lines.push(`  ${h.openRole} (${h.department})`));
      lines.push('');
    }
    lines.push('MILESTONE SIGNALS');
    if (peopleMilestoneSignals.length > 0) {
      peopleMilestoneSignals.forEach(m => lines.push(`  ${m.description} [${m.milestoneType}]`));
      lines.push('');
    }
    lines.push('OUTREACH ANGLES');
    if (peopleOutreachAngles.length > 0) {
      peopleOutreachAngles.forEach(o => lines.push(`  ${o.angleText}`));
      lines.push('');
    }
    lines.push('DISCOVERY QUESTIONS');
    if (peopleDiscoveryQuestions.length > 0) {
      peopleDiscoveryQuestions.forEach(q => lines.push(`  [${q.targetRole}] ${q.question}`));
    }
    navigator.clipboard.writeText(lines.join('\n'));
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'discover', label: '1. Discover', icon: '🔗' },
    { key: 'fetch', label: '2. Fetch', icon: '📡' },
    { key: 'tools', label: 'Tools', icon: '🔧' },
    { key: 'workflows', label: 'Workflows', icon: '⚙️' },
    { key: 'suggestions', label: 'Suggestions', icon: '💡' },
    { key: 'openings', label: 'Openings', icon: '🎯' },
    { key: 'people', label: 'People', icon: '👤' },
    { key: 'apply', label: 'Apply', icon: '✅' },
  ];

  const hasPeopleSignals =
    peopleRoleMap.length > 0 ||
    peopleStakeholderHyps.length > 0 ||
    peopleHiringSignals.length > 0 ||
    peopleMilestoneSignals.length > 0 ||
    peopleOutreachAngles.length > 0 ||
    peopleDiscoveryQuestions.length > 0;

  return (
    <div>
      <PageHeader
        title="Auto-Fill Recon"
        subtitle={`Public intelligence scanner for ${company.basic.name}`}
      />

      {/* Safety Notice */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#94a3b8'
      }}>
        🔒 <strong>Recon Safety Notice:</strong> This scanner is designed for public business research only.
        It does not bypass logins, scrape private pages, or access restricted systems.
        If a source cannot be fetched safely, paste public text manually.
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ flexWrap: 'wrap', gap: 0 }}>
        {tabs.map(tab => (
          <div
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontSize: 12,
              padding: '8px 14px',
              ...(tab.key === 'discover' || tab.key === 'fetch' || tab.key === 'apply' ? { fontWeight: 700 } : {}),
            }}
          >
            {tab.icon} {tab.label}
          </div>
        ))}
      </div>

      {/* ─── TAB: DISCOVER ──────────────────────────────────── */}
      {activeTab === 'discover' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>🔗 Step 1: Discover Public URLs</span>
          </div>
          <div className="card-body">
            <div className="input-group">
              <label className="input-label">Company Homepage URL</label>
              <div className="flex" style={{ gap: 8 }}>
                <input
                  className="input"
                  value={homepageUrl}
                  onChange={e => setHomepageUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleDiscover}
                  disabled={!homepageUrl || scanStatus === 'discovering'}
                >
                  {scanStatus === 'discovering' ? 'Discovering...' : 'Discover URLs'}
                </button>
              </div>
            </div>

            {fetchProgress && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                {fetchProgress}
              </div>
            )}

            {scanError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>
                ❌ {scanError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Add Extra URLs (one per line)</label>
              <div className="flex" style={{ gap: 8 }}>
                <textarea
                  className="input"
                  value={extraUrls}
                  onChange={e => setExtraUrls(e.target.value)}
                  placeholder="https://example.com/about&#10;https://example.com/services"
                  rows={3}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={handleAddExtraUrl} style={{ alignSelf: 'flex-end' }}>
                  Add
                </button>
              </div>
            </div>

            {discoveredUrls.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="input-label" style={{ margin: 0 }}>
                    Discovered URLs ({discoveredUrls.length})
                  </span>
                  <div className="flex" style={{ gap: 8, fontSize: 11, color: '#64748b' }}>
                    <span className="badge badge-blue">{discoveredUrls.filter(u => u.status === 'unscanned').length} pending</span>
                    <span className="badge badge-green">{discoveredUrls.filter(u => u.status === 'scanned').length} scanned</span>
                    <span className="badge badge-amber">{discoveredUrls.filter(u => u.status === 'blocked').length} blocked</span>
                    <span className="badge badge-red">{discoveredUrls.filter(u => u.status === 'failed').length} failed</span>
                  </div>
                </div>
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {discoveredUrls.map(urlInfo => (
                    <div key={urlInfo.urlId} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                      borderBottom: '1px solid rgba(42, 58, 92, 0.3)', fontSize: 12,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: urlInfo.status === 'scanned' ? '#10b981'
                          : urlInfo.status === 'blocked' ? '#f59e0b'
                          : urlInfo.status === 'failed' ? '#ef4444'
                          : '#3b82f6',
                      }} />
                      <span className="badge" style={{
                        background: urlInfo.discoveryMethod === 'user-added' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.1)',
                        color: urlInfo.discoveryMethod === 'user-added' ? '#8b5cf6' : '#3b82f6',
                        fontSize: 10, padding: '1px 6px', flexShrink: 0,
                      }}>
                        {urlInfo.discoveryMethod === 'homepage-link' ? 'Link' : urlInfo.discoveryMethod === 'common-path' ? 'Path' : urlInfo.discoveryMethod === 'user-added' ? 'User' : 'HQ'}
                      </span>
                      <span style={{ color: '#94a3b8', flexShrink: 0 }}>{urlInfo.pageType}</span>
                      <span className="truncate" style={{ flex: 1, color: '#64748b' }}>{urlInfo.url}</span>
                      <button className="btn-icon btn-sm" onClick={() => handleRemoveUrl(urlInfo.urlId)} title="Remove">✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {discoveredUrls.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('fetch')}>
                  Next: Fetch URLs →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: FETCH ─────────────────────────────────────── */}
      {activeTab === 'fetch' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>📡 Step 2: Fetch & Analyze URLs</span>
          </div>
          <div className="card-body">
            {scanStatus === 'fetching' || scanStatus === 'analyzing' ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
                  {scanStatus === 'fetching' ? 'Fetching pages...' : 'Analyzing content...'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{fetchProgress}</div>
                <div style={{
                  width: 200, height: 4, background: '#2a3a5c', borderRadius: 2,
                  margin: '12px auto', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: '60%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                    borderRadius: 2, animation: 'none',
                  }} />
                </div>
              </div>
            ) : (
              <>
                {discoveredUrls.length === 0 ? (
                  /* ─── Fallback: Manual Homepage Paste ────── */
                  <div style={{
                    padding: 16, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>
                      📝 Manual Homepage Paste
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                      No URLs were discovered or state was lost. Paste your company homepage text below to analyze.
                    </div>
                    <div style={{ fontSize: 11, color: '#3b82f6', marginBottom: 8 }}>
                      URL: {homepageUrl}
                    </div>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Paste public homepage text or HTML here..."
                      style={{ fontSize: 12, marginBottom: 8 }}
                      value={manualPasteText}
                      onChange={e => setManualPasteText(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const text = manualPasteText.trim();
                        if (!text) return;
                        const newEntry: ReconDiscoveredUrl = {
                          urlId: `url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                          url: homepageUrl,
                          pageType: 'Homepage',
                          discoveryMethod: 'user-added',
                          status: 'pasted',
                          confidence: 'High' as ConfidenceLevel,
                          notes: 'Manually pasted homepage text',
                          fetchedText: text,
                          fetchSourceType: 'pasted-public-page',
                        };
                        setDiscoveredUrls([newEntry]);
                        setManualPasteText('');
                      }}
                    >
                      Analyze Pasted Homepage
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                      {discoveredUrls.filter(u => u.status === 'unscanned').length} URLs ready to scan.
                      URLs blocked by CORS can be pasted manually.
                    </p>

                    <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
                      {discoveredUrls.map(urlInfo => (
                        <div key={urlInfo.urlId} style={{
                          padding: '8px 12px', borderBottom: '1px solid rgba(42, 58, 92, 0.3)',
                          fontSize: 12,
                        }}>
                          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                            <div className="flex items-center" style={{ gap: 8 }}>
                              <span style={{
                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                background: urlInfo.status === 'scanned' ? '#10b981'
                                  : urlInfo.status === 'blocked' ? '#f59e0b'
                                  : urlInfo.status === 'failed' ? '#ef4444'
                                  : urlInfo.status === 'pasted' ? '#8b5cf6'
                                  : '#3b82f6',
                              }} />
                              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{urlInfo.pageType}</span>
                              <span className="truncate" style={{ color: '#64748b', maxWidth: 300 }}>{urlInfo.url}</span>
                            </div>
                            <span className={`badge ${
                              urlInfo.status === 'scanned' ? 'badge-green' :
                              urlInfo.status === 'blocked' ? 'badge-amber' :
                              urlInfo.status === 'failed' ? 'badge-red' :
                              urlInfo.status === 'pasted' ? 'badge-purple' :
                              'badge-blue'
                            }`} style={{ fontSize: 10 }}>
                              {urlInfo.status}
                            </span>
                          </div>
                          {(urlInfo.status === 'blocked' || urlInfo.status === 'failed' || urlInfo.status === 'unscanned') && (
                            <div style={{ marginTop: 4 }}>
                              {urlInfo.status === 'blocked' && (
                                <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>
                                  ⚠️ {urlInfo.notes || 'Blocked by CORS'}
                                </div>
                              )}
                              <textarea
                                className="input"
                                placeholder="Paste page text or HTML here if fetch failed..."
                                rows={2}
                                style={{ fontSize: 11, minHeight: 40 }}
                                onBlur={e => {
                                  if (e.target.value.trim()) {
                                    handlePasteUrlContent(urlInfo.urlId, e.target.value);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <button className="btn btn-secondary" onClick={() => setActiveTab('discover')}>
                    ← Back to Discover
                  </button>
                  <button className="btn btn-primary" onClick={handleFetchAndAnalyze}>
                    {scanStatus === 'done' ? 'Re-scan' : 'Analyze Public Sources'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: TOOLS ─────────────────────────────────────── */}
      {activeTab === 'tools' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>🔧 Detected Tools ({detectedTools.length})</span>
          </div>
          <div className="card-body">
            {detectedTools.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon icon="🔧" />
                <EmptyStateTitle>No Tools Detected</EmptyStateTitle>
                <EmptyStateDesc>Run Fetch & Analyse first, or add tools manually.</EmptyStateDesc>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('fetch')}>Fetch URLs</button>
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {detectedTools.map((tool, i) => (
                  <div key={i} style={{
                    padding: 10, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', fontSize: 12,
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{tool.toolName}</span>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{tool.category}</span>
                      </div>
                      <div className="flex" style={{ gap: 4 }}>
                        <span className={`badge ${tool.confidence === 'High' ? 'badge-green' : tool.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {tool.confidence}
                        </span>
                        <span className={`badge ${tool.detectionMethod === 'Detected' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                          {tool.detectionMethod}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>
                      <div>Evidence: {tool.evidence}</div>
                      <div>Department: {tool.likelyDepartment} | Workflow: {tool.possibleWorkflow}</div>
                    </div>
                  </div>
                ))}

                {/* Copy button */}
                {detectedTools.length > 0 && (
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const report = detectedTools.map(t =>
                        `[${t.confidence}] ${t.toolName} (${t.category}) — ${t.detectionMethod}\n  Evidence: ${t.evidence}`
                      ).join('\n');
                      navigator.clipboard.writeText(`Tool Fingerprint Report\n${'='.repeat(40)}\n${report}`);
                    }}>
                      📋 Copy Tool Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: WORKFLOWS ─────────────────────────────────── */}
      {activeTab === 'workflows' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>⚙️ Inferred Workflows ({inferredWorkflows.length})</span>
          </div>
          <div className="card-body">
            {inferredWorkflows.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon icon="⚙️" />
                <EmptyStateTitle>No Workflows Detected</EmptyStateTitle>
                <EmptyStateDesc>Run Fetch & Analyse to discover workflow signals.</EmptyStateDesc>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('fetch')}>Fetch URLs</button>
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {inferredWorkflows.map((wf, i) => (
                  <div key={i} style={{
                    padding: 10, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', fontSize: 12,
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{wf.workflowName}</span>
                      <div className="flex" style={{ gap: 4 }}>
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>{wf.department}</span>
                        <span className={`badge ${wf.confidence === 'High' ? 'badge-green' : wf.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {wf.confidence}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>
                      <div>Evidence: {wf.evidence.slice(0, 200)}</div>
                      <div>Bottleneck: {wf.possibleBottleneck}</div>
                    </div>
                    <div style={{ color: '#10b981', fontSize: 11 }}>
                      💡 {wf.automationOpportunity}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: SUGGESTIONS ───────────────────────────────── */}
      {activeTab === 'suggestions' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>💡 Auto-Fill Suggestions ({suggestions.length})</span>
          </div>
          <div className="card-body">
            {suggestions.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon icon="💡" />
                <EmptyStateTitle>No Suggestions Yet</EmptyStateTitle>
                <EmptyStateDesc>Run Fetch & Analyse to generate auto-fill suggestions.</EmptyStateDesc>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('fetch')}>Fetch URLs</button>
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{
                    padding: 10, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', fontSize: 12,
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{s.field}</span>
                      <div className="flex" style={{ gap: 4 }}>
                        <span className={`badge ${s.source === 'Detected' ? 'badge-green' : s.source === 'Inferred' ? 'badge-amber' : s.source === 'User Provided' ? 'badge-blue' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {s.source}
                        </span>
                        <span className={`badge ${s.confidence === 'High' ? 'badge-green' : s.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {s.confidence}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: '#e2e8f0', marginBottom: 4 }}>{s.suggestedValue}</div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: '#64748b', fontSize: 11 }}>Evidence: {s.evidence}</span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApplySuggestion(s.field, s.suggestedValue)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {suggestions.length > 0 && (
              <div style={{ marginTop: 16, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                💡 Suggestions won't overwrite existing data — Apply buttons fill empty fields only
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: OPENINGS ──────────────────────────────────── */}
      {activeTab === 'openings' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>🎯 Auto-Discovered Openings ({openings.length})</span>
          </div>
          <div className="card-body">
            {openings.length === 0 ? (
              <EmptyState>
                <EmptyStateIcon icon="🎯" />
                <EmptyStateTitle>No Openings Discovered</EmptyStateTitle>
                <EmptyStateDesc>Run Fetch & Analyse to discover sales openings.</EmptyStateDesc>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('fetch')}>Fetch URLs</button>
              </EmptyState>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {openings.map((o, i) => (
                  <div key={i} style={{
                    padding: 12, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', fontSize: 12,
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{o.title}</span>
                      <span className={`badge ${o.confidence === 'High' ? 'badge-green' : o.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                        {o.confidence}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>
                      <div>Evidence: {o.sourceEvidence.slice(0, 200)}</div>
                      <div>What it suggests: {o.whatThisSuggests}</div>
                      <div>Why it matters: {o.whyItMatters}</div>
                    </div>
                    <div style={{ color: '#10b981', fontSize: 11, marginBottom: 4 }}>
                      🎯 First line: {o.firstLine}
                    </div>
                    <div style={{ color: '#3b82f6', fontSize: 11 }}>
                      ❓ Discovery Question: {o.discoveryQuestion}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                      ⚠️ Risk: {o.riskUncertainty}
                    </div>
                  </div>
                ))}
                {openings.length > 0 && (
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      const text = openings.map(o =>
                        `[${o.confidence}] ${o.title}\nEvidence: ${o.sourceEvidence}\nFirst Line: ${o.firstLine}\nDiscovery: ${o.discoveryQuestion}\n---`
                      ).join('\n');
                      navigator.clipboard.writeText(`Auto-Discovered Openings\n${'='.repeat(40)}\n${text}`);
                    }}>
                      📋 Copy Openings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: PEOPLE ──────────────────────────────────────── */}
      {activeTab === 'people' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>👤 Public People & Role Signals</span>
            {peopleRoleMap.length > 0 && <span className="badge badge-purple" style={{ fontSize: 10 }}>{peopleRoleMap.length} roles</span>}
          </div>
          <div className="card-body">

            {/* Safety Notice */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 11, color: '#94a3b8'
            }}>
              🛡️ <strong>Safety:</strong> Paste public business text only. Do not paste private profiles, private messages, login-only content, sensitive personal data, or anything obtained through restricted access. This tool does NOT scrape or log into any platform.
            </div>

            {/* Source Type & URL */}
            <div className="flex" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 200px' }}>
                <label className="input-label" style={{ fontSize: 11 }}>Source Type</label>
                <select
                  className="input"
                  value={peopleSourceType}
                  onChange={e => setPeopleSourceType(e.target.value as PeopleSignalSourceType)}
                  style={{ fontSize: 12 }}
                >
                  <option value="linkedin_company_about">LinkedIn Company About</option>
                  <option value="linkedin_company_post">LinkedIn Public Company Post</option>
                  <option value="linkedin_job_post">LinkedIn Public Job Post</option>
                  <option value="company_team_page">Company Team Page</option>
                  <option value="leadership_page">Leadership Page</option>
                  <option value="press_release">Press Release</option>
                  <option value="careers_page">Careers Page</option>
                  <option value="manual_role_notes">Manual Role Notes</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label" style={{ fontSize: 11 }}>Source URL</label>
                <input
                  className="input"
                  value={peopleSourceUrl}
                  onChange={e => setPeopleSourceUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/company/..."
                  style={{ fontSize: 12 }}
                />
              </div>
            </div>

            {/* Public Text Textarea */}
            <div className="input-group">
              <label className="input-label">Paste Public People / Company Text</label>
              <textarea
                className="input"
                rows={5}
                value={manualPeopleText}
                onChange={e => setManualPeopleText(e.target.value)}
                placeholder="Paste publicly available text from LinkedIn company pages, team pages, leadership pages, press releases, careers pages, or your own manual role notes..."
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Action Buttons */}
            {manualPeopleText && (
              <div className="flex" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyzePeopleText}
                  disabled={peopleAnalyzing}
                >
                  {peopleAnalyzing ? 'Analyzing...' : '🔍 Analyze Public People Notes'}
                </button>
                <button className="btn btn-secondary" onClick={handleClearPeopleNotes}>
                  🗑️ Clear People Notes
                </button>
              </div>
            )}

            {/* Analysis Results */}
            {hasPeopleSignals && (
              <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>

                {/* Role Map */}
                <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                  <span className="input-label" style={{ fontSize: 12 }}>🗺️ Role Map ({peopleRoleMap.length})</span>
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    {peopleRoleMap.map((r, i) => (
                      <div key={i} style={{
                        padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                        border: '1px solid #2a3a5c', fontSize: 11,
                      }}>
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.roleTitle}</span>
                          <div className="flex" style={{ gap: 4 }}>
                            <span className="badge badge-amber" style={{ fontSize: 9 }}>{r.department}</span>
                            <span className={`badge ${r.confidence === 'High' ? 'badge-green' : r.confidence === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 9 }}>{r.confidence}</span>
                          </div>
                        </div>
                        <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{r.evidence.slice(0, 120)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stakeholder Hypotheses */}
                {peopleStakeholderHyps.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                    <span className="input-label" style={{ fontSize: 12 }}>👥 Stakeholder Hypotheses ({peopleStakeholderHyps.length})</span>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {peopleStakeholderHyps.map((h, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                          border: '1px solid #2a3a5c', fontSize: 11,
                        }}>
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{h.roleTitle}</span>
                            <span className={`badge ${h.confidence === 'High' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 9 }}>{h.confidence}</span>
                          </div>
                          <div style={{ color: '#94a3b8', marginTop: 2 }}>Concern: {h.likelyConcern}</div>
                          <div style={{ color: '#3b82f6', marginTop: 2 }}>❓ {h.likelyDiscoveryQuestion}</div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Influence: {'⭐'.repeat(h.likelyBuyingInfluence)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hiring Signals */}
                {peopleHiringSignals.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                    <span className="input-label" style={{ fontSize: 12 }}>📋 Hiring Signals ({peopleHiringSignals.length})</span>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {peopleHiringSignals.map((h, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                          border: '1px solid #2a3a5c', fontSize: 11,
                        }}>
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{h.openRole || h.roleGap}</span>
                            {h.department && <span className="badge badge-blue" style={{ fontSize: 9 }}>{h.department}</span>}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{h.evidence.slice(0, 120)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestone Signals */}
                {peopleMilestoneSignals.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                    <span className="input-label" style={{ fontSize: 12 }}>🏆 Milestone Signals ({peopleMilestoneSignals.length})</span>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {peopleMilestoneSignals.map((m, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                          border: '1px solid #2a3a5c', fontSize: 11,
                        }}>
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{m.description}</span>
                            <span className="badge badge-amber" style={{ fontSize: 9 }}>{m.milestoneType}</span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{m.evidence.slice(0, 120)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outreach Angles */}
                {peopleOutreachAngles.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                    <span className="input-label" style={{ fontSize: 12 }}>🎯 Outreach Angles ({peopleOutreachAngles.length})</span>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {peopleOutreachAngles.map((o, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                          border: '1px solid #2a3a5c', fontSize: 11,
                        }}>
                          <div style={{ color: '#10b981' }}>{o.angleText}</div>
                          <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>Target: {o.targetRole} · Confidence: {o.confidence}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovery Questions */}
                {peopleDiscoveryQuestions.length > 0 && (
                  <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                    <span className="input-label" style={{ fontSize: 12 }}>❓ Discovery Questions ({peopleDiscoveryQuestions.length})</span>
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {peopleDiscoveryQuestions.map((q, i) => (
                        <div key={i} style={{
                          padding: '6px 10px', background: '#0f1525', borderRadius: 4,
                          border: '1px solid #2a3a5c', fontSize: 11,
                        }}>
                          <div className="flex items-center justify-between">
                            <span style={{ color: '#3b82f6' }}>❓ {q.question}</span>
                            <span className="badge badge-purple" style={{ fontSize: 9 }}>{q.targetRole}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integration Buttons */}
                <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                  <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleGenerateStakeholdersFromPeople}
                      disabled={peopleStakeholderHyps.length === 0}
                    >
                      👥 Generate Stakeholders from People Notes
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleCopyPeopleIntelligence}>
                      📋 Copy People Intelligence Brief
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
                    Source: {peopleSourceType.replace(/_/g, ' ')} · {peopleSourceUrl || 'No URL provided'}
                  </div>
            </div>

            </div>

            )}

            {!hasPeopleSignals && manualPeopleText.length > 0 && !peopleAnalyzing && (
              <div style={{
                marginTop: 16, padding: 16, background: '#0f1525', borderRadius: 6,
                border: '1px solid #2a3a5c', textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Click <strong>Analyze Public People Notes</strong> above to generate role signals, stakeholder hypotheses, hiring signals, milestone signals, outreach angles, and discovery questions from the pasted text.
                </div>
              </div>
            )}

            {peopleAnalyzing && (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 12 }}>
                🧠 Analyzing public people text...
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── TAB: APPLY ──────────────────────────────────────── */}
      {activeTab === 'apply' && (
        <div className="card">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>✅ Apply Recon Findings</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 16 }}>
              {/* Summary */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8,
              }}>
                {[
                  { label: 'URLs Discovered', value: discoveredUrls.length, color: '#3b82f6' },
                  { label: 'Tools Detected', value: detectedTools.length, color: '#10b981' },
                  { label: 'Workflows Found', value: inferredWorkflows.length, color: '#f59e0b' },
                  { label: 'Suggestions', value: suggestions.length, color: '#8b5cf6' },
                  { label: 'Openings', value: openings.length, color: '#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{
                    padding: 12, background: '#0f1525', borderRadius: 6,
                    border: '1px solid #2a3a5c', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleApplyAllToProfile}
                  disabled={scanStatus !== 'done' && suggestions.length === 0}
                >
                  ✅ Apply All to Company Profile
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleGeneratePainPoints}
                  disabled={inferredWorkflows.length === 0}
                >
                  ❌ Generate Pain Points from Recon
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateOpportunities}
                  disabled={openings.length === 0}
                >
                  ⚡ Generate Opportunities from Recon
                </button>
              </div>

              {suggestions.length > 0 && (
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  <p><strong>What "Apply All" does:</strong></p>
                  <ul style={{ margin: '4px 0', paddingLeft: 20, lineHeight: 1.8 }}>
                    <li>Fills empty company fields from suggestions (Industry, Description, Location, Tools)</li>
                    <li>Adds detected tools to Tool & Workflow Map</li>
                    <li>Adds inferred workflows as pain points</li>
                    <li>Adds discovered openings as opportunities</li>
                    <li>Saves all recon findings to the company record</li>
                  </ul>
                  <p style={{ marginTop: 8, color: '#f59e0b' }}>
                    ⚠️ Only fills empty fields — existing data is preserved.
                    Review individual suggestions on the Suggestions tab before bulk applying.
                  </p>
                </div>
              )}

              {/* Export buttons */}
              <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 16 }}>
                <div className="section-title" style={{ fontSize: 14 }}>📋 Copy Reports</div>
                <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = [
                      `Public Recon Summary for ${company.basic.name}`,
                      `Scan Date: ${new Date().toISOString().slice(0, 10)}`,
                      '',
                      `URLs Discovered: ${discoveredUrls.length}`,
                      `Tools Detected: ${detectedTools.length}`,
                      `Workflows Found: ${inferredWorkflows.length}`,
                      `Auto-Fill Suggestions: ${suggestions.length}`,
                      `Openings: ${openings.length}`,
                      '',
                      'Detected Tools:',
                      ...detectedTools.map(t => `  [${t.confidence}] ${t.toolName} (${t.category})`),
                      '',
                      'Inferred Workflows:',
                      ...inferredWorkflows.map(w => `  [${w.confidence}] ${w.workflowName} (${w.department})`),
                    ].join('\n');
                    navigator.clipboard.writeText(text);
                  }}>
                    📋 Recon Summary
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = [
                      `CRM-Ready Recon Brief: ${company.basic.name}`,
                      '='.repeat(50),
                      '',
                      'Detected Tools:',
                      ...detectedTools.map(t => `  ${t.toolName} — ${t.evidence}`),
                      '',
                      'Inferred Workflows:',
                      ...inferredWorkflows.map(w => `  ${w.workflowName}: ${w.discoveryQuestion}`),
                      '',
                      'Top Openings:',
                      ...openings.slice(0, 3).map(o => `  ${o.title}\n    First Line: ${o.firstLine}\n    Discovery: ${o.discoveryQuestion}`),
                      '',
                      'Suggested Demo Prompt:',
                      ...openings.slice(0, 1).map(o => `  ${o.suggestedBuildPrompt}`),
                    ].join('\n');
                    navigator.clipboard.writeText(text);
                  }}>
                    📋 CRM-Ready Brief
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = openings.map(o =>
                      `Opening: ${o.title}\nFirst Line: ${o.firstLine}\nDiscovery: ${o.discoveryQuestion}\n---`
                    ).join('\n');
                    navigator.clipboard.writeText(text);
                  }}>
                    📋 First Outreach Lines
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = openings.map(o =>
                      `Discovery: ${o.discoveryQuestion}`
                    ).join('\n');
                    navigator.clipboard.writeText(text);
                  }}>
                    📋 Discovery Questions
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const text = openings.map(o => o.suggestedBuildPrompt).filter(Boolean).join('\n---\n');
                    navigator.clipboard.writeText(text);
                  }}>
                    📋 Native.Builder Prompts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}