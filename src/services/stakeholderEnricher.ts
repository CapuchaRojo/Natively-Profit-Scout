// ============================================================
// Stakeholder Enricher — v1.0
// Maps extracted people (from team pages, LinkedIn, search)
// to full Stakeholder records with role-based talk tracks,
// objections, priorities, and auto-generated outreach angles.
//
// Role mapping rules come from the Natively Profit Builder
// methodology: RIDE → SELECT → PRICE.
// ============================================================

import type { Stakeholder, StakeholderCategory, ConfidenceLevel, AccessStatus } from '../types';
import type { ExtractedPerson } from './teamExtractor';

// ── Role → Stakeholder mapping ───────────────────────────────

interface RoleMapping {
  patterns: RegExp[];
  category: StakeholderCategory;
  buyingInfluence: number;
  defaultConcern: string;
}

const ROLE_MAPPINGS: RoleMapping[] = [
  {
    patterns: [/\b(CEO|Chief Executive|Founder|President|Owner|Managing Director|Executive Director)\b/i],
    category: 'economic_buyer',
    buyingInfluence: 5,
    defaultConcern: 'Business growth, operational efficiency, competitive positioning, and bottom-line impact.',
  },
  {
    patterns: [/\b(CFO|Chief Financial|VP Finance|Finance Director|Controller|Treasurer)\b/i],
    category: 'economic_buyer',
    buyingInfluence: 4,
    defaultConcern: 'ROI, budget allocation, cost control, financial risk, and vendor consolidation.',
  },
  {
    patterns: [/\b(CTO|Chief Technology|CIO|Chief Information|VP Engineering|VP of Engineering|Technical Director|Head of Engineering)\b/i],
    category: 'technical_buyer',
    buyingInfluence: 4,
    defaultConcern: 'Technology stack fit, integration complexity, security, scalability, and developer productivity.',
  },
  {
    patterns: [/\b(COO|Chief Operating|VP Operations|Operations Director|Head of Operations)\b/i],
    category: 'influencer',
    buyingInfluence: 4,
    defaultConcern: 'Process efficiency, team productivity, operational bottlenecks, and scalability.',
  },
  {
    patterns: [/\b(CMO|Chief Marketing|VP Marketing|Marketing Director|Head of Marketing|Head of Growth)\b/i],
    category: 'influencer',
    buyingInfluence: 3,
    defaultConcern: 'Lead generation, conversion rates, content efficiency, and marketing ROI.',
  },
  {
    patterns: [/\b(CSO|Chief Sales|VP Sales|Sales Director|Head of Sales|Revenue Officer)\b/i],
    category: 'champion',
    buyingInfluence: 4,
    defaultConcern: 'Pipeline velocity, close rates, sales team productivity, and CRM effectiveness.',
  },
  {
    patterns: [/\b(VP Customer|Head of Customer|Customer Success Director|Support Director|Head of Support)\b/i],
    category: 'daily_user',
    buyingInfluence: 3,
    defaultConcern: 'Customer satisfaction, response times, ticket volume, and support team bandwidth.',
  },
  {
    patterns: [/\b(Product Manager|Product Director|Head of Product|VP Product|CPO|Chief Product)\b/i],
    category: 'influencer',
    buyingInfluence: 3,
    defaultConcern: 'Feature delivery speed, user feedback loops, roadmap prioritization, and build-vs-buy decisions.',
  },
  {
    patterns: [/\b(Engineering Manager|Tech Lead|Lead Engineer|Principal Engineer|Staff Engineer|Software Architect)\b/i],
    category: 'technical_buyer',
    buyingInfluence: 3,
    defaultConcern: 'Code quality, technical debt, developer experience, and build-vs-integrate tradeoffs.',
  },
  {
    patterns: [/\b(Director|Manager|Head|Lead)\b/i],
    category: 'influencer',
    buyingInfluence: 2,
    defaultConcern: 'Team efficiency, process improvement, and getting more done with current resources.',
  },
];

// ── Default mapping for unknown roles ─────────────────────────

const DEFAULT_MAPPING: RoleMapping = {
  patterns: [/.*/],
  category: 'unknown_but_needed',
  buyingInfluence: 2,
  defaultConcern: 'To be determined during discovery — ask about their priorities in the first conversation.',
};

// ── Role-based talk tracks ───────────────────────────────────

function generateTalkTrack(role: string, category: StakeholderCategory, personName?: string): string {
  const name = personName ? personName.split(' ')[0] : 'there';
  
  switch (category) {
    case 'economic_buyer':
      return `Hi ${name}, I noticed you're the ${role} at [Company]. Based on what I've seen, [Company] appears to be [key observation]. We help companies in similar situations [specific outcome] — would you be open to a brief conversation about how we could do the same for [Company]?`;
    case 'technical_buyer':
      return `Hi ${name}, as ${role} at [Company], you're likely thinking about [technical concern]. We specialize in building [relevant solution] that integrates with your existing stack. I'd love to get your take on [specific technical question] — have 15 minutes?`;
    case 'champion':
      return `Hi ${name}, your ${role} role at [Company] means you're on the front lines of [department challenge]. We help [role] teams [specific win] — curious if you're experiencing [common friction]?`;
    case 'daily_user':
      return `Hi ${name}, as ${role} I imagine you deal with [daily friction] regularly. We build tools that [relieve that friction] — would love to hear if that resonates with your experience.`;
    case 'influencer':
      return `Hi ${name}, your ${role} perspective at [Company] is exactly who we should talk to. We help teams in your position [outcome]. I have a few questions about how [Company] handles [process] — worth a quick call?`;
    case 'executive_sponsor':
      return `Hi ${name}, your leadership of [area] at [Company] is impressive. We help executive teams [strategic outcome] — I have an idea specific to [Company] that I'd love to share.`;
    case 'blocker':
      return `Hi ${name}, I understand you're the ${role} at [Company]. I want to make sure any solution we propose aligns with your priorities around [likely concern]. Could we have a brief conversation to understand what success looks like from your perspective?`;
    case 'procurement_admin':
      return `Hi ${name}, as the ${role} at [Company], you're likely the gatekeeper for vendor evaluation. I'd like to understand your procurement process so we can make any potential engagement as smooth as possible.`;
    case 'unknown_but_needed':
      return `Hi ${name}, I noticed you're the ${role} at [Company]. I'm reaching out because [relevant observation] — I think there may be an opportunity to [value proposition]. Would you be open to a brief chat?`;
    default:
      return `Hi ${name}, as ${role} at [Company], I wanted to reach out about [relevant topic]. We help teams like yours [outcome] — would a brief conversation make sense?`;
  }
}

// ── Role-based objections ────────────────────────────────────

function generateObjections(role: string, category: StakeholderCategory): string {
  switch (category) {
    case 'economic_buyer':
      return '"We don\'t have budget for this right now" — Reframe as cost savings. "We already have tools for that" — Focus on integration gaps. "Not a priority this quarter" — Quantify cost of inaction.';
    case 'technical_buyer':
      return '"Our team can build this internally" — Highlight time-to-value advantage. "Doesn\'t integrate with our stack" — Emphasize API-first approach. "Security concerns" — Address data handling and compliance.';
    case 'champion':
      return '"I need to run this up the chain" — Offer to help build internal business case. "We just renewed with [competitor]" — Position as complementary, not replacement.';
    case 'daily_user':
      return '"I\'m not the decision maker" — Ask who is and offer to loop them in. "We\'re too busy to evaluate new tools" — Offer a no-effort pilot.';
    case 'influencer':
      return '"This isn\'t in my scope" — Ask who owns this area. "We tried something similar and it didn\'t work" — Explore what went wrong.';
    default:
      return '"Not interested right now" — Ask about timing. "Send me more information" — Offer a specific, personalized demo instead.';
  }
}

// ── Role-based priorities ────────────────────────────────────

function generatePriorities(role: string, category: StakeholderCategory, department: string): string {
  const dept = department.toLowerCase();
  
  if (category === 'economic_buyer') {
    if (dept === 'executive') return 'Revenue growth, operational efficiency, competitive advantage, strategic positioning.';
    if (dept === 'finance') return 'Cost reduction, budget optimization, vendor consolidation, financial reporting accuracy.';
    return 'Business impact, ROI, team productivity, strategic outcomes.';
  }
  if (category === 'technical_buyer') {
    return 'System reliability, developer productivity, security posture, technology stack modernization, build-vs-buy decisions.';
  }
  if (dept === 'sales') return 'Pipeline velocity, close rates, CRM hygiene, lead response time, team quota attainment.';
  if (dept === 'marketing') return 'Lead quality, conversion rates, content throughput, campaign ROI, brand consistency.';
  if (dept === 'customer support') return 'Ticket resolution time, customer satisfaction, support team bandwidth, knowledge base effectiveness.';
  if (dept === 'operations') return 'Process efficiency, error reduction, team coordination, reporting accuracy, vendor management.';
  if (dept === 'hr') return 'Employee onboarding speed, retention, compliance tracking, performance review efficiency.';

  return `To be discovered in conversation — ask about their top 3 priorities this quarter.`;
}

// ── Access status inference ──────────────────────────────────

function inferAccessStatus(person: ExtractedPerson): AccessStatus {
  if (person.linkedInUrl) return 'researchable';
  return 'suspected';
}

// ── Main mapping function ────────────────────────────────────

export function mapExtractedPersonToStakeholder(
  person: ExtractedPerson,
  existingStakeholders: Stakeholder[]
): Stakeholder | null {
  // Find matching role mapping
  const roleLower = person.role.toLowerCase();
  let mapping = ROLE_MAPPINGS.find(m => m.patterns.some(p => p.test(roleLower)));
  if (!mapping) mapping = DEFAULT_MAPPING;

  // Check for duplicates
  const existingKey = `${person.role.toLowerCase()}::${mapping.category}`;
  const isDuplicate = existingStakeholders.some(s =>
    `${s.role.toLowerCase()}::${s.category}` === existingKey
  );
  if (isDuplicate) return null;

  // Name duplicate check
  if (person.name) {
    const nameDuplicate = existingStakeholders.some(s =>
      s.name && s.name.toLowerCase() === person.name.toLowerCase()
    );
    if (nameDuplicate) return null;
  }

  const accessStatus = inferAccessStatus(person);
  const id = `stk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    category: mapping.category,
    name: person.name || undefined,
    role: person.role || 'Team Member',
    department: person.department || 'Unknown',
    likelyPriorities: generatePriorities(person.role, mapping.category, person.department),
    likelyObjections: generateObjections(person.role, mapping.category),
    whatTheyCareAbout: mapping.defaultConcern,
    bestTalkTrack: generateTalkTrack(person.role, mapping.category, person.name),
    bestProof: 'To be determined during discovery — reference relevant case study or demo.',
    buyingInfluence: mapping.buyingInfluence,
    accessStatus,
    confidence: person.confidence,
  };
}

// ── Batch mapping ────────────────────────────────────────────

export function mapExtractedPeopleToStakeholders(
  people: ExtractedPerson[],
  existingStakeholders: Stakeholder[]
): { stakeholders: Stakeholder[]; skipped: number; duplicates: number } {
  let skipped = 0;
  let duplicates = 0;
  const newStakeholders: Stakeholder[] = [];

  // Sort by confidence (High first)
  const sorted = [...people].sort((a, b) => {
    const score = { High: 3, Medium: 2, Low: 1 };
    return (score[b.confidence] || 0) - (score[a.confidence] || 0);
  });

  for (const person of sorted) {
    if (!person.role && !person.name) {
      skipped++;
      continue;
    }
    
    const stakeholder = mapExtractedPersonToStakeholder(person, [
      ...existingStakeholders,
      ...newStakeholders,
    ]);
    
    if (!stakeholder) {
      duplicates++;
    } else {
      newStakeholders.push(stakeholder);
    }
  }

  return { stakeholders: newStakeholders, skipped, duplicates };
}

// ── Generate a summary of mapped stakeholders ────────────────

export function generateStakeholderMappingSummary(
  result: { stakeholders: Stakeholder[]; skipped: number; duplicates: number }
): string {
  const { stakeholders, skipped, duplicates } = result;
  
  const byCategory = new Map<string, number>();
  for (const s of stakeholders) {
    byCategory.set(s.category, (byCategory.get(s.category) || 0) + 1);
  }

  const categorySummary = Array.from(byCategory.entries())
    .map(([cat, count]) => `${count} ${cat.replace(/_/g, ' ')}`)
    .join(', ');

  const named = stakeholders.filter(s => s.name).length;

  let summary = `Created ${stakeholders.length} stakeholder record${stakeholders.length !== 1 ? 's' : ''}`;
  if (named > 0) summary += ` (${named} with names)`;
  if (categorySummary) summary += `: ${categorySummary}.`;
  if (duplicates > 0) summary += ` ${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped.`;
  if (skipped > 0) summary += ` ${skipped} skipped due to missing data.`;

  return summary;
}
