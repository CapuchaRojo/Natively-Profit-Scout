// ============================================================
// Partner Intel Brief Engine — v1.0
// Synthesizes all company data into a structured partner brief
// ============================================================

import { Company, PartnerIntelBrief, PartnerIntelSection, IntelSource, ConfidenceLevel } from '../types';

// ── Helpers ──────────────────────────────────────────────────

function section(
  title: string,
  body: string,
  source: IntelSource = 'public',
  confidence: ConfidenceLevel = 'Medium',
  evidenceUrls: string[] = [],
  internalNotes?: string
): PartnerIntelSection {
  return { title, body, source, confidence, evidenceUrls, internalNotes };
}

function emptySection(title: string): PartnerIntelSection {
  return section(title, 'No data available yet. Run Auto-Fill Recon or add internal context.', 'assumed', 'Low');
}

function joinNonEmpty(parts: (string | undefined | null)[], sep = '. '): string {
  return parts.filter(Boolean).join(sep) || 'Not enough data.';
}

function elide(s: string | undefined | null, max = 300): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function urlFromRecon(company: Company): string[] {
  if (!company.reconFindings) return [];
  return company.reconFindings.discoveredUrls
    .filter(u => u.status === 'scanned' || u.status === 'analyzed')
    .map(u => u.url);
}

function urlFromAggressive(company: Company): string[] {
  if (!company.aggressiveRecon) return [];
  const urls: string[] = [];
  if (company.aggressiveRecon.linkedInResearchUrls) {
    urls.push(...company.aggressiveRecon.linkedInResearchUrls.map(u => u.url));
  }
  if (company.aggressiveRecon.socialDiscoveryUrls) {
    urls.push(...company.aggressiveRecon.socialDiscoveryUrls.map(u => u.url));
  }
  return urls;
}

function allUrls(company: Company): string[] {
  return [...new Set([...urlFromRecon(company), ...urlFromAggressive(company)])];
}

// ── Section Generators ───────────────────────────────────────

function buildCompanySummary(company: Company): PartnerIntelSection {
  const b = company.basic;
  const p = company.profile;
  const ar = company.aggressiveRecon;

  let body = '';

  if (p?.summary) {
    body += `**Profile:** ${p.summary}\n\n`;
  }

  body += `**Industry:** ${b.industry || 'Unknown'} | **Location:** ${b.location || 'Unknown'} | **Employees:** ~${b.employeeCount || '?'}`;
  if (b.revenueEstimate) body += ` | **Revenue:** ${b.revenueEstimate}`;

  if (p?.businessModel) {
    body += `\n\n**Business Model:** ${p.businessModel}`;
  }
  if (p?.customerSegments) {
    body += `\n**Customer Segments:** ${p.customerSegments}`;
  }

  if (ar?.linkedInCompany?.description) {
    body += `\n\n**LinkedIn Description:** ${elide(ar.linkedInCompany.description, 200)}`;
  }

  const confidence = p?.summary ? 'High' : 'Medium';
  return section('Company Summary', body, 'public', confidence, allUrls(company));
}

function buildLeadershipMap(company: Company): PartnerIntelSection {
  const p = company.people;
  const ar = company.aggressiveRecon;
  const rf = company.reconFindings;
  const lines: string[] = [];
  const evidenceUrls: string[] = [];

  // From people data
  if (p.leadership) lines.push(`**Leadership (manual):** ${elide(p.leadership)}`);
  if (p.salesTeam) lines.push(`**Sales/GTM:** ${elide(p.salesTeam)}`);
  if (p.technicalTeam) lines.push(`**Technical:** ${elide(p.technicalTeam)}`);
  if (p.knownChampions) lines.push(`**Known Champions:** ${elide(p.knownChampions)}`);
  if (p.knownBlockers) lines.push(`**Known Blockers:** ${elide(p.knownBlockers)}`);

  // From aggressive recon
  if (ar?.extractedPeople && ar.extractedPeople.length > 0) {
    const people = ar.extractedPeople.map(ep =>
      `- ${ep.name}${ep.role ? ` — ${ep.role}` : ''} (${ep.department || 'unknown dept'}, ${ep.confidence})`
    );
    lines.push(`\n**Extracted from public sources:**\n${people.join('\n')}`);
    evidenceUrls.push(...ar.extractedPeople.map(ep => ep.sourceUrl).filter(Boolean) as string[]);
  }

  // From recon findings people signals
  if (rf?.peopleSignals?.roleMap && rf.peopleSignals.roleMap.length > 0) {
    const roles = rf.peopleSignals.roleMap.map(r =>
      `- ${r.roleTitle} (${r.department}, ${r.confidence})`
    );
    lines.push(`\n**Role map (public):**\n${roles.join('\n')}`);
  }

  if (rf?.publicLeadershipText) {
    lines.push(`\n**Leadership notes:** ${rf.publicLeadershipText}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No leadership data available.';
  const source: IntelSource = (p.leadership || p.knownChampions) ? 'internal_context' : 'public';
  return section('Leadership / Stakeholder Map', body, source, 'Medium', evidenceUrls);
}

function buildRelatedEntities(company: Company): PartnerIntelSection {
  const ar = company.aggressiveRecon;
  const lines: string[] = [];
  const evidenceUrls: string[] = [];

  if (ar?.linkedInCompany?.growthIndicators && ar.linkedInCompany.growthIndicators.length > 0) {
    lines.push(`**Growth indicators:** ${ar.linkedInCompany.growthIndicators.join(', ')}`);
  }

  if (ar?.linkedInJobs && ar.linkedInJobs.length > 0) {
    const jobs = ar.linkedInJobs.map(j => `- ${j.title} (${j.department})`);
    lines.push(`\n**LinkedIn job postings:**\n${jobs.join('\n')}`);
  }

  // Check for sibling brands in public intel
  const signals = company.publicIntelSignals || [];
  const partnershipSignals = signals.filter(s => s.category === 'partnership_signal');
  if (partnershipSignals.length > 0) {
    lines.push(`\n**Partnership signals:** ${partnershipSignals.map(s => s.title).join('; ')}`);
    evidenceUrls.push(...partnershipSignals.map(s => s.sourceReference).filter(Boolean));
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No related entities or brands detected from public sources.';
  return section('Related Entities / Brands', body, 'public', 'Low', evidenceUrls);
}

function buildPublicPositioning(company: Company): PartnerIntelSection {
  const p = company.profile;
  const ar = company.aggressiveRecon;
  const lines: string[] = [];

  if (p?.publicPositioning) {
    lines.push(`**Public positioning:** ${p.publicPositioning}`);
  }
  if (p?.operationalMaturity) {
    lines.push(`**Operational maturity:** ${p.operationalMaturity.level} (${p.operationalMaturity.confidence})`);
  }
  if (p?.digitalMaturity) {
    lines.push(`**Digital maturity:** ${p.digitalMaturity.level} (${p.digitalMaturity.confidence})`);
  }
  if (p?.aiReadiness) {
    lines.push(`**AI readiness:** ${p.aiReadiness.level} (${p.aiReadiness.confidence})`);
  }
  if (p?.budgetLikelihood) {
    lines.push(`**Budget likelihood:** ${p.budgetLikelihood.level} (${p.budgetLikelihood.confidence})`);
  }

  if (ar?.linkedInCompany?.description) {
    lines.push(`\n**How they describe themselves (LinkedIn):** ${elide(ar.linkedInCompany.description)}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No public positioning data available.';
  return section('Public Positioning', body, 'public', p?.publicPositioning ? 'Medium' : 'Low', allUrls(company));
}

function buildToolStackCompetitors(company: Company): PartnerIntelSection {
  const rf = company.reconFindings;
  const t = company.tools;
  const lines: string[] = [];
  const evidenceUrls: string[] = [];

  // Manual tools
  if (t.crm) lines.push(`**CRM:** ${t.crm}`);
  if (t.websitePlatform) lines.push(`**Website:** ${t.websitePlatform}`);
  if (t.emailTools) lines.push(`**Email:** ${t.emailTools}`);
  if (t.projectManagement) lines.push(`**Project Mgmt:** ${t.projectManagement}`);
  if (t.communicationTools) lines.push(`**Comms:** ${t.communicationTools}`);
  if (t.supportTools) lines.push(`**Support:** ${t.supportTools}`);
  if (t.billingTools) lines.push(`**Billing:** ${t.billingTools}`);
  if (t.automationTools) lines.push(`**Automation:** ${t.automationTools}`);
  if (t.aiTools) lines.push(`**AI:** ${t.aiTools}`);

  // Detected tools
  if (rf?.detectedTools && rf.detectedTools.length > 0) {
    const tools = rf.detectedTools.map(dt =>
      `- ${dt.toolName} (${dt.category}, ${dt.confidence}) — ${dt.evidence}`
    );
    lines.push(`\n**Detected from public pages:**\n${tools.join('\n')}`);
    evidenceUrls.push(...rf.detectedTools.map(dt => dt.sourceUrl).filter(Boolean));
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No tool stack data available.';
  const source: IntelSource = t.crm ? 'internal_context' : 'public';
  return section('Current Tool Stack / Competitor Usage', body, source, 'Medium', evidenceUrls);
}

function buildWorkflowsAndPainPoints(company: Company): PartnerIntelSection {
  const rf = company.reconFindings;
  const pp = company.painPoints;
  const lines: string[] = [];
  const evidenceUrls: string[] = [];

  if (rf?.inferredWorkflows && rf.inferredWorkflows.length > 0) {
    const wfs = rf.inferredWorkflows.map(w =>
      `- **${w.workflowName}** (${w.department}): ${w.likelyCurrentProcess}. Bottleneck: ${w.possibleBottleneck}. Auto opp: ${w.automationOpportunity}`
    );
    lines.push(`**Inferred workflows:**\n${wfs.join('\n')}`);
  }

  if (pp && pp.length > 0) {
    const pains = pp.map(p =>
      `- **${p.name}** (${p.department}, severity ${p.severity}/5): ${p.symptoms}. Cost: ${p.likelyCost}`
    );
    lines.push(`\n**Identified pain points:**\n${pains.join('\n')}`);
  }

  if (rf?.openings && rf.openings.length > 0) {
    const tops = rf.openings.slice(0, 3).map(o =>
      `- ${o.title}: ${o.whatThisSuggests}`
    );
    lines.push(`\n**Top recon openings:**\n${tops.join('\n')}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No workflow or pain point data available.';
  return section('Likely Workflows & Pain Points', body, 'inferred', pp.length > 0 ? 'Medium' : 'Low', evidenceUrls);
}

function buildBuilderFit(company: Company): PartnerIntelSection {
  const fs = company.fitScore;
  const opps = company.opportunities;
  const lines: string[] = [];

  if (fs) {
    lines.push(`**Builder Fit Score:** ${fs.builderFit}/10`);
    if (fs.reasons) lines.push(`**Reasons:** ${fs.reasons.join('; ')}`);
  }

  if (opps && opps.length > 0) {
    const builderOpps = opps.filter(o => o.opportunityType === 'internal_dashboard' || o.opportunityType === 'client_portal' || o.opportunityType === 'custom' || o.opportunityType === 'internal_tool');
    if (builderOpps.length > 0) {
      lines.push(`\n**Builder opportunities (${builderOpps.length}):**`);
      builderOpps.forEach(o => {
        lines.push(`- ${o.title}: ${o.businessProblem} → ${o.proposedSolution || o.nativelyBuildIdea}`);
      });
    }
  }

  const p = company.profile;
  if (p?.digitalMaturity) {
    lines.push(`\n**Digital maturity:** ${p.digitalMaturity.level} — ${p.digitalMaturity.level === 'High' ? 'Likely ready for custom builds' : 'May need onboarding'}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'Not enough data to assess Builder fit.';
  return section('Fit for Native.Builder', body, 'inferred', fs ? 'Medium' : 'Low', allUrls(company));
}

function buildComputeRelayFit(company: Company): PartnerIntelSection {
  const fs = company.fitScore;
  const pp = company.providerProfile;
  const lines: string[] = [];

  if (fs) {
    lines.push(`**Compute Fit:** ${fs.computeFit}/10 | **Relay Fit:** ${fs.relayFit}/10 | **Provider Fit:** ${fs.providerFit}/10`);
  }

  if (pp) {
    lines.push(`\n**Provider type:** ${pp.providerType}`);
    if (pp.gpuCapacityNotes) lines.push(`**GPU capacity:** ${pp.gpuCapacityNotes}`);
    if (pp.infrastructureType) lines.push(`**Infrastructure:** ${pp.infrastructureType}`);
    if (pp.region) lines.push(`**Region:** ${pp.region}`);
    if (pp.computeFitScore) lines.push(`**Compute fit score:** ${pp.computeFitScore}`);
    if (pp.willemNotes) lines.push(`**Willem's notes:** ${elide(pp.willemNotes)}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'Not enough data to assess Compute/Relay fit.';
  return section('Fit for Native.Compute / Relay', body, 'internal_context', pp ? 'Medium' : 'Low', pp?.providerEvidenceUrls || []);
}

function buildChannelPartnerFit(company: Company): PartnerIntelSection {
  const b = company.basic;
  const lines: string[] = [];
  const evidenceUrls: string[] = [];

  // Check if they're a "partner" or "provider" account type
  const isPartner = company.accountType === 'partner' || company.accountType === 'compute_provider';
  const isProvider = !!company.providerProfile;

  if (isPartner || isProvider) {
    lines.push(`**Account type:** ${company.accountType} — ${isProvider ? 'Has provider profile' : 'No provider profile'}`);
  }

  // Check for consulting/reseller signals
  if (b.industry) {
    const consultingKeywords = ['consulting', 'agency', 'digital', 'software', 'it services', 'system integrator', 'reseller', 'msp'];
    const match = consultingKeywords.find(k => b.industry.toLowerCase().includes(k));
    if (match) {
      lines.push(`**Industry signals:** "${b.industry}" suggests potential channel/reseller fit.`);
    }
  }

  if (company.profile?.businessModel) {
    lines.push(`**Business model:** ${company.profile.businessModel}`);
  }

  if (company.publicIntelSignals) {
    const partnerSignals = company.publicIntelSignals.filter(s => s.category === 'partnership_signal');
    if (partnerSignals.length > 0) {
      lines.push(`\n**Partnership signals detected:** ${partnerSignals.length}`);
      evidenceUrls.push(...partnerSignals.map(s => s.sourceReference).filter(Boolean));
    }
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No clear channel/partner indicators. Consider exploring further.';
  return section('Fit as Channel / Reseller / Consulting Partner', body, 'inferred', 'Low', evidenceUrls);
}

function buildRisksAndUnknowns(company: Company): PartnerIntelSection {
  const lines: string[] = [];
  const b = company.basic;
  const p = company.profile;

  if (!b.website) lines.push('- **No website** — cannot verify company exists');
  if (!b.industry) lines.push('- **Unknown industry** — cannot assess market fit');
  if (!b.employeeCount || b.employeeCount === 0) lines.push('- **Unknown employee count** — cannot gauge size fit');
  if (!b.revenueEstimate) lines.push('- **No revenue estimate** — budget risk');
  if (p?.salesDifficulty && (p.salesDifficulty.level === 'High')) lines.push('- **High sales difficulty** flagged by profile');

  if (company.reconFindings) {
    const failed = company.reconFindings.discoveredUrls.filter(u => u.status === 'failed' || u.status === 'blocked');
    if (failed.length > 0) lines.push(`- **${failed.length} URLs failed/blocked** during recon — data gaps exist`);
  }

  if (!company.reconFindings || company.reconFindings.status === 'pending') {
    lines.push('- **No recon data** — run Auto-Fill Recon for public intelligence');
  }

  if (lines.length === 0) lines.push('No critical risks identified from available data.');

  return section('Risks & Unknowns', lines.join('\n'), 'inferred', 'Medium');
}

function buildCtoBuyerObjections(company: Company): PartnerIntelSection {
  const stakeholders = company.stakeholders || [];
  const blockers = stakeholders.filter(s => s.category === 'blocker' || s.accessStatus === 'blocker');
  const lines: string[] = [];

  if (blockers.length > 0) {
    lines.push('**Known blockers:**');
    blockers.forEach(s => {
      lines.push(`- ${s.role}: ${s.likelyObjections || 'No specific objections recorded'}`);
    });
  }

  // Common objections based on maturity
  const p = company.profile;
  if (p?.digitalMaturity?.level === 'Low') {
    lines.push('- **Low digital maturity** — may object to "we can build that ourselves" or "too complex"');
  }
  if (p?.aiReadiness?.level === 'Low') {
    lines.push('- **Low AI readiness** — may need education on AI/automation value');
  }
  if (p?.budgetLikelihood?.level === 'Low') {
    lines.push('- **Budget concerns** — pricing objection likely');
  }

  // From tool stack
  if (company.tools.aiTools) {
    lines.push(`- **Already using AI tools (${company.tools.aiTools})** — may have "we already have AI" objection`);
  }

  if (lines.length === 0) {
    lines.push('No specific objections identified. Standard objections likely: budget, timing, build-vs-buy, existing vendor relationships.');
  }

  return section('Likely CTO / Buyer Objections', lines.join('\n'), 'inferred', 'Medium');
}

function buildRecommendedDemoAngle(company: Company): PartnerIntelSection {
  const p = company.profile;
  const opps = company.opportunities;
  const lines: string[] = [];

  if (p?.bestConversationAngle) {
    lines.push(`**Best conversation angle:** ${p.bestConversationAngle}`);
  }

  if (opps && opps.length > 0) {
    const best = opps[0];
    lines.push(`\n**Top opportunity:** ${best.title}`);
    if (best.suggestedDemoAngle) lines.push(`**Demo angle:** ${best.suggestedDemoAngle}`);
    if (best.suggestedBuildPrompt) lines.push(`**Build prompt:** ${best.suggestedBuildPrompt}`);
    if (best.discoveryQuestions) lines.push(`**Discovery questions:** ${best.discoveryQuestions}`);
  }

  if (company.reconFindings?.openings && company.reconFindings.openings.length > 0) {
    const top = company.reconFindings.openings[0];
    lines.push(`\n**Top recon opening:** ${top.title}`);
    lines.push(`**First line:** ${top.firstLine}`);
    lines.push(`**Demo:** ${top.suggestedNativelyDemo}`);
    if (top.suggestedBuildPrompt) lines.push(`**Build:** ${top.suggestedBuildPrompt}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'Not enough data for a targeted demo angle. Run opportunity analysis first.';
  return section('Recommended Demo Angle', body, 'inferred', opps.length > 0 ? 'Medium' : 'Low');
}

function buildValidationPlan(company: Company): PartnerIntelSection {
  const lines = [
    '**Suggested validation steps:**',
    '',
    '1. **Verify company basics:** Confirm website, employee count, and industry via LinkedIn Company page.',
    '2. **Confirm leadership:** Cross-reference extracted people with LinkedIn profiles.',
    '3. **Validate tool stack:** Check BuiltWith or Wappalyzer for confirmed tools.',
    '4. **Test pain points:** Use discovery calls to validate the top 3 inferred pain points.',
    '5. **Assess budget:** Look for funding announcements, recent hires, or tech investment signals.',
    '6. **Verify partner fit:** If channel/partner, confirm their existing partner ecosystem.',
  ];

  if (!company.reconFindings || company.reconFindings.status === 'pending') {
    lines.push('\n⚠️ **Priority:** Run Auto-Fill Recon to gather public intelligence before validation calls.');
  }

  return section('Suggested Validation Plan', lines.join('\n'), 'internal_context', 'Medium');
}

function buildAccessCreditsRecommendation(company: Company): PartnerIntelSection {
  const fs = company.fitScore;
  const total = fs?.total || 0;
  const lines: string[] = [];

  if (total >= 7) {
    lines.push('**Recommendation:** Fast-track with demo credits + pilot access.');
    lines.push('- Offer: Free Builder pilot (1-month) with a specific use case build.');
    lines.push('- Credits: $500–$1,000 in compute credits for initial build.');
  } else if (total >= 4) {
    lines.push('**Recommendation:** Standard access with limited demo credits.');
    lines.push('- Offer: Guided demo + 14-day trial with $250 in credits.');
    lines.push('- Focus on one high-impact use case.');
  } else {
    lines.push('**Recommendation:** Discovery-first. No credits yet.');
    lines.push('- Offer: Free discovery workshop / demo.');
    lines.push('- Validate fit before committing credits.');
  }

  if (company.providerProfile) {
    lines.push('\n**Provider note:** If this is a compute provider, offer reciprocal testing — their GPUs for our Builder credits.');
  }

  return section('Access / Credits / Pilot Recommendation', lines.join('\n'), 'internal_context', 'Medium');
}

function buildPartnerOpportunityScore(company: Company): PartnerIntelSection & { score: number; maxScore: number } {
  let score = 0;
  const max = 10;
  const reasons: string[] = [];

  // Scoring dimensions
  const b = company.basic;
  const p = company.profile;
  const fs = company.fitScore;

  if (b.website) score += 1;
  if (b.industry) score += 0.5;
  if (b.employeeCount > 10) score += 0.5;
  if (b.employeeCount > 50) score += 0.5;
  if (b.revenueEstimate) score += 0.5;

  if (p?.digitalMaturity?.level === 'High') score += 1;
  else if (p?.digitalMaturity?.level === 'Medium') score += 0.5;

  if (p?.aiReadiness?.level === 'High') score += 1;
  else if (p?.aiReadiness?.level === 'Medium') score += 0.5;

  if (p?.budgetLikelihood?.level === 'High') score += 1;
  else if (p?.budgetLikelihood?.level === 'Medium') score += 0.5;

  if (fs) {
    score += Math.min(fs.total / 10, 2);
  }

  if (company.opportunities && company.opportunities.length > 0) score += 0.5;
  if (company.opportunities && company.opportunities.length >= 3) score += 0.5;

  if (company.reconFindings && company.reconFindings.status === 'analyzed') score += 0.5;

  const rounded = Math.round(score * 10) / 10;

  let verdict = '';
  if (rounded >= 8) {
    verdict = '🔥 **High priority** — Strong partner opportunity. Move to outreach immediately.';
    reasons.push('Strong digital maturity and budget signals');
  } else if (rounded >= 5) {
    verdict = '🟡 **Medium priority** — Worth pursuing. Validate with more research.';
    reasons.push('Moderate signals — some data gaps remain');
  } else if (rounded >= 3) {
    verdict = '🔵 **Low priority** — Monitor for now. May become interesting later.';
    reasons.push('Insufficient positive signals to justify immediate outreach');
  } else {
    verdict = '⚪ **Not enough data** — Run recon and analysis first.';
    reasons.push('Critical data missing');
  }

  const body = [
    `**Score:** ${rounded}/${max}`,
    '',
    verdict,
    '',
    reasons.map(r => `- ${r}`).join('\n'),
  ].join('\n');

  return { ...section('Partner Opportunity Score', body, 'inferred', 'Medium'), score: rounded, maxScore: max };
}

function buildRecommendedNextAction(company: Company): PartnerIntelSection {
  const lines: string[] = [];
  const fs = company.fitScore;
  const rf = company.reconFindings;

  if (!rf || rf.status === 'pending') {
    lines.push('**Immediate:** Run Auto-Fill Recon to gather public intelligence.');
    lines.push('**Then:** Review detected tools, workflows, and openings.');
    return section('Recommended Next Action', lines.join('\n'), 'internal_context', 'High');
  }

  if (rf.status === 'scanned' && !rf.openings?.length) {
    lines.push('**Next:** Analyze fetched pages to extract openings and signals.');
    lines.push('**Then:** Generate opportunities from the recon data.');
    return section('Recommended Next Action', lines.join('\n'), 'internal_context', 'High');
  }

  if (company.opportunities && company.opportunities.length > 0) {
    const top = company.opportunities[0];
    lines.push(`**Next:** Build a demo for "${top.title}" using the suggested build prompt.`);
    if (top.discoveryQuestions) lines.push(`**Discovery call:** Use these questions: ${top.discoveryQuestions}`);
    lines.push('**Goal:** Schedule a demo within 7 days.');
  } else {
    lines.push('**Next:** Run Opportunity Engine to generate targeted opportunities.');
    lines.push('**Goal:** Identify 3+ concrete demo angles.');
  }

  if (fs && fs.total >= 7) {
    lines.push('\n**Accelerate:** This is a high-fit account. Prioritize outreach this week.');
  }

  return section('Recommended Next Action', lines.join('\n'), 'internal_context', 'Medium');
}

function buildInternalContextNotes(company: Company): PartnerIntelSection {
  const lines: string[] = [];
  const b = company.basic;

  if (b.notes) {
    lines.push(`**General notes:** ${b.notes}`);
  }

  if (company.comments && company.comments.length > 0) {
    const recent = company.comments.slice(-3);
    lines.push('\n**Recent comments:**');
    recent.forEach(c => {
      lines.push(`- [${c.type}] ${c.author ? `${c.author}: ` : ''}${elide(c.body, 200)}`);
    });
  }

  if (company.salesContext) {
    const sc = company.salesContext;
    if (sc.approachReason) lines.push(`\n**Approach reason:** ${sc.approachReason}`);
    if (sc.likelyBusinessPain) lines.push(`**Business pain:** ${sc.likelyBusinessPain}`);
    if (sc.desiredResult) lines.push(`**Desired result:** ${sc.desiredResult}`);
    if (sc.dealChampion) lines.push(`**Champion:** ${sc.dealChampion}`);
    if (sc.dealBlocker) lines.push(`**Blocker:** ${sc.dealBlocker}`);
  }

  if (company.pipelineStatus) {
    lines.push(`\n**Pipeline status:** ${company.pipelineStatus}`);
  }
  if (company.owner) {
    lines.push(`**Owner:** ${company.owner}`);
  }
  if (company.nextAction) {
    lines.push(`**Next action:** ${company.nextAction}`);
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No internal context notes. Add notes in the Company Profile or Pipeline Scout.';
  return section('Internal-Context Notes', body, 'internal_context', 'High');
}

// ── Main Generator ───────────────────────────────────────────

export function generatePartnerIntelBrief(company: Company): PartnerIntelBrief {
  const allSourceUrls = allUrls(company);
  const hasInternal = !!(company.basic.notes || company.comments?.length || company.salesContext?.approachReason);

  return {
    companyId: company.id,
    companyName: company.basic.name,
    generatedAt: new Date().toISOString(),
    companySummary: buildCompanySummary(company),
    leadershipMap: buildLeadershipMap(company),
    relatedEntities: buildRelatedEntities(company),
    publicPositioning: buildPublicPositioning(company),
    toolStackCompetitors: buildToolStackCompetitors(company),
    workflowsAndPainPoints: buildWorkflowsAndPainPoints(company),
    builderFit: buildBuilderFit(company),
    computeRelayFit: buildComputeRelayFit(company),
    channelPartnerFit: buildChannelPartnerFit(company),
    risksAndUnknowns: buildRisksAndUnknowns(company),
    ctoBuyerObjections: buildCtoBuyerObjections(company),
    recommendedDemoAngle: buildRecommendedDemoAngle(company),
    validationPlan: buildValidationPlan(company),
    accessCreditsRecommendation: buildAccessCreditsRecommendation(company),
    partnerOpportunityScore: buildPartnerOpportunityScore(company),
    recommendedNextAction: buildRecommendedNextAction(company),
    internalContextNotes: buildInternalContextNotes(company),
    dataFreshness: company.reconFindings?.status === 'analyzed' ? 'fresh' : 'stale',
    sourcesUsed: allSourceUrls,
    internalContextPasted: hasInternal,
  };
}