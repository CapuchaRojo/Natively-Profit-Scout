// ============================================================
// Aggressive Search Engine — v1.0
// Processes web search results from the proxy into categorized
// intel signals: funding, partnerships, leadership changes,
// product launches, awards, layoffs, expansion, and more.
//
// Each signal includes a Natively-relevant angle for outreach.
// ============================================================

import type { ConfidenceLevel } from '../types';
import type { WebSearchResult } from './reconApiClient';

// ── Output types ──────────────────────────────────────────────

export type IntelSignalType =
  | 'funding'
  | 'partnership'
  | 'leadership_change'
  | 'product_launch'
  | 'award'
  | 'layoffs'
  | 'expansion'
  | 'acquisition'
  | 'legal_issue'
  | 'customer_win'
  | 'technology_adoption'
  | 'general_news';

export interface IntelSignal {
  type: IntelSignalType;
  title: string;
  url: string;
  snippet: string;
  date?: string;
  nativelyAngle: string;
  confidence: ConfidenceLevel;
}

export interface SearchIntelResult {
  query: string;
  results: WebSearchResult[];
  signals: IntelSignal[];
  summary: string;
}

// ── Pre-built search queries ─────────────────────────────────

export const AGGRESSIVE_SEARCH_QUERIES = [
  { query: '"{company}" CEO', signalType: 'leadership_change' as const },
  { query: '"{company}" funding raised', signalType: 'funding' as const },
  { query: '"{company}" partnership announced', signalType: 'partnership' as const },
  { query: '"{company}" news', signalType: 'general_news' as const },
  { query: '"{company}" layoffs OR restructuring', signalType: 'layoffs' as const },
  { query: '"{company}" Glassdoor', signalType: 'general_news' as const },
  { query: '"{company}" new product launch', signalType: 'product_launch' as const },
  { query: '"{company}" award OR recognition', signalType: 'award' as const },
  { query: '"{company}" expansion OR new office', signalType: 'expansion' as const },
  { query: '"{company}" acquired OR merger', signalType: 'acquisition' as const },
  { query: '"{company}" customer case study', signalType: 'customer_win' as const },
  { query: '"{company}" digital transformation OR AI', signalType: 'technology_adoption' as const },
];

// ── Signal classification ────────────────────────────────────

const SIGNAL_PATTERNS: { type: IntelSignalType; keywords: RegExp[]; confidence: ConfidenceLevel }[] = [
  {
    type: 'funding',
    keywords: [
      /\b(?:raised|secured|closed|announced)\s+(?:\$[\d.]+|[\d.]+\s*(?:million|billion|M|B|k))\s*(?:in\s+)?(?:series\s*[a-e]|seed|funding|round|investment|venture)/i,
      /\b(?:series\s*[a-e]|seed\s*round|pre-seed|angel\s*round|venture\s*round)\b/i,
      /\b(?:investors?\s+(?:led|backed|participated|joined))\b/i,
      /\b(?:valuation|unicorn|decacorn)\b/i,
      /\b(?:funding\s+round|capital\s+raise|equity\s+financing)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'partnership',
    keywords: [
      /\b(?:partnership|partnered|alliance|strategic\s+collaboration|teamed\s+up)\b/i,
      /\b(?:integrates?\s+with|joins?\s+forces|announces?\s+collaboration)\b/i,
      /\b(?:reseller\s+agreement|channel\s+partner|OEM\s+agreement)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'leadership_change',
    keywords: [
      /\b(?:appointed|named|hires?\s+new|joins?\s+as)\s+(?:CEO|CTO|CFO|COO|CIO|CMO|President|VP|Director|Head|Chief)\b/i,
      /\b(?:new\s+(?:CEO|CTO|CFO|COO|CIO|CMO|President|VP|Director|Head))\b/i,
      /\b(?:leadership\s+change|executive\s+hire|management\s+shakeup)\b/i,
      /\b(?:steps?\s+down|resigns?|departs?|leaves?\s+(?:as|the))\s+(?:CEO|CTO|CFO|COO)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'product_launch',
    keywords: [
      /\b(?:launched|announced|released|unveiled|introduced)\s+(?:a\s+)?(?:new|major|latest)\s+(?:product|platform|feature|version|service|solution|tool)\b/i,
      /\b(?:now\s+available|generally\s+available|GA\s+release)\b/i,
      /\b(?:product\s+launch|product\s+update|feature\s+release)\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'award',
    keywords: [
      /\b(?:award|awarded|recognized|won|named|honored|selected)\b/i,
      /\b(?:best\s+(?:place\s+to\s+work|company|culture|product)|top\s+(?:workplace|employer|company|product))\b/i,
      /\b(?:inc\s*5000|deloitte|forbes|gartner|fast\s+company)\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'layoffs',
    keywords: [
      /\b(?:layoffs?|laid\s+off|job\s+cuts?|reduction\s+in\s+force|RIF|downsiz(?:ing|ed)|workforce\s+reduction|restructur(?:ing|ed))\b/i,
      /\b(?:furlough|severance|headcount\s+reduction)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'expansion',
    keywords: [
      /\b(?:expanded|expansion|new\s+office|new\s+location|opened\s+(?:a\s+)?(?:new|additional)\s+(?:office|location|headquarters))\b/i,
      /\b(?:international\s+expansion|global\s+expansion|market\s+entry)\b/i,
      /\b(?:hiring\s+(?:hundreds|thousands|aggressively|rapidly|across))\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'acquisition',
    keywords: [
      /\b(?:acquired|acquisition|merger|merged|bought|purchased|takeover)\b/i,
      /\b(?:deal\s+to\s+acquire|agreement\s+to\s+acquire)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'legal_issue',
    keywords: [
      /\b(?:lawsuit|sued|litigation|settlement|regulatory\s+fine|DOJ|FTC|SEC\s+investigation|data\s+breach)\b/i,
      /\b(?:class\s+action|patent\s+troll|IP\s+dispute)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'customer_win',
    keywords: [
      /\b(?:customer\s+case\s+study|client\s+success|testimonial|roi\s+study|deployed|implemented)\b/i,
      /\b(?:selected\s+(?:by|as)|chosen\s+(?:by|as))\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'technology_adoption',
    keywords: [
      /\b(?:digital\s+transformation|AI\s+(?:strategy|adoption|implementation|initiative))\b/i,
      /\b(?:cloud\s+migration|modernization|automation\s+initiative)\b/i,
      /\b(?:migrated\s+to|adopted|implemented)\s+(?:AWS|Azure|GCP|cloud|AI|machine\s+learning)\b/i,
    ],
    confidence: 'Medium',
  },
];

// ── Generate Natively angle ──────────────────────────────────

function generateNativelyAngle(signal: IntelSignal): string {
  switch (signal.type) {
    case 'funding':
      return `Funding round = budget for automation. Pitch: "Now that you've raised, how are you scaling operations without adding headcount?"`;
    case 'partnership':
      return `Partnership = integration opportunity. Pitch: "Your new partnership likely creates workflow gaps — we can bridge them."`;
    case 'leadership_change':
      return `New exec = new priorities. Pitch: "New leaders often bring process changes — here's how we help smooth that transition."`;
    case 'product_launch':
      return `New product = support scaling needs. Pitch: "Launching new products often strains support — we can automate onboarding."`;
    case 'award':
      return `Award = public recognition. Pitch: "Congrats on the award — how are you maintaining that standard as you scale?"`;
    case 'layoffs':
      return `Layoffs = automation urgency. Pitch: "After restructuring, teams need to do more with less — automation bridges the gap."`;
    case 'expansion':
      return `Expansion = scaling pain. Pitch: "Growing into new markets means new workflows — we can standardize them."`;
    case 'acquisition':
      return `Acquisition = integration chaos. Pitch: "Merging companies means merging systems — we can build the bridge."`;
    case 'legal_issue':
      return `Legal issue = compliance needs. Pitch: "Regulatory pressure often exposes process gaps — we can automate compliance."`;
    case 'customer_win':
      return `Customer win = social proof. Reference this in outreach: "I saw {company} chose you — we help companies like yours scale delivery."`;
    case 'technology_adoption':
      return `Tech adoption = build opportunity. Pitch: "As you adopt new tech, you'll need custom workflows — we build those fast."`;
    case 'general_news':
      return `Recent news = conversation starter. Use as icebreaker: "I saw the recent news about {company}..."`;
    default:
      return `Public signal = outreach relevance. Use as context for personalized outreach.`;
  }
}

// ── Extract date from snippet ────────────────────────────────

function extractDate(snippet: string): string | undefined {
  const datePatterns = [
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i,
    /\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i,
    /(?:in\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    /\d{4}-\d{2}-\d{2}/,
  ];
  for (const p of datePatterns) {
    const m = snippet.match(p);
    if (m) return m[0];
  }
  return undefined;
}

// ── Classify a single search result ──────────────────────────

function classifyResult(result: WebSearchResult): IntelSignal[] {
  const signals: IntelSignal[] = [];
  const text = `${result.title} ${result.snippet}`;

  for (const pattern of SIGNAL_PATTERNS) {
    const matched = pattern.keywords.some(k => k.test(text));
    if (matched) {
      signals.push({
        type: pattern.type,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        date: extractDate(result.snippet),
        nativelyAngle: '', // filled after
        confidence: pattern.confidence,
      });
    }
  }

  // If no signal patterns matched, it's general news
  if (signals.length === 0 && result.title && result.snippet) {
    signals.push({
      type: 'general_news',
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      date: extractDate(result.snippet),
      nativelyAngle: '',
      confidence: 'Low',
    });
  }

  return signals.map(s => ({ ...s, nativelyAngle: generateNativelyAngle(s) }));
}

// ── Main export: process search results ──────────────────────

export function processSearchResults(
  query: string,
  results: WebSearchResult[],
  companyName?: string
): SearchIntelResult {
  const allSignals: IntelSignal[] = [];
  
  for (const result of results) {
    allSignals.push(...classifyResult(result));
  }

  // Deduplicate by URL (keep highest confidence)
  const seen = new Map<string, IntelSignal>();
  const confidenceScore = { High: 3, Medium: 2, Low: 1 };
  
  for (const s of allSignals) {
    const existing = seen.get(s.url);
    if (!existing || confidenceScore[s.confidence] > confidenceScore[existing.confidence]) {
      seen.set(s.url, s);
    }
  }

  const uniqueSignals = Array.from(seen.values());

  // Sort by confidence (High → Low) then by type priority
  const typePriority: Record<IntelSignalType, number> = {
    funding: 1, layoffs: 2, acquisition: 3, leadership_change: 4,
    partnership: 5, expansion: 6, product_launch: 7, customer_win: 8,
    technology_adoption: 9, award: 10, legal_issue: 11, general_news: 12,
  };

  uniqueSignals.sort((a, b) => {
    const confDiff = confidenceScore[b.confidence] - confidenceScore[a.confidence];
    if (confDiff !== 0) return confDiff;
    return (typePriority[a.type] || 99) - (typePriority[b.type] || 99);
  });

  // Generate summary
  const signalTypes = new Set(uniqueSignals.map(s => s.type));
  const summaryParts: string[] = [];
  if (signalTypes.has('funding')) summaryParts.push('funding activity');
  if (signalTypes.has('leadership_change')) summaryParts.push('leadership changes');
  if (signalTypes.has('partnership')) summaryParts.push('partnerships');
  if (signalTypes.has('layoffs')) summaryParts.push('restructuring');
  if (signalTypes.has('expansion')) summaryParts.push('expansion');
  if (signalTypes.has('product_launch')) summaryParts.push('product launches');
  const summary = summaryParts.length > 0
    ? `Found ${uniqueSignals.length} signal${uniqueSignals.length !== 1 ? 's' : ''} including ${summaryParts.join(', ')}.`
    : `Found ${uniqueSignals.length} result${uniqueSignals.length !== 1 ? 's' : ''} for "${query}".`;

  return {
    query,
    results,
    signals: uniqueSignals,
    summary,
  };
}

// ── Batch process multiple search queries ────────────────────

export function processAllSearchResults(
  allResults: { query: string; results: WebSearchResult[] }[],
  companyName?: string
): SearchIntelResult[] {
  return allResults.map(({ query, results }) =>
    processSearchResults(query, results, companyName)
  );
}

// ── Generate a consolidated intel summary ────────────────────

export function generateConsolidatedSummary(intelResults: SearchIntelResult[]): string {
  const allSignals = intelResults.flatMap(r => r.signals);
  const uniqueSignals = new Map<string, IntelSignal>();
  for (const s of allSignals) {
    if (!uniqueSignals.has(s.url)) uniqueSignals.set(s.url, s);
  }

  const signals = Array.from(uniqueSignals.values());
  const high = signals.filter(s => s.confidence === 'High').length;
  const medium = signals.filter(s => s.confidence === 'Medium').length;
  const low = signals.filter(s => s.confidence === 'Low').length;

  const types = new Map<IntelSignalType, number>();
  for (const s of signals) {
    types.set(s.type, (types.get(s.type) || 0) + 1);
  }

  const typeSummary = Array.from(types.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => `${type.replace(/_/g, ' ')} (${count})`)
    .join(', ');

  return `Aggressive search complete: ${signals.length} unique signals found (${high} high, ${medium} medium, ${low} low confidence). Top signals: ${typeSummary}.`;
}