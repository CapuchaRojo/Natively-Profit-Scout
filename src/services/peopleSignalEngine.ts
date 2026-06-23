// ============================================================
// People Signal Engine — v0.4
// Public people & role intelligence from pasted public sources
// ============================================================
// SAFETY: This engine ONLY processes text that the user has
// explicitly pasted from publicly available business sources.
// It does NOT scrape, crawl, login, or access any restricted data.
// ============================================================

import type {
  PeopleSignalSourceType, RoleMapEntry, StakeholderHypothesis,
  HiringSignal, MilestoneSignal, OutreachAngle, PeopleDiscoveryQuestion,
} from '../types';

// ─── ID Generator ─────────────────────────────────────────────

let idCounter = 0;
function uid(prefix = 'ps'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

// ─── Role Signal Keywords ─────────────────────────────────────

const ROLE_SIGNALS: { keywords: string[]; roleType: RoleMapEntry['roleType']; title: string; department: string }[] = [
  // Executive / Founder
  { keywords: ['founder', 'ceo', 'chief executive', 'owner', 'president', 'co-founder'], roleType: 'executive_founder', title: 'Founder / CEO', department: 'Executive' },
  { keywords: ['founder/executive'], roleType: 'executive_founder', title: 'Founder / Executive', department: 'Executive' },

  // Sales / GTM
  { keywords: ['sales', 'gtm', 'go-to-market', 'bdr', 'sdr', 'account executive', 'revenue', 'sales development'], roleType: 'sales_gtm', title: 'Sales / GTM Lead', department: 'Sales & Marketing' },
  { keywords: ['sales/gtm'], roleType: 'sales_gtm', title: 'Sales / GTM Lead', department: 'Sales & Marketing' },

  // Operations
  { keywords: ['operations', 'coo', 'chief operating', 'ops manager', 'operational'], roleType: 'operations', title: 'Operations Lead', department: 'Operations' },
  { keywords: ['operations ownership'], roleType: 'operations', title: 'Operations Lead', department: 'Operations' },

  // Finance / Admin
  { keywords: ['finance', 'cfo', 'chief financial', 'admin', 'accounting', 'controller', 'bookkeeping'], roleType: 'finance_admin', title: 'Finance / Admin Lead', department: 'Finance & Administration' },
  { keywords: ['finance/admin'], roleType: 'finance_admin', title: 'Finance / Admin Lead', department: 'Finance & Administration' },

  // Support
  { keywords: ['support', 'customer success', 'customer service', 'help desk', 'support/customer'], roleType: 'support', title: 'Support / Customer Success Lead', department: 'Customer Support' },
  { keywords: ['support/customer inquiry'], roleType: 'support', title: 'Support / Customer Inquiry Lead', department: 'Customer Support' },

  // Technical / Product
  { keywords: ['technical', 'cto', 'chief technology', 'product', 'engineering', 'developer', 'engineer', 'tech lead', 'technical/product'], roleType: 'technical_product', title: 'Technical / Product Lead', department: 'Technology & Product' },
  { keywords: ['technical/product ownership'], roleType: 'technical_product', title: 'Technical / Product Owner', department: 'Technology & Product' },

  // Security / Compliance
  { keywords: ['security', 'compliance', 'ciso', 'chief information security', 'hihat', 'cybersecurity', 'security/compliance'], roleType: 'security_compliance', title: 'Security / Compliance Lead', department: 'Security & Compliance' },
  { keywords: ['security/compliance ownership'], roleType: 'security_compliance', title: 'Security / Compliance Owner', department: 'Security & Compliance' },
];

// ─── Milestone Keywords ───────────────────────────────────────

const MILESTONE_SIGNALS: { keywords: string[]; milestoneType: MilestoneSignal['milestoneType']; description: string }[] = [
  { keywords: ['launch', 'launched', 'launching', 'new product launch'], milestoneType: 'launch', description: 'Product or service launch' },
  { keywords: ['partnership', 'partner', 'alliance', 'collaboration', 'joint venture'], milestoneType: 'partnership', description: 'Partnership or alliance announced' },
  { keywords: ['funding', 'raised', 'series a', 'series b', 'investment', 'investor', 'seed round'], milestoneType: 'funding', description: 'Funding or investment round' },
  { keywords: ['award', 'awarded', 'recognized', 'ranked', 'winner', 'honoree'], milestoneType: 'award', description: 'Award or recognition received' },
  { keywords: ['growing', 'growth', 'expanding', 'expansion', 'scaling', 'new office', 'new market'], milestoneType: 'growth', description: 'Growth or expansion initiative' },
  { keywords: ['new product', 'new feature', 'new release', 'version', 'update'], milestoneType: 'new_product', description: 'New product or feature release' },
  { keywords: ['customer', 'client win', 'signed', 'enterprise', 'new customer'], milestoneType: 'customer_win', description: 'Customer win or new client' },
  { keywords: ['celebrat', 'anniversary', 'milestone', 'reached', 'achieved'], milestoneType: 'public_celebration', description: 'Public celebration or milestone' },
];

// ─── Hiring Signal Keywords ───────────────────────────────────

const HIRING_KEYWORDS = [
  'hiring', 'open role', 'we are looking', 'join our team', 'careers',
  'job posting', 'position', 'we want', 'recruiting', 'opening',
];

const DEPT_HIRING_KEYWORDS: { keywords: string[]; department: string }[] = [
  { keywords: ['sales', 'bdr', 'account executive', 'revenue'], department: 'Sales / GTM' },
  { keywords: ['support', 'customer success', 'help desk', 'service'], department: 'Customer Support' },
  { keywords: ['engineer', 'developer', 'product', 'technical', 'software'], department: 'Technology & Product' },
  { keywords: ['security', 'compliance', 'cyber'], department: 'Security & Compliance' },
  { keywords: ['marketing', 'content', 'social media', 'brand'], department: 'Marketing' },
  { keywords: ['operations', 'ops', 'logistics'], department: 'Operations' },
  { keywords: ['hr', 'people', 'talent', 'recruiter'], department: 'HR & Talent' },
  { keywords: ['finance', 'accounting', 'cfo', 'admin'], department: 'Finance & Administration' },
];

// ─── Concern Signals by Role ──────────────────────────────────

const ROLE_CONCERNS: Record<string, { concern: string; discoveryQ: string; influence: number }> = {
  executive_founder: {
    concern: 'Strategic growth, revenue, team efficiency, competitive positioning',
    discoveryQ: 'What is your biggest scaling challenge as the business grows?',
    influence: 5,
  },
  sales_gtm: {
    concern: 'Lead volume, conversion rates, sales cycle length, CRM data quality',
    discoveryQ: 'How are leads currently routed from first touch to qualified meeting?',
    influence: 4,
  },
  operations: {
    concern: 'Process bottlenecks, manual handoffs, system integration, reporting',
    discoveryQ: 'What operational processes are still manual that you wish were automated?',
    influence: 3,
  },
  finance_admin: {
    concern: 'Cost control, billing accuracy, invoice processing, financial reporting',
    discoveryQ: 'How do you currently handle billing, invoicing, and expense tracking?',
    influence: 4,
  },
  support: {
    concern: 'Ticket volume, response time, customer satisfaction, team workload',
    discoveryQ: 'How many support inquiries do you handle daily and what is your average response time?',
    influence: 3,
  },
  technical_product: {
    concern: 'Tech debt, integration complexity, tool sprawl, development velocity',
    discoveryQ: 'What tools or systems are causing the most friction for your team?',
    influence: 4,
  },
  security_compliance: {
    concern: 'Compliance obligations, audit readiness, security posture, risk management',
    discoveryQ: 'What compliance frameworks do you maintain and how do you track audit readiness?',
    influence: 4,
  },
  unknown_decision_maker_gap: {
    concern: 'Unknown — this role/ownership needs to be mapped during discovery',
    discoveryQ: 'Who currently owns decisions around [area] and how do they prefer to evaluate solutions?',
    influence: 3,
  },
};

// ─── Role-specific Discovery Questions ──────────────────────────

const QUESTION_TEMPLATES: { category: PeopleDiscoveryQuestion['category']; roleTitle: string; questions: string[] }[] = [
  {
    category: 'founder_ceo',
    roleTitle: 'Founder / CEO',
    questions: [
      'As the business grows, what operational bottlenecks keep you from scaling?',
      'What would a successful automation partnership look like for you?',
      'How do you currently prioritize which internal processes to improve?',
    ],
  },
  {
    category: 'operations',
    roleTitle: 'Operations Lead',
    questions: [
      'What manual processes take up the most team time each week?',
      'How do you track operational efficiency across departments?',
      'What systems don\'t talk to each other that you wish did?',
    ],
  },
  {
    category: 'sales_gtm',
    roleTitle: 'Sales / GTM Lead',
    questions: [
      'What does your lead intake process look like from first click to qualified meeting?',
      'How confident are you that no leads are falling through the cracks?',
      'What CRM or sales tool gaps are causing friction for your team?',
    ],
  },
  {
    category: 'support',
    roleTitle: 'Support Lead',
    questions: [
      'How many support tickets do you handle per week and what percentage are repetitive?',
      'What is your current response time and first-contact resolution rate?',
      'If you could automate one part of your support workflow, what would it be?',
    ],
  },
  {
    category: 'finance_admin',
    roleTitle: 'Finance / Admin Lead',
    questions: [
      'How do you currently manage invoicing, billing, and payment reconciliation?',
      'What financial reporting processes are still manual?',
      'How much time is spent on administrative tasks that could be automated?',
    ],
  },
  {
    category: 'security_compliance',
    roleTitle: 'Security / Compliance Lead',
    questions: [
      'What compliance frameworks do you need to maintain and how do you track audit readiness?',
      'How do you manage security awareness and incident response?',
      'What security processes are manual that you wish were automated?',
    ],
  },
  {
    category: 'technical_product',
    roleTitle: 'Technical / Product Lead',
    questions: [
      'What tool or integration gaps are creating the most friction for your team?',
      'How do you currently prioritize and manage internal tool requests?',
      'What workflows are crying out for automation but haven\'t been addressed yet?',
    ],
  },
];

// ─── Main Analysis Engine ─────────────────────────────────────

export function analyzePeopleText(
  text: string,
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): {
  roleMap: RoleMapEntry[];
  stakeholderHypotheses: StakeholderHypothesis[];
  hiringSignals: HiringSignal[];
  milestoneSignals: MilestoneSignal[];
  outreachAngles: OutreachAngle[];
  discoveryQuestions: PeopleDiscoveryQuestion[];
} {
  const lower = text.toLowerCase();

  // ── 1. Role Map ──────────────────────────────────────────
  const roleMap = buildRoleMap(lower, text, sourceType, sourceUrl);

  // ── 2. Stakeholder Hypotheses ────────────────────────────
  const stakeholderHypotheses = buildStakeholderHypotheses(roleMap, sourceType, sourceUrl);

  // ── 3. Hiring Signals ───────────────────────────────────
  const hiringSignals = buildHiringSignals(lower, text, sourceType, sourceUrl);

  // ── 4. Milestone Signals ────────────────────────────────
  const milestoneSignals = buildMilestoneSignals(lower, text, sourceType, sourceUrl);

  // ── 5. Outreach Angles ──────────────────────────────────
  const outreachAngles = buildOutreachAngles(roleMap, stakeholderHypotheses, hiringSignals, sourceType, sourceUrl);

  // ── 6. Discovery Questions ──────────────────────────────
  const discoveryQuestions = buildDiscoveryQuestions(roleMap, sourceType, sourceUrl);

  return {
    roleMap,
    stakeholderHypotheses,
    hiringSignals,
    milestoneSignals,
    outreachAngles,
    discoveryQuestions,
  };
}

// ─── Role Map Builder ──────────────────────────────────────────

function buildRoleMap(
  lower: string,
  originalText: string,
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): RoleMapEntry[] {
  const found = new Set<string>();
  const entries: RoleMapEntry[] = [];

  for (const signal of ROLE_SIGNALS) {
    if (signal.keywords.some(k => lower.includes(k))) {
      const key = signal.roleType;
      if (found.has(key)) continue;
      found.add(key);

      const evidence = extractEvidence(originalText, signal.keywords[0]);

      entries.push({
        roleType: signal.roleType,
        roleTitle: signal.title,
        department: signal.department,
        evidence,
        confidence: 'Medium',
        sourceType,
        sourceUrl,
      });
    }
  }

  // Check for role gaps ("may need", "unknown", "gap", "not yet")
  const gapPatterns = ['may need', 'need to be mapped', 'unknown', 'gap', 'not yet', 'no dedicated', 'no clear'];
  if (gapPatterns.some(p => lower.includes(p))) {
    if (!found.has('unknown_decision_maker_gap')) {
      const gapEvidence = extractEvidence(originalText, 'need to be mapped') ||
        extractEvidence(originalText, 'gap') ||
        extractEvidence(originalText, 'no dedicated') ||
        'Role ownership gaps identified in the text';
      entries.push({
        roleType: 'unknown_decision_maker_gap',
        roleTitle: 'Unknown Decision-Maker',
        department: 'Needs Discovery',
        evidence: gapEvidence,
        confidence: 'High',
        sourceType,
        sourceUrl,
      });
    }
  }

  return entries;
}

// ─── Stakeholder Hypotheses Builder ─────────────────────────────

function buildStakeholderHypotheses(
  roleMap: RoleMapEntry[],
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): StakeholderHypothesis[] {
  const hypotheses: StakeholderHypothesis[] = [];

  for (const role of roleMap) {
    const concern = ROLE_CONCERNS[role.roleType];
    if (!concern) continue;

    hypotheses.push({
      id: uid('sh'),
      roleTitle: role.roleTitle,
      department: role.department,
      likelyConcern: concern.concern,
      likelyBuyingInfluence: concern.influence,
      likelyDiscoveryQuestion: concern.discoveryQ,
      confidence: role.confidence,
      evidence: role.evidence,
      sourceType,
      sourceUrl,
    });
  }

  return hypotheses;
}

// ─── Hiring Signals Builder ─────────────────────────────────────

function buildHiringSignals(
  lower: string,
  originalText: string,
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): HiringSignal[] {
  const signals: HiringSignal[] = [];
  const isHiring = HIRING_KEYWORDS.some(k => lower.includes(k));

  if (isHiring) {
    // Check which departments are hiring
    for (const dept of DEPT_HIRING_KEYWORDS) {
      if (dept.keywords.some(k => lower.includes(k))) {
        signals.push({
          id: uid('hs'),
          openRole: `Open role in ${dept.department}`,
          department: dept.department,
          growingDepartment: dept.department,
          roleGap: '',
          newInitiative: '',
          repeatedNeed: '',
          toolProcessHint: '',
          evidence: extractEvidence(originalText, dept.keywords[0]) || `Department mentioned: ${dept.department}`,
          confidence: 'Medium',
          sourceType,
          sourceUrl,
        });
      }
    }
  }

  // Detect role gaps from "unknown" ownership patterns
  const gapPatterns = [
    { pattern: 'no dedicated', dept: 'Unknown Department', desc: 'No dedicated owner identified' },
    { pattern: 'may need', dept: 'Multiple', desc: 'Ownership may need to be mapped' },
    { pattern: 'needs discovery', dept: 'Multiple', desc: 'Role needs discovery' },
  ];

  for (const gp of gapPatterns) {
    if (lower.includes(gp.pattern)) {
      const existing = signals.find(s => s.roleGap.includes(gp.desc));
      if (!existing) {
        signals.push({
          id: uid('hs'),
          openRole: gp.desc,
          department: gp.dept,
          growingDepartment: '',
          roleGap: gp.desc,
          newInitiative: '',
          repeatedNeed: '',
          toolProcessHint: '',
          evidence: extractEvidence(originalText, gp.pattern) || `Role gap detected: ${gp.desc}`,
          confidence: 'Medium',
          sourceType,
          sourceUrl,
        });
      }
    }
  }

  return signals;
}

// ─── Milestone Signals Builder ──────────────────────────────────

function buildMilestoneSignals(
  lower: string,
  originalText: string,
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): MilestoneSignal[] {
  const signals: MilestoneSignal[] = [];
  const foundTypes = new Set<string>();

  for (const signal of MILESTONE_SIGNALS) {
    if (signal.keywords.some(k => lower.includes(k))) {
      if (foundTypes.has(signal.milestoneType)) continue;
      foundTypes.add(signal.milestoneType);

      signals.push({
        id: uid('ms'),
        milestoneType: signal.milestoneType,
        description: signal.description,
        evidence: extractEvidence(originalText, signal.keywords[0]) || `Signal: ${signal.description}`,
        confidence: 'Low',
        sourceType,
        sourceUrl,
      });
    }
  }

  return signals;
}

// ─── Outreach Angles Builder ────────────────────────────────────

function buildOutreachAngles(
  roleMap: RoleMapEntry[],
  stakeholderHypotheses: StakeholderHypothesis[],
  hiringSignals: HiringSignal[],
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): OutreachAngle[] {
  const angles: OutreachAngle[] = [];

  // Angle from top stakeholder hypothesis
  const sorted = [...stakeholderHypotheses].sort((a, b) => b.likelyBuyingInfluence - a.likelyBuyingInfluence);
  if (sorted.length > 0) {
    const top = sorted[0];
    angles.push({
      id: uid('oa'),
      angleText: `Your ${top.roleTitle} likely cares about ${top.likelyConcern.toLowerCase()}. Start the conversation there.`,
      targetRole: top.roleTitle,
      confidence: top.confidence,
      evidence: top.evidence,
      sourceType,
      sourceUrl,
    });
  }

  // Angle from hiring signals
  for (const hs of hiringSignals.slice(0, 2)) {
    if (hs.openRole) {
      angles.push({
        id: uid('oa'),
        angleText: `Saw you are growing your ${hs.department} team. Growing teams often create workflow pressure that automation can relieve.`,
        targetRole: `Hiring Manager - ${hs.department}`,
        confidence: 'Medium',
        evidence: hs.evidence,
        sourceType,
        sourceUrl,
      });
    }
  }

  // Angle from tech/security mention
  const hasTech = roleMap.some(r => r.roleType === 'technical_product');
  const hasSecurity = roleMap.some(r => r.roleType === 'security_compliance');
  if (hasTech && hasSecurity) {
    angles.push({
      id: uid('oa'),
      angleText: 'Your AI automation and security focus suggests an opportunity to build secure, automated workflows that reduce manual overhead.',
      targetRole: 'Founder / CTO',
      confidence: 'Medium',
      evidence: 'Detected both technical/product and security/compliance ownership signals',
      sourceType,
      sourceUrl,
    });
  }

  if (angles.length === 0) {
    angles.push({
      id: uid('oa'),
      angleText: 'Based on public information, explore their current operational workflows and where automation could help.',
      targetRole: 'General',
      confidence: 'Low',
      evidence: 'No specific signals detected from public notes',
      sourceType,
      sourceUrl,
    });
  }

  return angles;
}

// ─── Discovery Questions Builder ────────────────────────────────

function buildDiscoveryQuestions(
  roleMap: RoleMapEntry[],
  sourceType: PeopleSignalSourceType,
  sourceUrl: string
): PeopleDiscoveryQuestion[] {
  const questions: PeopleDiscoveryQuestion[] = [];
  const foundCategories = new Set<string>();

  for (const role of roleMap) {
    // Map roleType to question category
    const categoryMap: Record<string, PeopleDiscoveryQuestion['category']> = {
      executive_founder: 'founder_ceo',
      sales_gtm: 'sales_gtm',
      operations: 'operations',
      finance_admin: 'finance_admin',
      support: 'support',
      technical_product: 'technical_product',
      security_compliance: 'security_compliance',
    };

    const qCategory = categoryMap[role.roleType];
    if (!qCategory || foundCategories.has(qCategory)) continue;
    foundCategories.add(qCategory);

    const templates = QUESTION_TEMPLATES.find(t => t.category === qCategory);
    if (!templates) continue;

    // Pick first question for this role
    const qText = templates.questions[0];
    questions.push({
      id: uid('dq'),
      targetRole: role.roleTitle,
      question: qText,
      category: qCategory,
      confidence: 'Medium',
      evidence: role.evidence,
      sourceType,
      sourceUrl,
    });
  }

  // Add generic discovery questions for missing roles
  const allCategories: PeopleDiscoveryQuestion['category'][] = [
    'founder_ceo', 'operations', 'sales_gtm', 'support',
    'finance_admin', 'security_compliance', 'technical_product',
  ];

  for (const cat of allCategories) {
    if (foundCategories.has(cat)) continue;
    const templates = QUESTION_TEMPLATES.find(t => t.category === cat);
    if (!templates) continue;

    questions.push({
      id: uid('dq'),
      targetRole: templates.roleTitle,
      question: templates.questions[0],
      category: cat,
      confidence: 'Low',
      evidence: `Role not explicitly mentioned in source. Generic discovery question for ${templates.roleTitle}.`,
      sourceType,
      sourceUrl,
    });
  }

  // Add gap-specific question if unknown_decision_maker_gap exists
  if (roleMap.some(r => r.roleType === 'unknown_decision_maker_gap')) {
    questions.push({
      id: uid('dq'),
      targetRole: 'Unknown Decision-Maker',
      question: 'Who currently owns the decisions around automation, tools, and workflow improvements?',
      category: 'founder_ceo',
      confidence: 'Medium',
      evidence: 'Role ownership gap identified — question targets mapping decision-maker',
      sourceType,
      sourceUrl,
    });
  }

  return questions;
}

// ─── Utility: Extract Evidence ──────────────────────────────────

function extractEvidence(text: string, keyword: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx === -1) return '';

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + keyword.length + 120);
  let snippet = text.slice(start, end).trim();

  // Clean up snippet boundaries
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}
