// ============================================================
// Public Lead Discovery Service (v1.0)
// Safe, public-source-only candidate generation
// ============================================================
import type { PipelineDiscoveryCandidate, AccountType, ProductLane, ProviderType, ConfidenceLevel } from '../types';

interface DiscoveryInput {
  query: string;
  industry?: string;
  region?: string;
  accountTypeTarget?: AccountType;
  productLaneTarget?: ProductLane;
  seedUrls?: string[];
  seedNames?: string[];
}

export function generateDiscoveryCandidates(input: DiscoveryInput): PipelineDiscoveryCandidate[] {
  const candidates: PipelineDiscoveryCandidate[] = [];

  // Generate candidates from seed names (team-provided target lists)
  if (input.seedNames && input.seedNames.length > 0) {
    for (const name of input.seedNames) {
      if (!name.trim()) continue;
      const candidate = createSeedCandidate(name.trim(), input);
      if (candidate) candidates.push(candidate);
    }
  }

  // Generate candidates from seed URLs
  if (input.seedUrls && input.seedUrls.length > 0) {
    for (const url of input.seedUrls) {
      if (!url.trim()) continue;
      const name = extractCompanyNameFromUrl(url.trim());
      const candidate = createSeedCandidate(name, { ...input, seedUrls: [url.trim()] });
      if (candidate) candidates.push(candidate);
    }
  }

  // Generate synthetic candidates from query + industry
  if (input.query && input.query.trim()) {
    const synthetic = generateSyntheticCandidates(input);
    candidates.push(...synthetic);
  }

  // Deduplicate by name
  const seen = new Set<string>();
  return candidates.filter(c => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createSeedCandidate(name: string, input: DiscoveryInput): PipelineDiscoveryCandidate {
  const lower = name.toLowerCase();
  const isProvider =
    /\b(gpu|compute|cloud|hosting|data.?center|colo|infrastructure|server|hardware)\b/i.test(name) ||
    /\b(provider|partner|reseller|capacity|bandwidth)\b/i.test(name);
  const isPartner =
    /\b(partner|agency|consulting|studio|labs?|ventures?)\b/i.test(lower) && !isProvider;

  let accountType: AccountType = 'unknown';
  let productLane: ProductLane = 'unknown';
  let providerType: ProviderType | undefined;

  if (input.accountTypeTarget && input.accountTypeTarget !== 'unknown') {
    accountType = input.accountTypeTarget;
  } else if (isProvider) {
    accountType = 'compute_provider';
  } else if (isPartner) {
    accountType = 'partner';
  } else {
    accountType = 'client_lead';
  }

  if (input.productLaneTarget && input.productLaneTarget !== 'unknown') {
    productLane = input.productLaneTarget;
  } else if (accountType === 'compute_provider') {
    productLane = 'compute';
  } else {
    productLane = 'builder';
  }

  if (accountType === 'compute_provider') {
    if (/\b(gpu|nvidia|cuda)\b/i.test(name)) providerType = 'gpu_provider';
    else if (/\b(data.?center|colo)\b/i.test(name)) providerType = 'data_center';
    else if (/\b(cloud|hosting)\b/i.test(name)) providerType = 'cloud_partner';
    else if (/\b(edge)\b/i.test(name)) providerType = 'edge_compute';
    else if (/\b(hardware)\b/i.test(name)) providerType = 'hardware_partner';
    else if (/\b(chip|silicon|semiconductor|fabrication|foundry)\b/i.test(name)) providerType = 'chip_manufacturer';
    else if (/\b(reseller|infrastructure.*resale|capacity.*partner)\b/i.test(name)) providerType = 'infrastructure_reseller';
    else if (/\b(hyperscale|aws|azure|gcp|google.*cloud|amazon.*web)\b/i.test(name)) providerType = 'hyperscaler';
    else if (/\b(neo.?cloud|next.?gen.*cloud|cloud.*native.*infra)\b/i.test(name)) providerType = 'neo_cloud';
    else providerType = 'unknown';
  }

  return {
    id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    website: input.seedUrls?.[0] || '',
    accountTypeSuggestion: accountType,
    productLaneSuggestion: productLane,
    providerTypeSuggestion: providerType,
    confidence: input.seedNames ? 'Medium' : 'Low',
    reason: input.seedNames
      ? `Manually added from team-provided target list`
      : `Generated from seed URL: ${input.seedUrls?.[0] || 'unknown'}`,
    evidenceUrls: input.seedUrls || [],
    suggestedNextAction: 'Research company website and add to pipeline',
    industry: input.industry,
    region: input.region,
  };
}

function generateSyntheticCandidates(input: DiscoveryInput): PipelineDiscoveryCandidate[] {
  // Generate industry-specific search URLs and candidate suggestions
  const candidates: PipelineDiscoveryCandidate[] = [];
  const query = input.query.trim();
  const industry = input.industry || '';
  const region = input.region || '';

  // Generate search-based discovery links (not scraping — just generating
  // URLs the user can open in a browser for manual research)
  const searchTerms = [
    `${query} ${industry}`,
    `${query} ${region}`,
    `${query} company`,
    `${query} provider`,
    `${industry} company ${region}`,
  ];

  for (const term of searchTerms.slice(0, 3)) {
    candidates.push({
      id: `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `Search: ${term}`,
      website: '',
      accountTypeSuggestion: input.accountTypeTarget || 'unknown',
      productLaneSuggestion: input.productLaneTarget || 'unknown',
      confidence: 'Low',
      reason: `Generated search target for: "${term}". Open in browser to discover companies matching these criteria.`,
      evidenceUrls: [`https://www.google.com/search?q=${encodeURIComponent(term)}`],
      suggestedNextAction: `Search for "${term}" and manually add promising results to pipeline`,
      industry: input.industry,
      region: input.region,
    });
  }

  return candidates;
}

function extractCompanyNameFromUrl(url: string): string {
  try {
    const hostname = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const parts = hostname.split('.');
    // Find the domain name part (usually the second-to-last segment, or first for .co.uk etc.)
    let name = parts[0];
    if (parts.length >= 2 && parts[0] === 'www') {
      name = parts[1];
    }
    // Convert to title case
    return name
      .split(/[-_]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return url;
  }
}

// ── Brief Generators ──

export function generateClientSalesBrief(company: {
  basic: { name: string; industry: string; website: string; notes: string };
  business: { productsServices: string; targetCustomers: string };
  painPoints: { name: string; symptoms: string }[];
  stakeholders: { role: string; department: string }[];
  fitScore?: import('../types').FitScore;
}): string {
  const lines: string[] = [
    `📋 Natively Sales Brief: ${company.basic.name}`,
    '='.repeat(55),
    '',
    `Industry: ${company.basic.industry || 'Unknown'}`,
    `Website: ${company.basic.website || 'N/A'}`,
    '',
    'Company Summary:',
    `  ${company.business.productsServices || company.basic.notes || 'No summary available.'}`,
    '',
  ];

  if (company.fitScore) {
    lines.push('Fit Scores:');
    lines.push(`  Builder: ${company.fitScore.builderFit}/100  |  Relay: ${company.fitScore.relayFit}/100  |  Compute: ${company.fitScore.computeFit}/100`);
    lines.push(`  Overall: ${company.fitScore.total}/100 (${company.fitScore.confidence})`);
    if (company.fitScore.reasons.length > 0) {
      lines.push('  Key signals:');
      company.fitScore.reasons.slice(0, 5).forEach(r => lines.push(`    • ${r}`));
    }
    lines.push('');
  }

  if (company.painPoints.length > 0) {
    lines.push('Likely Pain Points:');
    company.painPoints.slice(0, 5).forEach(p => lines.push(`  • ${p.name}: ${p.symptoms.slice(0, 100)}`));
    lines.push('');
  }

  if (company.stakeholders.length > 0) {
    lines.push('Key Stakeholders:');
    company.stakeholders.slice(0, 5).forEach(s => lines.push(`  • ${s.role} (${s.department})`));
    lines.push('');
  }

  lines.push('Discovery Questions:');
  lines.push('  • What does your current workflow look like for [key process]?');
  lines.push('  • How much time does your team spend on manual/repetitive tasks?');
  lines.push('  • What would it mean if you could automate that today?');
  lines.push('');
  lines.push('Demo Angle:');
  lines.push('  Show a Natively Builder prototype that automates [key pain point]');
  lines.push('  in under 10 minutes during the call.');
  lines.push('');
  lines.push('First Message:');
  lines.push(`  "Hi [Name] — I noticed ${company.basic.name} is in ${company.basic.industry}. We help companies like yours automate [pain point]. Would you be open to a 15-minute call to see how?"`);
  lines.push('');
  lines.push('Next Action: Review and schedule outreach');

  return lines.join('\n');
}

export function generateProviderBrief(company: {
  basic: { name: string; website: string; notes: string };
  providerProfile?: import('../types').ProviderProfile;
  fitScore?: import('../types').FitScore;
}): string {
  const lines: string[] = [
    `🔌 Natively Provider Brief: ${company.basic.name}`,
    '='.repeat(55),
    '',
    `Website: ${company.basic.website || 'N/A'}`,
    '',
  ];

  if (company.providerProfile) {
    const pp = company.providerProfile;
    lines.push('Provider Profile:');
    lines.push(`  Type: ${pp.providerType}`);
    lines.push(`  Region: ${pp.region || 'Unknown'}`);
    lines.push(`  Infrastructure: ${pp.infrastructureType || 'Unknown'}`);
    lines.push(`  Onboarding Stage: ${pp.onboardingStage || 'Not started'}`);
    lines.push(`  Priority: ${pp.providerPriority}`);
    if (pp.gpuCapacityNotes) lines.push(`  GPU Capacity: ${pp.gpuCapacityNotes}`);
    lines.push('');
  }

  if (company.fitScore) {
    lines.push('Compute Fit:');
    lines.push(`  Provider Fit: ${company.fitScore.providerFit}/100`);
    lines.push(`  Overall: ${company.fitScore.total}/100 (${company.fitScore.confidence})`);
    if (company.fitScore.reasons.length > 0) {
      lines.push('  Why they may fit:');
      company.fitScore.reasons.slice(0, 5).forEach(r => lines.push(`    • ${r}`));
    }
    lines.push('');
  }

  lines.push('Why OpenGPU / Native.Compute:');
  lines.push('  • [To be filled: what capacity/infrastructure they offer]');
  lines.push('  • [To be filled: regional coverage]');
  lines.push('  • [To be filled: how they fit the supply-side strategy]');
  lines.push('');
  lines.push('Provider Onboarding Questions:');
  lines.push('  • What GPU types and quantities are available?');
  lines.push('  • What regions/zones do you operate in?');
  lines.push('  • What is your pricing model (on-demand, reserved, spot)?');
  lines.push('  • Do you have excess/underutilized capacity?');
  lines.push('');
  lines.push('Risks / Unknowns:');
  lines.push('  • Capacity availability not confirmed');
  lines.push('  • Pricing structure unknown');
  lines.push('  • Integration requirements not assessed');
  lines.push('');
  lines.push('Willem Follow-up Note:');
  lines.push(`  Review ${company.basic.name} for OpenGPU provider fit. ${company.providerProfile?.willemNotes || 'Needs initial assessment.'}`);
  lines.push('');
  lines.push('Next Action: Schedule intro call with provider');

  return lines.join('\n');
}

export function generateHubspotNote(company: {
  basic: { name: string; website: string; industry: string };
  pipelineStatus?: string;
  nextAction?: string;
  fitScore?: import('../types').FitScore;
  comments?: import('../types').ScoutComment[];
}): string {
  const lines: string[] = [
    `HubSpot Note: ${company.basic.name}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `Company: ${company.basic.name}`,
    `Website: ${company.basic.website}`,
    `Industry: ${company.basic.industry}`,
    `Pipeline Status: ${company.pipelineStatus || 'New'}`,
    '',
  ];

  if (company.fitScore) {
    lines.push(`Fit Score: ${company.fitScore.total}/100 (${company.fitScore.confidence})`);
    lines.push(`Builder: ${company.fitScore.builderFit} | Relay: ${company.fitScore.relayFit} | Compute: ${company.fitScore.computeFit}`);
    lines.push('');
  }

  if (company.comments && company.comments.length > 0) {
    lines.push('Recent Notes:');
    company.comments.slice(0, 5).forEach(c => {
      lines.push(`  [${c.type}] ${c.body.slice(0, 200)}`);
    });
    lines.push('');
  }

  if (company.nextAction) {
    lines.push(`Next Action: ${company.nextAction}`);
  }

  return lines.join('\n');
}