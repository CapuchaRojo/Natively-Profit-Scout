// ============================================================
// Pipeline Fit Scoring Service (v1.0)
// ============================================================
import type { Company, FitScore, ConfidenceLevel } from '../types';

interface ScoreInput {
  text: string;
  tools: string;
  people: string;
  workflows: string;
}

export function scoreClientFit(company: Company): FitScore {
  const input = buildScoreInput(company);
  let builderFit = 0;
  let computeFit = 0;
  let relayFit = 0;
  let providerFit = 0;
  const reasons: string[] = [];
  const evidenceUrls: string[] = [];

  // ── Builder Fit Signals ──
  if (hasPricingPage(input)) { builderFit += 15; reasons.push('Pricing/demo page found — buying intent signal'); }
  if (hasCareersPage(input)) { builderFit += 10; reasons.push('Careers page signals growth or tech roles'); }
  if (hasDocsApi(input)) { builderFit += 10; reasons.push('Docs/API/dev portal — technical product company'); }
  if (hasSupportBurden(input)) { builderFit += 15; reasons.push('Support burden signals — automation opportunity'); }
  if (hasToolSprawl(input)) { builderFit += 15; reasons.push('Tool sprawl detected — consolidation opportunity'); }
  if (hasManualProcessLanguage(input)) { builderFit += 10; reasons.push('Manual process language — workflow automation fit'); }
  if (hasGrowthHiringSignals(input)) { builderFit += 10; reasons.push('Growth/hiring signals — scaling pain likely'); }
  if (hasProductComplexity(input)) { builderFit += 10; reasons.push('Product complexity — Natively Builder opportunity'); }

  // ── Relay Fit Signals ──
  if (hasAgencyServiceWorkflow(input)) { relayFit += 20; reasons.push('Agency/service workflow — Relay/document automation fit'); }
  if (hasDocumentHeavy(input)) { relayFit += 15; reasons.push('Document-heavy operations — proposal/report automation'); }
  if (hasClientPortalNeed(input)) { relayFit += 15; reasons.push('Client portal need — Relay dashboard opportunity'); }
  if (hasComplianceNeed(input)) { relayFit += 10; reasons.push('Compliance/documentation needs — Relay workflow fit'); }

  // ── Compute Fit Signals ──
  if (hasAiMlRoles(input)) { computeFit += 20; reasons.push('AI/ML roles — potential compute customer'); }
  if (hasDataInfra(input)) { computeFit += 15; reasons.push('Data infrastructure mentions — compute-intensive'); }
  if (hasGpuComputeLanguage(input)) { computeFit += 20; reasons.push('GPU/compute language — OpenGPU prospect'); }

  const total = builderFit + computeFit + relayFit;
  const confidence: ConfidenceLevel = total >= 50 ? 'High' : total >= 25 ? 'Medium' : 'Low';

  // Collect evidence URLs
  if (input.website) evidenceUrls.push(input.website);

  return { total, confidence, builderFit, computeFit, relayFit, providerFit, reasons, evidenceUrls };
}

export function scoreProviderFit(company: Company): FitScore {
  const input = buildScoreInput(company);
  let builderFit = 0;
  let computeFit = 0;
  let relayFit = 0;
  let providerFit = 0;
  const reasons: string[] = [];
  const evidenceUrls: string[] = [];

  // ── Provider Fit Signals ──
  if (hasGpuLanguage(input)) { providerFit += 25; reasons.push('GPU language detected — potential OpenGPU provider'); }
  if (hasCloudComputeLanguage(input)) { providerFit += 20; reasons.push('Cloud/compute language — infrastructure provider'); }
  if (hasDataCenterLanguage(input)) { providerFit += 20; reasons.push('Data center language — colocation/hosting provider'); }
  if (hasAiHostingInference(input)) { providerFit += 20; reasons.push('AI hosting/inference — Native.Compute prospect'); }
  if (hasHardwareGpuRefs(input)) { providerFit += 15; reasons.push('Hardware/GPU references — hardware partner'); }
  if (hasRegionAvailability(input)) { providerFit += 10; reasons.push('Regional availability mentioned'); }
  if (hasEnterpriseCertifications(input)) { providerFit += 10; reasons.push('Enterprise/cloud certifications'); }
  if (hasCapacityResaleLanguage(input)) { providerFit += 15; reasons.push('Capacity/resale/partner language — supply-side fit'); }

  const total = providerFit;
  const confidence: ConfidenceLevel = total >= 50 ? 'High' : total >= 25 ? 'Medium' : 'Low';

  if (input.website) evidenceUrls.push(input.website);

  return { total, confidence, builderFit, computeFit, relayFit, providerFit, reasons, evidenceUrls };
}

// ── Signal Detectors ──

function buildScoreInput(company: Company): ScoreInput {
  const basic = company.basic || {} as any;
  const business = company.business || {} as any;
  const tools = company.tools || {} as any;
  const people = company.people || {} as any;
  const combined = [
    basic.notes || '',
    business.productsServices || '',
    business.targetCustomers || '',
    business.operationsModel || '',
    basic.industry || '',
    tools.crm || '', tools.unknownTools || '',
    tools.aiTools || '', tools.automationTools || '',
    people.leadership || '', people.technicalTeam || '',
    ...(company.publicIntelSources || []).map(s => s.rawText || ''),
  ].join(' ');
  return {
    text: combined,
    tools: [tools.crm, tools.aiTools, tools.automationTools, tools.unknownTools].join(' '),
    people: [people.leadership, people.technicalTeam, people.operationsTeam].join(' '),
    workflows: company.reconFindings?.inferredWorkflows?.map(w => w.workflowName).join(' ') || '',
    website: basic.website || '',
  };
}

function hasPricingPage(input: ScoreInput): boolean {
  return /\b(pricing|demo|trial|get started|book.*(demo|call)|schedule.*demo)\b/i.test(input.text);
}
function hasCareersPage(input: ScoreInput): boolean {
  return /\b(careers?|jobs?|we.?(re|are).?hiring|open position|join.*team)\b/i.test(input.text);
}
function hasDocsApi(input: ScoreInput): boolean {
  return /\b(api|docs?|documentation|developer|sdk|integration|webhook)\b/i.test(input.text);
}
function hasSupportBurden(input: ScoreInput): boolean {
  return /\b(support.*(ticket|queue|backlog|overload)|manual.*(process|entry|routing)|copy.?paste)\b/i.test(input.text);
}
function hasToolSprawl(input: ScoreInput): boolean {
  const toolCount = (input.tools.match(/\b(crm|hubspot|salesforce|zapier|slack|jira|asana|trello|notion|airtable|intercom|zendesk)\b/gi) || []).length;
  return toolCount >= 4;
}
function hasManualProcessLanguage(input: ScoreInput): boolean {
  return /\b(manual|spreadsheet|excel|paper|hand.?enter|copy.?paste|type.*in)\b/i.test(input.text);
}
function hasGrowthHiringSignals(input: ScoreInput): boolean {
  return /\b(hiring|growing|scaling|expanding|series [a-d]|fundraising|raised)\b/i.test(input.text);
}
function hasProductComplexity(input: ScoreInput): boolean {
  return /\b(platform|workflow|automation|pipeline|orchestration|multi.?step)\b/i.test(input.text);
}
function hasAgencyServiceWorkflow(input: ScoreInput): boolean {
  return /\b(agency|consulting|services|client.*(report|portal|deliverable)|proposal|sow|statement.of.work)\b/i.test(input.text);
}
function hasDocumentHeavy(input: ScoreInput): boolean {
  return /\b(document|report|proposal|invoice|contract|template|pdf|word|powerpoint)\b/i.test(input.text);
}
function hasClientPortalNeed(input: ScoreInput): boolean {
  return /\b(client.*portal|customer.*portal|self.?service|dashboard.*client)\b/i.test(input.text);
}
function hasComplianceNeed(input: ScoreInput): boolean {
  return /\b(compliance|audit|soc2|hipaa|gdpr|iso|regulatory)\b/i.test(input.text);
}
function hasAiMlRoles(input: ScoreInput): boolean {
  return /\b(ai|ml|machine.learning|data.scientist|llm|gpt|transformer|neural|deep.learning)\b/i.test(input.text);
}
function hasDataInfra(input: ScoreInput): boolean {
  return /\b(data.*(pipeline|infra|platform|warehouse|lake|mesh)|big.data|analytics.*platform)\b/i.test(input.text);
}
function hasGpuComputeLanguage(input: ScoreInput): boolean {
  return /\b(gpu|cuda|nvidia|compute|hpc|parallel|tensor|model.*train)\b/i.test(input.text);
}

// Provider-specific detectors
function hasGpuLanguage(input: ScoreInput): boolean {
  return /\b(gpu|nvidia|cuda|amd.*instinct|h100|a100|tensor.*core)\b/i.test(input.text);
}
function hasCloudComputeLanguage(input: ScoreInput): boolean {
  return /\b(cloud|compute|infrastructure|hosting|iaas|paas|bare.?metal|dedicated.*server)\b/i.test(input.text);
}
function hasDataCenterLanguage(input: ScoreInput): boolean {
  return /\b(data.?center|colocation|cage|rack|cabinet|power.*(mw|megawatt)|facility)\b/i.test(input.text);
}
function hasAiHostingInference(input: ScoreInput): boolean {
  return /\b(inference|model.*hosting|ai.*(hosting|infra|cluster)|llm.*(serving|hosting|deployment))\b/i.test(input.text);
}
function hasHardwareGpuRefs(input: ScoreInput): boolean {
  return /\b(hardware|server.*gpu|gpu.*server|dgx|hpc.*cluster|supercomputer)\b/i.test(input.text);
}
function hasRegionAvailability(input: ScoreInput): boolean {
  return /\b(region|availability.*zone|us.?east|us.?west|eu|apac|latency|edge.*location)\b/i.test(input.text);
}
function hasEnterpriseCertifications(input: ScoreInput): boolean {
  return /\b(iso.*27001|soc.*(2|3)|fedramp|hipaa|pci.*dss|certification)\b/i.test(input.text);
}
function hasCapacityResaleLanguage(input: ScoreInput): boolean {
  return /\b(capacity|resale|partner|wholesale|bandwidth|transit|peering|interconnect)\b/i.test(input.text);
}