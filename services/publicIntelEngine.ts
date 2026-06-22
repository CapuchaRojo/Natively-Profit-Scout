// ============================================================
// Natively Profit Scout — Public Intel Engine
// Deterministic public intel analysis (frontend-safe, no backend)
// ============================================================
import type {
  Company, PublicIntelSource, PublicIntelSignal, PublicIntelOpening,
  PublicIntelSummary, SourceType, SourceStatus, SignalCategory,
  ConfidenceLevel, PainPoint, Stakeholder, Tool, Opportunity
} from '../types';

let idCounter = 0;
function uid(prefix = 'pi'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

// ============================================================
// 1. Fetch Public Page Text (Browser-safe, CORS-aware)
// ============================================================
export async function fetchPublicPageText(url: string): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(cleanUrl, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'text/html,text/plain,*/*' },
    });
    if (!response.ok) {
      return { success: false, text: '', error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const html = await response.text();
    const text = cleanHtmlToText(html);
    if (text.length < 20) {
      return { success: false, text: '', error: 'Page returned too little text. It may require JavaScript or login.' };
    }
    return { success: true, text };
  } catch (err: any) {
    return {
      success: false,
      text: '',
      error: err?.message?.includes('CORS') || err?.message?.includes('Failed to fetch')
        ? 'CORS restriction: Browser cannot fetch this page directly. Please paste the page text manually.'
        : `Fetch failed: ${err?.message || 'Unknown error'}`,
    };
  }
}

// ============================================================
// 2. Clean HTML to Plain Text
// ============================================================
export function cleanHtmlToText(html: string): string {
  const text = html
    // Remove scripts and style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    // Replace common block tags with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    // Strip remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return text;
}

// ============================================================
// 3. Analyze Public Text - Extract Signals
// ============================================================
export function analyzePublicText(source: PublicIntelSource): { signals: PublicIntelSignal[]; updatedSource: PublicIntelSource } {
  const text = source.rawText || '';
  const signals = extractSignalsFromText(text, source);
  return {
    signals,
    updatedSource: {
      ...source,
      extractedSignals: signals.map(s => s.title),
      status: 'analyzed' as SourceStatus,
      lastAnalyzedAt: new Date().toISOString(),
    },
  };
}

// ============================================================
// 4. Extract Signals from Text
// ============================================================
export function extractSignalsFromText(text: string, source: PublicIntelSource): PublicIntelSignal[] {
  const signals: PublicIntelSignal[] = [];
  const lower = text.toLowerCase();
  const now = new Date().toISOString();

  const addSignal = (
    category: SignalCategory,
    title: string,
    evidence: string,
    whyItMatters: string,
    possiblePain: string,
    nativelyOpp: string,
    discoveryQ: string,
    confidence: ConfidenceLevel,
    isVerified: boolean,
  ) => {
    signals.push({
      signalId: uid('sig'),
      sourceId: source.sourceId,
      companyId: source.companyId,
      title,
      category,
      evidence,
      whyItMatters,
      possiblePainPoint: possiblePain,
      nativelyOpportunity: nativelyOpp,
      discoveryQuestion: discoveryQ,
      confidence,
      sourceReference: source.sourceUrl || source.sourceTitle || 'User-provided text',
      isVerified,
      createdAt: now,
    });
  };

  // --- Growth signals ---
  if (/\bgrowing\b|\bexpanding\b|\bscale\b|\brapid\s*(growth|expansion)\b|\bnew\s*(office|market|location)\b/i.test(lower)) {
    addSignal('growth_signal', 'Company mentions growth/expansion',
      extractEvidence(text, /\bgrowing\b|\bexpanding\b|\bscale\b|\brapid|new\s*(office|market)/i),
      'Growth indicates increasing complexity and potential pain points around scaling operations.',
      'Growing companies often outgrow manual processes and tools.',
      'Automation and workflow optimization for scaling operations.',
      'What systems are straining as you grow?', 'High', true);
  }

  // --- Hiring signals ---
  const hiringMatch = text.match(/(?:we'?re\s+hiring|careers|join\s+our\s+team|open\s+positions|job\s+openings|current\s+openings)\b/i);
  if (hiringMatch || /\b(hiring|recruiting|job|career|position)\b/i.test(lower)) {
    const jobs = extractJobTitles(text);
    const jobEvidence = jobs.length > 0
      ? `Hiring for: ${jobs.slice(0, 5).join(', ')}`
      : extractEvidence(text, /hiring|careers|join.*team|open.*position/i);
    addSignal('hiring_signal', 'Company is actively hiring',
      jobEvidence,
      'Hiring signals growth but also indicates potential onboarding, training, and workflow strain.',
      'New hires need onboarding, tools access, and process documentation.',
      'Automated onboarding workflows and training portals.',
      'What roles are you hiring for, and how do you onboard new team members?', 'High', true);
  }

  // --- Tech stack signals ---
  const knownTools = [
    { name: 'Salesforce', keywords: ['salesforce', 'sfdc'] },
    { name: 'HubSpot', keywords: ['hubspot'] },
    { name: 'Zendesk', keywords: ['zendesk'] },
    { name: 'Intercom', keywords: ['intercom'] },
    { name: 'Slack', keywords: ['slack'] },
    { name: 'Microsoft Teams', keywords: ['microsoft teams', 'ms teams'] },
    { name: 'Google Workspace', keywords: ['google workspace', 'g suite', 'google apps'] },
    { name: 'Shopify', keywords: ['shopify'] },
    { name: 'WordPress', keywords: ['wordpress', 'wp'] },
    { name: 'Webflow', keywords: ['webflow'] },
    { name: 'Calendly', keywords: ['calendly'] },
    { name: 'Stripe', keywords: ['stripe'] },
    { name: 'QuickBooks', keywords: ['quickbooks', 'quick books'] },
    { name: 'Zapier', keywords: ['zapier'] },
    { name: 'Airtable', keywords: ['airtable'] },
    { name: 'Notion', keywords: ['notion'] },
    { name: 'Jira', keywords: ['jira'] },
    { name: 'GitHub', keywords: ['github'] },
    { name: 'AWS', keywords: ['aws', 'amazon web services'] },
    { name: 'Azure', keywords: ['azure', 'microsoft azure'] },
    { name: 'Twilio', keywords: ['twilio'] },
    { name: 'Mailchimp', keywords: ['mailchimp'] },
    { name: 'Klaviyo', keywords: ['klaviyo'] },
  ];
  const detectedTools = knownTools.filter(t => t.keywords.some(k => lower.includes(k)));
  if (detectedTools.length > 0) {
    addSignal('tech_stack_signal', `Detected tech stack: ${detectedTools.map(t => t.name).join(', ')}`,
      `Found references to ${detectedTools.length} known tool(s) in the text.`,
      'Known tool stack helps identify integration opportunities and automation potential.',
      'Multiple tools often mean data silos and manual data transfer between systems.',
      'Integration automation, data sync, and unified dashboard opportunities.',
      'How do your tools share data today?', 'High', true);
  }

  // --- Workflow clues ---
  const workflowClues = [
    { word: 'booking', signal: 'Manual booking/scheduling process', pain: 'Scheduling inefficiency' },
    { word: 'onboarding', signal: 'Onboarding process mentioned', pain: 'Manual onboarding' },
    { word: 'intake', signal: 'Client/customer intake process', pain: 'Manual intake process' },
    { word: 'ticket', signal: 'Support ticketing mentioned', pain: 'Support ticket management' },
    { word: 'quote', signal: 'Quoting/proposal process', pain: 'Manual quoting' },
    { word: 'estimate', signal: 'Estimating process', pain: 'Manual estimates' },
    { word: 'invoice', signal: 'Invoicing process mentioned', pain: 'Manual invoicing' },
    { word: 'scheduling', signal: 'Scheduling workflow', pain: 'Scheduling inefficiency' },
    { word: 'dispatch', signal: 'Dispatch/routing workflow', pain: 'Manual dispatch' },
    { word: 'approval', signal: 'Approval workflow mentioned', pain: 'Manual approvals' },
    { word: 'reporting', signal: 'Reporting process', pain: 'Manual reporting' },
    { word: 'compliance', signal: 'Compliance/audit process', pain: 'Compliance management' },
    { word: 'training', signal: 'Training mentioned', pain: 'Training/onboarding' },
    { word: 'follow.up', signal: 'Follow-up process', pain: 'Lead follow-up' },
  ];
  for (const clue of workflowClues) {
    if (lower.includes(clue.word)) {
      addSignal('manual_workflow_signal', clue.signal,
        `Text mentions "${clue.word}" indicating this workflow exists.`,
        'Manual workflow processes are prime candidates for automation.',
        clue.pain,
        `Automate ${clue.word} workflow with Natively.`,
        `How does your ${clue.word} process work today?`, 'Medium', false);
      break; // One workflow signal per source to avoid noise
    }
  }

  // --- Sales motion signals ---
  if (/\b(free\s+trial|demo|consultation|book.*call|schedule.*demo|pricing|plans|subscription)\b/i.test(lower)) {
    addSignal('sales_motion_signal', 'Sales motion visible (trial/demo/pricing)',
      extractEvidence(text, /free trial|demo|consultation|pricing|plans|subscription/i),
      'Visible sales motion helps tailor sales approach and identify friction points in their funnel.',
      'Inbound sales processes often have manual lead handling.',
      'Lead routing, follow-up automation, and demo scheduling tools.',
      'How do you handle incoming demo requests and lead follow-up?', 'Medium', true);
  }

  // --- Support burden signals ---
  if (/\b(support|help\s+center|faq|knowledge\s+base|contact\s+us|support.*team|customer.*service)\b/i.test(lower)) {
    addSignal('support_burden_signal', 'Customer support infrastructure visible',
      extractEvidence(text, /support|help center|faq|knowledge base|contact us/i),
      'Visible support indicates potential for AI support automation.',
      'Support teams often handle repetitive questions.',
      'AI support chatbot with knowledge base integration.',
      'What are your top 5 most common support questions?', 'Medium', false);
  }

  // --- Compliance/security signals ---
  if (/\b(security|compliance|gdpr|soc2|hipaa|privacy|audit|certification)\b/i.test(lower)) {
    addSignal('compliance_security_signal', 'Security/compliance mentioned',
      extractEvidence(text, /security|compliance|gdpr|soc2|hipaa|privacy/i),
      'Compliance requirements often drive need for automated audit trails and reporting.',
      'Manual compliance tracking is error-prone.',
      'Compliance checklist automation and audit trail dashboards.',
      'How do you currently track compliance requirements?', 'High', true);
  }

  // --- Funding/revenue signals ---
  if (/\b(funding|series\s+[a-d]|raised\s+\$|revenue|arr|mr|investor|venture|backed)\b/i.test(lower)) {
    addSignal('funding_revenue_signal', 'Funding or revenue data visible',
      extractEvidence(text, /funding|series\s*[a-d]|raised|revenue|arr|investor|backed/i),
      'Funded companies have budget and need for operational efficiency.',
      'Fast-growing funded companies often outgrow processes.',
      'Operations automation and executive dashboards.',
      'What operational challenges are most pressing post-funding?', 'High', true);
  }

  // --- Partnership signals ---
  if (/\b(partner|integration|marketplace|app\s+store|ecosystem)\b/i.test(lower)) {
    addSignal('partnership_signal', 'Partnerships or integrations ecosystem',
      extractEvidence(text, /partner|integration|marketplace|ecosystem/i),
      'Partnerships indicate openness to third-party tools and integrations.',
      'Integration complexity can be a pain point.',
      'Integration automation and data sync solutions.',
      'How do you manage your partner integrations?', 'Medium', false);
  }

  // --- Decision maker signals ---
  const execRoles = text.match(/\b(CEO|CTO|CFO|COO|Founder|President|Director|VP|Head\s+of)\s+[A-Z][a-z]+/g);
  if (execRoles && execRoles.length > 0) {
    addSignal('decision_maker_signal', `Identified leadership roles: ${execRoles.slice(0, 5).join(', ')}`,
      `Found ${execRoles.length} leadership title(s) in the text.`,
      'Knowing decision makers helps target outreach and stakeholder mapping.',
      'Unknown decision makers create sales friction.',
      'Stakeholder mapping and personalized outreach.',
      'Who is the key decision maker for [relevant area]?', 'High', true);
  }

  // --- Customer pain signal ---
  const painKeywords = ['challenge', 'pain point', 'struggle', 'difficult', 'complex', 'problem', 'issue', 'frustrat', 'manual', 'inefficient'];
  const painMatches = painKeywords.filter(k => lower.includes(k));
  if (painMatches.length >= 2) {
    addSignal('customer_pain_signal', `Text suggests operational challenges: ${painMatches.slice(0, 3).join(', ')}`,
      `Found ${painMatches.length} pain-indicating keyword(s).`,
      'Direct mentions of challenges are strong signals for automation opportunities.',
      'Identified operational challenges.',
      'Targeted automation solution addressing mentioned challenges.',
      'Tell me more about the challenges you mentioned on your site.', 'High', true);
  }

  // --- Market positioning ---
  if (/\b(leader|best|top|#1|award|trusted|recommended|industry-leading|innovative)\b/i.test(lower)) {
    addSignal('market_positioning_signal', 'Market positioning claims visible',
      extractEvidence(text, /leader|best|top|#1|award|trusted|recommended/i),
      'Market positioning helps understand their value prop and competitive landscape.',
      'May indicate investment in marketing/sales infrastructure.',
      'Content automation or sales enablement tools.',
      'What makes you different from competitors?', 'Low', true);
  }

  // --- Outreach opening signal ---
  if (signals.length >= 2) {
    const topSignal = signals[0];
    addSignal('outreach_opening_signal', `Outreach angle: ${topSignal.title}`,
      `Based on detected signal: ${topSignal.evidence}`,
      'Direct outreach angle based on public intel for warm conversations.',
      topSignal.possiblePainPoint || 'Unknown pain point',
      topSignal.nativelyOpportunity || 'Custom automation solution',
      topSignal.discoveryQuestion || 'What challenges are you facing?', 'Medium', false);
  }

  return signals;
}

function extractEvidence(text: string, pattern: RegExp, contextChars = 120): string {
  const match = text.match(pattern);
  if (!match) return 'Referenced in text';
  const idx = match.index ?? text.indexOf(match[0]);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + match[0].length + contextChars);
  return text.slice(start, end).replace(/\n/g, ' ').trim();
}

function extractJobTitles(text: string): string[] {
  const commonTitles = [
    'Engineer', 'Developer', 'Designer', 'Manager', 'Director', 'VP', 'Lead',
    'Specialist', 'Coordinator', 'Analyst', 'Representative', 'Associate',
    'Consultant', 'Agent', 'Support', 'Sales', 'Marketing', 'Account',
  ];
  const lines = text.split('\n');
  const jobs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5 || trimmed.length > 100) continue;
    const hasTitle = commonTitles.some(t => trimmed.includes(t));
    if (hasTitle && !jobs.includes(trimmed)) {
      jobs.push(trimmed);
    }
  }
  return jobs.slice(0, 10);
}

// ============================================================
// 5. Generate Openings from Signals
// ============================================================
export function generateOpeningsFromSignals(signals: PublicIntelSignal[], company: Company): PublicIntelOpening[] {
  const openings: PublicIntelOpening[] = [];
  const now = new Date().toISOString();

  const openingConfigs: Array<{
    signalCategory: SignalCategory;
    titleTemplate: (s: PublicIntelSignal) => string;
    whatThisMightMean: (s: PublicIntelSignal) => string;
    whyAdamMightCare: (s: PublicIntelSignal) => string;
    whoToApproach: (s: PublicIntelSignal) => string;
    suggestedFirstLine: (s: PublicIntelSignal) => string;
    suggestedDiscoveryQuestion: (s: PublicIntelSignal) => string;
    suggestedNativelyDemo: (s: PublicIntelSignal) => string;
    riskUncertainty: string;
    confidence: ConfidenceLevel;
  }> = [
    {
      signalCategory: 'hiring_signal',
      titleTemplate: (s) => `They are hiring which may indicate ${s.evidence.includes('Support') || s.evidence.includes('support') ? 'ticket volume or onboarding strain' : 'workflow strain from growth'}`,
      whatThisMightMean: (s) => 'Active hiring often means growing complexity. New employees need onboarding, tool access, and process documentation that may not exist yet.',
      whyAdamMightCare: (s) => 'Onboarding automation, training portals, and workflow documentation are high-value Natively builds that reduce time-to-productivity for new hires.',
      whoToApproach: (s) => 'HR/Operations lead or the hiring manager for the role',
      suggestedFirstLine: (s) => `I noticed you're hiring for ${s.evidence.slice(0, 60)} — that's exciting. Many growing teams struggle with onboarding new hires efficiently.`,
      suggestedDiscoveryQuestion: (s) => 'How do you currently onboard new team members and get them up to speed?',
      suggestedNativelyDemo: (s) => 'Build an automated onboarding portal with checklist, tool provisioning, and training docs.',
      riskUncertainty: 'Hiring doesn\'t always mean pain — may be well-managed.',
      confidence: 'Medium',
    },
    {
      signalCategory: 'growth_signal',
      titleTemplate: (s) => 'Growth/expansion mentions may indicate scaling pains in operations',
      whatThisMightMean: (s) => 'Growing companies often hit process bottlenecks — what worked at 10 people breaks at 50.',
      whyAdamMightCare: (s) => 'Scaling pains are the #1 trigger for automation investment.',
      whoToApproach: (s) => 'COO, Head of Operations, or Founder',
      suggestedFirstLine: (s) => 'Congratulations on the growth! Many companies at your stage find that manual processes start to hold them back.',
      suggestedDiscoveryQuestion: (s) => 'What processes are starting to feel the strain as you grow?',
      suggestedNativelyDemo: (s) => 'Operations dashboard with key metrics and automated reporting.',
      riskUncertainty: 'Company may already have solutions in place.',
      confidence: 'Medium',
    },
    {
      signalCategory: 'manual_workflow_signal',
      titleTemplate: (s) => `They mention "${s.title.split(':')[1]?.trim() || 'a process'}" which suggests a manual workflow opportunity`,
      whatThisMightMean: (s) => 'Mentioning specific workflows suggests they are active processes that could be automated.',
      whyAdamMightCare: (s) => 'Each manual workflow is a potential Natively build opportunity.',
      whoToApproach: (s) => 'Operations lead or department head',
      suggestedFirstLine: (s) => `I noticed your site mentions ${s.evidence.slice(0, 60)} — curious how that process works for your team?`,
      suggestedDiscoveryQuestion: (s) => 'How much time does your team spend on that process each week?',
      suggestedNativelyDemo: (s) => 'Build an automated workflow for the mentioned process.',
      riskUncertainty: 'Process may already be partially automated.',
      confidence: 'Low',
    },
    {
      signalCategory: 'tech_stack_signal',
      titleTemplate: (s) => 'Their tech stack reveals integration and automation opportunities',
      whatThisMightMean: (s) => 'Multiple tools mean data silos and manual data transfer between systems.',
      whyAdamMightCare: (s) => 'Tool integration and data sync are high-value, visible problems.',
      whoToApproach: (s) => 'CTO, IT Manager, or Head of Operations',
      suggestedFirstLine: (s) => 'I noticed you use several tools — how smoothly do they work together?',
      suggestedDiscoveryQuestion: (s) => 'Where do you find yourself manually moving data between systems?',
      suggestedNativelyDemo: (s) => 'Integration dashboard showing data flow between their tools.',
      riskUncertainty: 'Company may already use integration tools like Zapier effectively.',
      confidence: 'Medium',
    },
    {
      signalCategory: 'compliance_security_signal',
      titleTemplate: (s) => 'They mention compliance/security but may lack visible trust center — creating audit-readiness angle',
      whatThisMightMean: (s) => 'Compliance-aware companies need audit trails and automated compliance monitoring.',
      whyAdamMightCare: (s) => 'Compliance automation is high-value and often under-invested.',
      whoToApproach: (s) => 'CISO, IT Security lead, or Compliance officer',
      suggestedFirstLine: (s) => 'I see you take compliance seriously — how do you currently manage audit readiness?',
      suggestedDiscoveryQuestion: (s) => 'What compliance reports do you generate, and how often?',
      suggestedNativelyDemo: (s) => 'Compliance checklist automation with audit trail dashboard.',
      riskUncertainty: 'Company may already have compliance automation tools.',
      confidence: 'Medium',
    },
    {
      signalCategory: 'support_burden_signal',
      titleTemplate: (s) => 'Support infrastructure visible suggesting potential for AI support automation',
      whatThisMightMean: (s) => 'Visible support pages mean they handle customer inquiries — likely with some manual process.',
      whyAdamMightCare: (s) => 'Support automation is one of the highest-ROI Natively builds.',
      whoToApproach: (s) => 'Head of Support, Customer Success Manager',
      suggestedFirstLine: (s) => 'I saw your support page — how many tickets do you handle daily?',
      suggestedDiscoveryQuestion: (s) => 'What percentage of your support tickets are repetitive questions?',
      suggestedNativelyDemo: (s) => 'AI support chatbot with knowledge base integration handling 60% of tier-1 tickets.',
      riskUncertainty: 'Company may already use a support AI tool.',
      confidence: 'Low',
    },
    {
      signalCategory: 'sales_motion_signal',
      titleTemplate: (s) => 'Sales motion visible — lead handling and follow-up may be manual',
      whatThisMightMean: (s) => 'Visible sales funnel (demos/trials) means leads need routing and follow-up.',
      whyAdamMightCare: (s) => 'Lead follow-up automation is quick to sell and implement.',
      whoToApproach: (s) => 'Head of Sales, Sales Operations',
      suggestedFirstLine: (s) => 'I see you offer demos — how quickly do you typically follow up with demo requests?',
      suggestedDiscoveryQuestion: (s) => 'How are inbound leads currently assigned and followed up?',
      suggestedNativelyDemo: (s) => 'Lead routing and follow-up sequence automation.',
      riskUncertainty: 'May already use a CRM with automation.',
      confidence: 'Medium',
    },
    {
      signalCategory: 'funding_revenue_signal',
      titleTemplate: (s) => 'Funding or revenue data suggests budget availability for automation',
      whatThisMightMean: (s) => 'Funded/growing companies have budget and need for operational efficiency.',
      whyAdamMightCare: (s) => 'Funded companies are the highest-value targets with budget and urgency.',
      whoToApproach: (s) => 'CEO, CFO, or COO',
      suggestedFirstLine: (s) => 'Congrats on the recent funding/growth! How are you scaling operations to match?',
      suggestedDiscoveryQuestion: (s) => 'What operational investments are you prioritizing post-funding?',
      suggestedNativelyDemo: (s) => 'Executive dashboard showing key operational metrics.',
      riskUncertainty: 'Funding doesn\'t guarantee automation budget allocation.',
      confidence: 'High',
    },
    {
      signalCategory: 'customer_pain_signal',
      titleTemplate: (s) => 'Text reveals customer challenges — direct sales opening available',
      whatThisMightMean: (s) => 'The company has publicly acknowledged challenges that Natively can solve.',
      whyAdamMightCare: (s) => 'Direct pain mention is the strongest sales signal available.',
      whoToApproach: (s) => 'Department head most likely to feel the pain',
      suggestedFirstLine: (s) => `I noticed your site mentions ${s.evidence.slice(0, 80)} — that's exactly the kind of challenge we help companies solve.`,
      suggestedDiscoveryQuestion: (s) => 'How is that challenge impacting your team day-to-day?',
      suggestedNativelyDemo: (s) => 'Build a solution directly addressing the mentioned challenge.',
      riskUncertainty: 'May already have a solution in progress.',
      confidence: 'High',
    },
    {
      signalCategory: 'decision_maker_signal',
      titleTemplate: (s) => `Identified leadership: ${s.title.replace('Identified leadership roles: ', '')} — direct stakeholder map available`,
      whatThisMightMean: (s) => 'Named executives enable personalized outreach and stakeholder mapping.',
      whyAdamMightCare: (s) => 'Knowing who to talk to eliminates the hardest part of B2B sales.',
      whoToApproach: (s) => 'The most relevant executive based on the opportunity',
      suggestedFirstLine: (s) => 'I saw [Executive] is your [Role] — they might be interested in how we help [relevant outcome].',
      suggestedDiscoveryQuestion: (s) => 'Who on your team would be most impacted by [solution area]?',
      suggestedNativelyDemo: (s) => 'Personalized demo targeting the executive\'s specific area.',
      riskUncertainty: 'Leadership visibility doesn\'t confirm decision-making authority.',
      confidence: 'Medium',
    },
  ];

  for (const signal of signals) {
    const config = openingConfigs.find(c => c.signalCategory === signal.category);
    if (!config) continue;

    openings.push({
      openingId: uid('open'),
      companyId: signal.companyId,
      sourceSignalId: signal.signalId,
      title: config.titleTemplate(signal),
      sourceSignal: signal.title,
      whatThisMightMean: config.whatThisMightMean(signal),
      whyAdamMightCare: config.whyAdamMightCare(signal),
      whoToApproach: config.whoToApproach(signal),
      suggestedFirstLine: config.suggestedFirstLine(signal),
      suggestedDiscoveryQuestion: config.suggestedDiscoveryQuestion(signal),
      suggestedNativelyDemo: config.suggestedNativelyDemo(signal),
      riskUncertainty: config.riskUncertainty,
      confidence: signal.confidence === 'High' ? 'High' : signal.confidence === 'Medium' ? 'Medium' : 'Low',
      appliedToPainPoints: false,
      appliedToOpportunities: false,
      createdAt: now,
      isGenericDiscovery: false,
    });
  }

  return openings.sort((a, b) => {
    const confOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
    return confOrder[b.confidence] - confOrder[a.confidence];
  });
}

// ============================================================
// 6. Extract Tool Mentions from Text
// ============================================================
export function extractToolMentions(text: string): string[] {
  const knownTools = [
    'Salesforce', 'HubSpot', 'Zendesk', 'Intercom', 'Slack', 'Microsoft Teams',
    'Google Workspace', 'Shopify', 'WordPress', 'Webflow', 'Calendly', 'Stripe',
    'QuickBooks', 'Zapier', 'Airtable', 'Notion', 'Jira', 'GitHub', 'AWS', 'Azure',
    'Twilio', 'Mailchimp', 'Klaviyo', 'Monday.com', 'Asana', 'Trello', 'Basecamp',
    'Pipedrive', 'Close', 'Copper', 'Freshdesk', 'Help Scout', 'Gorgias', 'Recharge',
    'LoyaltyLion', 'Yotpo', 'Klaviyo', 'Segment', 'Mixpanel', 'Amplitude',
    'Snowflake', 'BigQuery', 'Datadog', 'New Relic', 'Sentry', 'Linear', 'Notion',
  ];
  const lower = text.toLowerCase();
  return knownTools.filter(tool => lower.includes(tool.toLowerCase()));
}

export function extractWorkflowClues(text: string): string[] {
  const clues = ['booking', 'onboarding', 'intake', 'tickets', 'quotes', 'estimates',
    'invoices', 'scheduling', 'dispatch', 'approvals', 'reporting', 'compliance',
    'training', 'follow-up', 'lead routing', 'CRM', 'customer portal',
  ];
  const lower = text.toLowerCase();
  return clues.filter(c => lower.includes(c));
}

// ============================================================
// 7. Extract Stakeholder Mentions from Text
// ============================================================
export function extractStakeholderMentions(text: string): { name: string; role: string; department: string }[] {
  const mentions: { name: string; role: string; department: string }[] = [];
  const lower = text;

  // Look for patterns like "John Smith — CEO" or "CEO John Smith"
  const rolePatterns = [
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s*[—–-]\s*(CEO|CTO|CFO|COO|Founder|President|Director|VP|Head\s+of\s+\w+|Manager|Lead)/g,
    /(CEO|CTO|CFO|COO|Founder|President|Director)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/g,
  ];

  for (const pattern of rolePatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const groups = match.filter((_, i) => i > 0);
      const name = groups[0]?.length > 20 ? groups[1] || groups[0] : groups[0];
      const role = groups[0]?.length > 20 ? groups[0] : groups[1] || groups[0];
      if (name && role && name.length < 30 && role.length < 30) {
        const dept = role.toLowerCase().includes('tech') || role.toLowerCase().includes('cto') ? 'Technology'
          : role.toLowerCase().includes('sales') || role.toLowerCase().includes('revenue') ? 'Sales'
          : role.toLowerCase().includes('market') ? 'Marketing'
          : role.toLowerCase().includes('financ') || role.toLowerCase().includes('cfo') ? 'Finance'
          : role.toLowerCase().includes('oper') || role.toLowerCase().includes('coo') ? 'Operations'
          : role.toLowerCase().includes('support') || role.toLowerCase().includes('customer') ? 'Customer Support'
          : 'Leadership';
        mentions.push({ name: name.trim(), role: role.trim(), department: dept });
      }
    }
  }

  return mentions.slice(0, 8);
}

// ============================================================
// 8. Extract Pain Point Signals from Text
// ============================================================
export function extractPainPointSignals(text: string): { name: string; symptoms: string; department: string }[] {
  const pains: { name: string; symptoms: string; department: string }[] = [];
  const lower = text.toLowerCase();

  const painPatterns = [
    { keyword: 'manual', name: 'Manual Process Inefficiency', symptoms: 'Manual tasks mentioned in public text', dept: 'operations' },
    { keyword: 'slow', name: 'Process Delays', symptoms: 'Slow processes mentioned', dept: 'operations' },
    { keyword: 'complex', name: 'Complex Process', symptoms: 'Complexity mentioned as challenge', dept: 'operations' },
    { keyword: 'support', name: 'Support Challenges', symptoms: 'Support infrastructure visible', dept: 'customer_support' },
    { keyword: 'wait', name: 'Customer Wait Times', symptoms: 'Wait/response time mentioned', dept: 'customer_support' },
    { keyword: 'compliance', name: 'Compliance Burden', symptoms: 'Compliance requirements visible', dept: 'it_security' },
    { keyword: 'hire', name: 'Hiring/Training Strain', symptoms: 'Active hiring visible', dept: 'hr_recruiting' },
    { keyword: 'schedule', name: 'Scheduling Inefficiency', symptoms: 'Scheduling process mentioned', dept: 'operations' },
    { keyword: 'lead', name: 'Lead Management Challenges', symptoms: 'Lead/sales process mentioned', dept: 'sales' },
    { keyword: 'report', name: 'Manual Reporting', symptoms: 'Reporting mentioned', dept: 'leadership_reporting' },
  ];

  for (const pattern of painPatterns) {
    if (lower.includes(pattern.keyword)) {
      pains.push(pattern);
    }
  }

  return pains.slice(0, 5);
}

// ============================================================
// 9. Enrich Company from Public Intel
// ============================================================
export function enrichCompanyFromPublicIntel(company: Company): {
  summary: PublicIntelSummary;
  updatedPainPoints?: PainPoint[];
  updatedStakeholders?: Stakeholder[];
  updatedTools?: Tool[];
} {
  const signals = company.publicIntelSignals || [];
  const sources = company.publicIntelSources || [];
  const openings = company.publicIntelOpenings || [];

  const verified = signals.filter(s => s.isVerified).map(s => s.title);
  const assumed = signals.filter(s => !s.isVerified).map(s => s.title);
  const topSignals = signals.slice(0, 5).map(s => s.title);
  const missing = company.publicIntelSources.length === 0
    ? ['No public intel sources added yet']
    : [];

  const bestAngle = openings.length > 0
    ? openings[0].suggestedDiscoveryQuestion
    : signals.length > 0
      ? signals[0].discoveryQuestion
      : 'Start with public intel to find conversation angles';

  return {
    summary: {
      topSignals,
      verifiedFacts: verified,
      assumptions: assumed,
      missingInfo: missing,
      bestConversationAngle: bestAngle,
    },
  };
}

// ============================================================
// 10. Create a new Public Intel Source
// ============================================================
export function createPublicIntelSource(
  companyId: string,
  sourceType: SourceType,
  sourceUrl: string,
  sourceTitle: string,
  rawText: string,
  notes: string = '',
): PublicIntelSource {
  const now = new Date().toISOString();
  return {
    sourceId: uid('src'),
    companyId,
    sourceType,
    sourceUrl,
    sourceTitle,
    rawText,
    extractedSignals: [],
    confidence: 'Medium',
    createdAt: now,
    lastAnalyzedAt: now,
    status: rawText ? (sourceType === 'linkedin_notes' || sourceType === 'manual_paste' ? 'pasted' : 'fetched') : 'pending',
    notes,
  };
}