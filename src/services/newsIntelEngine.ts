// ============================================================
// News Intel Engine — v1.0
// Processes web search results specifically for news/PR intel.
// Extracts growth signals, pain signals, funding announcements,
// and generates Natively-relevant outreach angles.
//
// Complements aggressiveSearchEngine with news-specific queries
// and dual growth/pain classification for sales prioritization.
// ============================================================

import type { ConfidenceLevel } from '../types';
import type { WebSearchResult } from './reconApiClient';

// ── Output types ──────────────────────────────────────────────

export type NewsSignalType =
  | 'funding_round'
  | 'revenue_growth'
  | 'hiring_spree'
  | 'expansion_new_market'
  | 'product_launch_news'
  | 'acquisition_merger'
  | 'layoffs_restructuring'
  | 'leadership_change_news'
  | 'partnership_news'
  | 'tech_stack_change'
  | 'customer_win_news'
  | 'award_recognition'
  | 'regulatory_compliance'
  | 'scaling_pain'
  | 'general_news';

export interface NewsSignal {
  type: NewsSignalType;
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
  confidence: ConfidenceLevel;
  /** True if this signal indicates company growth (hiring, funding, expansion) */
  growthIndicator: boolean;
  /** True if this signal indicates a pain point (layoffs, compliance, scaling pain) */
  painIndicator: boolean;
  /** Outreach angle tailored to this news signal */
  nativelyAngle: string;
  /** How urgent this signal is for outreach timing */
  urgencyLevel: 'high' | 'medium' | 'low';
}

export interface NewsIntelResult {
  companyName: string;
  signals: NewsSignal[];
  growthSignals: NewsSignal[];
  painSignals: NewsSignal[];
  topNews: NewsSignal[];
  summary: string;
  newsQueries: string[];
}

// ── Pre-built news-specific search queries ──────────────────

export const NEWS_SEARCH_QUERIES = [
  // Funding & financial
  { query: '"{company}" raises funding round million', signalType: 'funding_round' as const },
  { query: '"{company}" revenue growth results annual', signalType: 'revenue_growth' as const },
  { query: '"{company}" valuation investment capital', signalType: 'funding_round' as const },

  // Growth & expansion
  { query: '"{company}" hiring expanding team growth', signalType: 'hiring_spree' as const },
  { query: '"{company}" opens new office location expansion', signalType: 'expansion_new_market' as const },
  { query: '"{company}" expands into international global market', signalType: 'expansion_new_market' as const },

  // Leadership & people
  { query: '"{company}" hires appoints new CEO CTO VP executive', signalType: 'leadership_change_news' as const },
  { query: '"{company}" leadership team management announcement', signalType: 'leadership_change_news' as const },

  // Products & tech
  { query: '"{company}" launches announces new product feature platform', signalType: 'product_launch_news' as const },
  { query: '"{company}" technology stack digital transformation cloud', signalType: 'tech_stack_change' as const },

  // Partnerships & customers
  { query: '"{company}" partnership collaboration alliance agreement', signalType: 'partnership_news' as const },
  { query: '"{company}" customer win client success case study', signalType: 'customer_win_news' as const },

  // Pain indicators
  { query: '"{company}" layoffs restructuring workforce reduction cuts', signalType: 'layoffs_restructuring' as const },
  { query: '"{company}" struggling scaling challenges growing pains', signalType: 'scaling_pain' as const },
  { query: '"{company}" data breach security incident vulnerability', signalType: 'regulatory_compliance' as const },

  // Awards & recognition
  { query: '"{company}" award recognition best workplace top company', signalType: 'award_recognition' as const },

  // M&A
  { query: '"{company}" acquires merger acquisition deal buy', signalType: 'acquisition_merger' as const },

  // General news
  { query: '"{company}" news announcement press release latest', signalType: 'general_news' as const },
];

// ── Signal type metadata ─────────────────────────────────────

interface SignalMeta {
  growth: boolean;
  pain: boolean;
  urgency: 'high' | 'medium' | 'low';
  angleTemplate: string;
}

const SIGNAL_META: Record<NewsSignalType, SignalMeta> = {
  funding_round: {
    growth: true,
    pain: false,
    urgency: 'high',
    angleTemplate: 'Just raised {amount} — how are you planning to scale operations without proportionally growing headcount?',
  },
  revenue_growth: {
    growth: true,
    pain: false,
    urgency: 'medium',
    angleTemplate: 'Impressive growth trajectory — as you scale, are manual workflows becoming a bottleneck?',
  },
  hiring_spree: {
    growth: true,
    pain: true,
    urgency: 'high',
    angleTemplate: 'Growing the team fast — new hires often mean onboarding and process gaps we can automate.',
  },
  expansion_new_market: {
    growth: true,
    pain: true,
    urgency: 'high',
    angleTemplate: 'New markets mean new operational complexity — we can standardize workflows across locations.',
  },
  product_launch_news: {
    growth: true,
    pain: true,
    urgency: 'medium',
    angleTemplate: 'Launching new products often strains support and operations — we can automate the onboarding flow.',
  },
  acquisition_merger: {
    growth: true,
    pain: true,
    urgency: 'high',
    angleTemplate: 'Post-merger integration is tough — merging systems and workflows is exactly what we build.',
  },
  layoffs_restructuring: {
    growth: false,
    pain: true,
    urgency: 'high',
    angleTemplate: 'Doing more with less after restructuring — automation bridges the gap without new hires.',
  },
  leadership_change_news: {
    growth: false,
    pain: false,
    urgency: 'medium',
    angleTemplate: 'New leadership often means new priorities — here is how we help smooth operational transitions.',
  },
  partnership_news: {
    growth: true,
    pain: false,
    urgency: 'medium',
    angleTemplate: 'New partnership creates integration opportunities — we can build the bridge between systems.',
  },
  tech_stack_change: {
    growth: false,
    pain: true,
    urgency: 'medium',
    angleTemplate: 'Tech changes create migration pain — we can automate the transition workflows.',
  },
  customer_win_news: {
    growth: true,
    pain: false,
    urgency: 'low',
    angleTemplate: 'Congrats on the customer win — as you scale delivery, we can help automate fulfillment.',
  },
  award_recognition: {
    growth: false,
    pain: false,
    urgency: 'low',
    angleTemplate: 'Congrats on the recognition — maintaining that standard at scale takes automation.',
  },
  regulatory_compliance: {
    growth: false,
    pain: true,
    urgency: 'high',
    angleTemplate: 'Compliance pressure often exposes process gaps — we can automate audit readiness.',
  },
  scaling_pain: {
    growth: true,
    pain: true,
    urgency: 'high',
    angleTemplate: 'Scaling pains are real — manual processes break at volume. We fix that.',
  },
  general_news: {
    growth: false,
    pain: false,
    urgency: 'low',
    angleTemplate: 'Recent news about {company} — great icebreaker for personalized outreach.',
  },
};

// ── Signal classification patterns ───────────────────────────

const NEWS_SIGNAL_PATTERNS: {
  type: NewsSignalType;
  keywords: RegExp[];
  confidence: ConfidenceLevel;
}[] = [
  {
    type: 'funding_round',
    keywords: [
      /\b(?:raised|secured|closed|announced|lands?)\s+(?:\$[\d.]+|[\d.]+\s*(?:million|billion|M|B|k))\s*(?:in\s+)?(?:series\s*[a-e]|seed|funding|round|investment|venture|capital)/i,
      /\b(?:series\s*[a-e]|seed\s*round|pre-seed|angel\s*round|venture\s*round|growth\s*round)\b/i,
      /\b(?:valuation\s+(?:of\s+)?(?:\$[\d.]+|[\d.]+\s*(?:million|billion)))\b/i,
      /\b(?:funding\s+round|capital\s+raise|equity\s+financing|debt\s+financing)\b/i,
      /\b(?:investors?\s+(?:led|backed|participated|joined|committed))\b/i,
      /\b(?:unicorn|decacorn|soonicorn)\b/i,
      /\b(?:closes?\s+(?:\$[\d.]+|[\d.]+\s*(?:million|billion)))\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'revenue_growth',
    keywords: [
      /\b(?:revenue\s+(?:grew|growth|increased|surpassed|exceeded|topped|reached))\b/i,
      /\b(?:ARR|annual\s+recurring\s+revenue)\s+(?:grew|increased|reached|surpassed)\b/i,
      /\b(?:revenue\s+(?:of\s+)?(?:\$[\d.]+|[\d.]+\s*(?:million|billion)))\b/i,
      /\b(?:grew\s+(?:revenue|sales)\s+(?:by|[\d.]+%|[\d.]+x))\b/i,
      /\b(?:record\s+(?:revenue|quarter|year|growth))\b/i,
      /\b(?:profitable|profitability|cash\s+flow\s+positive)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'hiring_spree',
    keywords: [
      /\b(?:hiring\s+(?:spree|surge|push|blitz|aggressively|rapidly|hundreds|dozens)|on\s+a\s+hiring\s+(?:spree|binge))\b/i,
      /\b(?:plans?\s+to\s+hire\s+[\d,]+\s+(?:new\s+)?(?:employees?|people|staff|workers?))\b/i,
      /\b(?:doubl(?:ing|e)\s+(?:headcount|team|staff|workforce))\b/i,
      /\b(?:expanding\s+(?:team|headcount|workforce)\s+(?:by|across|to))\b/i,
      /\b(?:growing\s+(?:the\s+)?(?:team|headcount)\s+(?:from|to|by))\b/i,
      /\b(?:adding\s+[\d,]+\s+(?:new\s+)?(?:positions|roles|jobs|employees?))\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'expansion_new_market',
    keywords: [
      /\b(?:expand(?:s|ing|ed)?\s+(?:into|to|across)\s+(?:new\s+)?(?:market|region|country|territory|city))\b/i,
      /\b(?:opens?\s+(?:new|additional|second|third|fourth)\s+(?:office|location|headquarters|hub))\b/i,
      /\b(?:international\s+expansion|global\s+expansion|market\s+entry|geo\s+expansion)\b/i,
      /\b(?:launch(?:es|ing|ed)?\s+(?:in|into)\s+(?:Europe|Asia|APAC|EMEA|LATAM|Australia|Canada|UK))\b/i,
      /\b(?:now\s+(?:available|serving|operating)\s+(?:in|across)\s+(?:[\d]+\s+)?(?:new\s+)?(?:countries|markets))\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'product_launch_news',
    keywords: [
      /\b(?:launch(?:es|ing|ed)?\s+(?:a\s+)?(?:new|major|latest)\s+(?:product|platform|feature|version|service|solution|tool|offering))\b/i,
      /\b(?:announce(?:s|d|ing)?\s+(?:a\s+)?(?:new|major)\s+(?:product|platform|feature|release))\b/i,
      /\b(?:unveil(?:s|ed|ing)?\s+(?:a\s+)?(?:new|major)\s+(?:product|platform|feature))\b/i,
      /\b(?:introduce(?:s|d|ing)?\s+(?:a\s+)?(?:new)\s+(?:product|platform|feature|capability))\b/i,
      /\b(?:now\s+available|generally\s+available|GA\s+release|public\s+beta)\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'acquisition_merger',
    keywords: [
      /\b(?:acquire(?:s|d|ing)?|acquisition)\s+(?:of\s+)?(?:\w+\s+){0,3}(?:for\s+)?(?:\$[\d.]+|[\d.]+\s*(?:million|billion))?\b/i,
      /\b(?:merger|merged|merges)\s+(?:with|of|between)\b/i,
      /\b(?:bought|purchased|takeover|buyout)\s+(?:of\s+)?(?:\w+\s+){0,3}\b/i,
      /\b(?:deal\s+to\s+acquire|agreement\s+to\s+acquire|definitive\s+agreement)\b/i,
      /\b(?:consolidation|roll-up|rollup|tuck-in\s+acquisition)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'layoffs_restructuring',
    keywords: [
      /\b(?:layoffs?|laid\s+off|job\s+cuts?|reduction\s+in\s+force|RIF|downsiz(?:ing|ed))\b/i,
      /\b(?:workforce\s+reduction|headcount\s+reduction|staff\s+reduction)\b/i,
      /\b(?:restructur(?:ing|ed)|reorg(?:anization)?)\b/i,
      /\b(?:furlough|severance|severance\s+package)\b/i,
      /\b(?:cut(?:ting)?\s+[\d,]+\s+(?:jobs?|positions?|roles?|employees?))\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'leadership_change_news',
    keywords: [
      /\b(?:appoint(?:s|ed|ing)?|name(?:s|d)?|hire(?:s|d)?)\s+(?:as\s+)?(?:new\s+)?(?:CEO|CTO|CFO|COO|CIO|CMO|CPO|CRO|President|VP|Director|Head|Chief)\b/i,
      /\b(?:new\s+(?:CEO|CTO|CFO|COO|CIO|CMO|CPO|CRO|President|VP|Director|Head))\b/i,
      /\b(?:steps?\s+down|resigns?|departs?|leaves?\s+(?:as|the))\s+(?:CEO|CTO|CFO|COO)\b/i,
      /\b(?:leadership\s+(?:change|shakeup|transition|announcement))\b/i,
      /\b(?:executive\s+(?:hire|appointment|departure|change|transition))\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'partnership_news',
    keywords: [
      /\b(?:partner(?:s|ship|ed|ing)?\s+(?:with|announce(?:s|d)?))\b/i,
      /\b(?:strategic\s+(?:alliance|collaboration|partnership|relationship))\b/i,
      /\b(?:teamed\s+up|joins?\s+forces|collaborat(?:es?|ing|ion))\b/i,
      /\b(?:integrates?\s+with|integration\s+(?:with|of|partner|announce(?:s|d)?))\b/i,
      /\b(?:alliance|channel\s+partner|reseller\s+agreement|OEM\s+agreement)\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'tech_stack_change',
    keywords: [
      /\b(?:migrat(?:es?|ing|ed|ion)\s+(?:to|from)\s+(?:AWS|Azure|GCP|cloud|Snowflake|Databricks))\b/i,
      /\b(?:digital\s+transformation|cloud\s+migration|modernization\s+(?:effort|initiative|project))\b/i,
      /\b(?:adopt(?:s|ed|ing)?\s+(?:AI|machine\s+learning|automation|RPA))\b/i,
      /\b(?:tech\s+(?:stack|overhaul|refresh|upgrade|modernization))\b/i,
      /\b(?:replatform|re-platform|refactor|rebuild)\s+(?:ing|ed|s)?\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'customer_win_news',
    keywords: [
      /\b(?:customer\s+(?:win|success|case\s+study|testimonial))\b/i,
      /\b(?:selected\s+(?:by|as)|chosen\s+(?:by|as)|awarded\s+(?:contract|deal))\b/i,
      /\b(?:client\s+(?:win|success|onboard|go-live|launch))\b/i,
      /\b(?:sign(?:s|ed)?\s+(?:new\s+)?(?:customer|client|deal|contract|agreement))\b/i,
      /\b(?:deploy(?:s|ed)?\s+(?:at|with|for)\s+(?:new\s+)?(?:customer|client|enterprise))\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'award_recognition',
    keywords: [
      /\b(?:award(?:ed)?|won|named|recognized|honored|selected)\s+(?:as\s+)?(?:a\s+)?(?:best|top|leading|fastest)\b/i,
      /\b(?:best\s+(?:place\s+to\s+work|company|culture|product|workplace))\b/i,
      /\b(?:top\s+(?:workplace|employer|company|product|startup|software))\b/i,
      /\b(?:Inc\s*5000|Deloitte|Forbes|Gartner|Fast\s+Company|Fortune|Built\s+In)\b/i,
      /\b(?:recognized\s+(?:as|by|in|on))\b/i,
    ],
    confidence: 'Medium',
  },
  {
    type: 'regulatory_compliance',
    keywords: [
      /\b(?:data\s+breach|security\s+incident|cyberattack|ransomware|hacked)\b/i,
      /\b(?:GDPR|HIPAA|SOC2|SOC\s*2|ISO\s*27001|PCI\s+DSS|compliance)\s+(?:violation|fine|penalty|audit|requirement)\b/i,
      /\b(?:regulatory\s+(?:fine|penalty|action|investigation|scrutiny))\b/i,
      /\b(?:lawsuit|sued|litigation|class\s+action|settlement)\b/i,
      /\b(?:FTC|SEC|DOJ|CFPB)\s+(?:investigation|fine|action|probe)\b/i,
    ],
    confidence: 'High',
  },
  {
    type: 'scaling_pain',
    keywords: [
      /\b(?:struggling\s+(?:to\s+)?(?:scale|keep\s+up|manage|handle))\b/i,
      /\b(?:growing\s+pains?|scaling\s+(?:challenges?|issues?|problems?|difficulties?))\b/i,
      /\b(?:outg(?:rew|row(?:n|ing)?)\s+(?:their|its|the)\s+(?:system|platform|process))\b/i,
      /\b(?:bottleneck|backlog|delays?\s+(?:in|with)|customer\s+complaints?\s+(?:about|regarding))\b/i,
      /\b(?:manual\s+(?:process|workflow|task|data\s+entry))\s+(?:causing|creating|leading)\b/i,
      /\b(?:technical\s+debt|legacy\s+system|custom\s+code\s+nightmare)\b/i,
    ],
    confidence: 'Medium',
  },
];

// ── Date extraction ──────────────────────────────────────────

function extractDate(snippet: string): string | undefined {
  const datePatterns = [
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/i,
    /\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i,
    /(?:in\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    /\d{4}-\d{2}-\d{2}/,
    /(?:published|posted|dated)\s+(?:on\s+)?([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];
  for (const p of datePatterns) {
    const m = snippet.match(p);
    if (m) return m[0].replace(/^(?:published|posted|dated)\s+(?:on\s+)?/i, '');
  }
  return undefined;
}

// ── Source extraction ────────────────────────────────────────

function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Map known news domains to readable names
    const domainMap: Record<string, string> = {
      'techcrunch.com': 'TechCrunch',
      'venturebeat.com': 'VentureBeat',
      'forbes.com': 'Forbes',
      'businessinsider.com': 'Business Insider',
      'bloomberg.com': 'Bloomberg',
      'reuters.com': 'Reuters',
      'wsj.com': 'Wall Street Journal',
      'cnbc.com': 'CNBC',
      'fastcompany.com': 'Fast Company',
      'inc.com': 'Inc.',
      'fortune.com': 'Fortune',
      'crunchbase.com': 'Crunchbase',
      'pitchbook.com': 'PitchBook',
      'geekwire.com': 'GeekWire',
      'axios.com': 'Axios',
      'theinformation.com': 'The Information',
      'arstechnica.com': 'Ars Technica',
      'wired.com': 'Wired',
      'zdnet.com': 'ZDNet',
      'theverge.com': 'The Verge',
      'protocol.com': 'Protocol',
      'siliconangle.com': 'SiliconANGLE',
      'thenextweb.com': 'TNW',
      'builtin.com': 'Built In',
      'glassdoor.com': 'Glassdoor',
      'g2.com': 'G2',
    };
    return domainMap[hostname] || hostname;
  } catch {
    return 'Unknown Source';
  }
}

// ── Generate Natively outreach angle ─────────────────────────

function generateNativelyAngle(signal: NewsSignal, companyName: string): string {
  const meta = SIGNAL_META[signal.type];
  let angle = meta.angleTemplate;

  // Replace company name placeholder
  angle = angle.replace(/\{company\}/g, companyName);

  // Extract funding amount if available
  if (signal.type === 'funding_round') {
    const amountMatch = signal.snippet.match(/\$[\d.]+(?:\s*(?:million|billion|M|B))?/i);
    if (amountMatch) {
      angle = angle.replace(/\{amount\}/g, amountMatch[0]);
    } else {
      angle = angle.replace(/\{amount\}/g, 'new funding');
    }
  }

  return angle;
}

// ── Classify a single search result ──────────────────────────

function classifyNewsResult(
  result: WebSearchResult,
  companyName: string
): NewsSignal[] {
  const signals: NewsSignal[] = [];
  const text = `${result.title} ${result.snippet}`;
  const source = extractSource(result.url);

  for (const pattern of NEWS_SIGNAL_PATTERNS) {
    const matched = pattern.keywords.some(k => k.test(text));
    if (matched) {
      const meta = SIGNAL_META[pattern.type];
      const signal: NewsSignal = {
        type: pattern.type,
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        source,
        date: extractDate(result.snippet),
        confidence: pattern.confidence,
        growthIndicator: meta.growth,
        painIndicator: meta.pain,
        nativelyAngle: '', // filled after
        urgencyLevel: meta.urgency,
      };
      signal.nativelyAngle = generateNativelyAngle(signal, companyName);
      signals.push(signal);
    }
  }

  // If nothing matched, try general news classification
  if (signals.length === 0 && result.title && result.snippet) {
    const meta = SIGNAL_META.general_news;
    const signal: NewsSignal = {
      type: 'general_news',
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      source,
      date: extractDate(result.snippet),
      confidence: 'Low',
      growthIndicator: meta.growth,
      painIndicator: meta.pain,
      nativelyAngle: '',
      urgencyLevel: meta.urgency,
    };
    signal.nativelyAngle = generateNativelyAngle(signal, companyName);
    signals.push(signal);
  }

  return signals;
}

// ── Main export: process news search results ─────────────────

export function processNewsResults(
  results: WebSearchResult[],
  companyName: string,
  queryLabel?: string
): NewsSignal[] {
  const allSignals: NewsSignal[] = [];

  for (const result of results) {
    allSignals.push(...classifyNewsResult(result, companyName));
  }

  // Deduplicate by URL (keep highest confidence, prefer non-general_news)
  const seen = new Map<string, NewsSignal>();
  const confidenceScore: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 };

  for (const s of allSignals) {
    const existing = seen.get(s.url);
    if (!existing) {
      seen.set(s.url, s);
    } else {
      // Prefer non-general news
      if (existing.type === 'general_news' && s.type !== 'general_news') {
        seen.set(s.url, s);
      } else if (confidenceScore[s.confidence] > confidenceScore[existing.confidence]) {
        seen.set(s.url, s);
      }
    }
  }

  return Array.from(seen.values());
}

// ── Batch process: run multiple queries and consolidate ──────

export function processAllNewsQueries(
  queryResults: { query: string; results: WebSearchResult[] }[],
  companyName: string
): NewsIntelResult {
  const allSignals: NewsSignal[] = [];

  for (const { query, results } of queryResults) {
    const signals = processNewsResults(results, companyName, query);
    allSignals.push(...signals);
  }

  // Re-deduplicate across queries
  const seen = new Map<string, NewsSignal>();
  const confidenceScore: Record<ConfidenceLevel, number> = { High: 3, Medium: 2, Low: 1 };

  for (const s of allSignals) {
    const existing = seen.get(s.url);
    if (!existing) {
      seen.set(s.url, s);
    } else if (existing.type === 'general_news' && s.type !== 'general_news') {
      seen.set(s.url, s);
    } else if (confidenceScore[s.confidence] > confidenceScore[existing.confidence]) {
      seen.set(s.url, s);
    }
  }

  const uniqueSignals = Array.from(seen.values());

  // Sort by urgency then confidence
  const urgencyScore = { high: 3, medium: 2, low: 1 };
  uniqueSignals.sort((a, b) => {
    const urgDiff = urgencyScore[b.urgencyLevel] - urgencyScore[a.urgencyLevel];
    if (urgDiff !== 0) return urgDiff;
    return confidenceScore[b.confidence] - confidenceScore[a.confidence];
  });

  // Separate growth and pain signals
  const growthSignals = uniqueSignals.filter(s => s.growthIndicator);
  const painSignals = uniqueSignals.filter(s => s.painIndicator);

  // Top news: high urgency, high confidence, non-general
  const topNews = uniqueSignals
    .filter(s => s.type !== 'general_news' && (s.urgencyLevel === 'high' || s.confidence === 'High'))
    .slice(0, 8);

  // Build summary
  const growthTypes = new Set(growthSignals.map(s => s.type));
  const painTypes = new Set(painSignals.map(s => s.type));

  const summaryParts: string[] = [];
  if (growthSignals.length > 0) {
    summaryParts.push(
      `${growthSignals.length} growth signal${growthSignals.length !== 1 ? 's' : ''}`
    );
  }
  if (painSignals.length > 0) {
    summaryParts.push(
      `${painSignals.length} pain signal${painSignals.length !== 1 ? 's' : ''}`
    );
  }
  if (topNews.length > 0) {
    summaryParts.push(`${topNews.length} high-priority news item${topNews.length !== 1 ? 's' : ''}`);
  }

  const summary = summaryParts.length > 0
    ? `News intel for ${companyName}: ${summaryParts.join(', ')} found across ${queryResults.length} search queries.`
    : `No significant news signals found for ${companyName}.`;

  return {
    companyName,
    signals: uniqueSignals,
    growthSignals,
    painSignals,
    topNews,
    summary,
    newsQueries: queryResults.map(q => q.query),
  };
}

// ── Quick summary for CRM brief integration ─────────────────

export function formatNewsForCrmBrief(result: NewsIntelResult): string[] {
  const lines: string[] = [];
  lines.push('NEWS INTEL');
  lines.push('='.repeat(40));

  if (result.topNews.length > 0) {
    lines.push('');
    lines.push('Top News:');
    result.topNews.forEach(s => {
      lines.push(`  [${s.urgencyLevel.toUpperCase()}] ${s.title}`);
      lines.push(`    Source: ${s.source} · ${s.date || 'Unknown date'}`);
      lines.push(`    Angle: ${s.nativelyAngle}`);
    });
  }

  if (result.growthSignals.length > 0) {
    lines.push('');
    lines.push(`Growth Signals (${result.growthSignals.length}):`);
    const byType = new Map<string, number>();
    result.growthSignals.forEach(s => {
      byType.set(s.type, (byType.get(s.type) || 0) + 1);
    });
    Array.from(byType.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => lines.push(`  ${type.replace(/_/g, ' ')}: ${count}`));
  }

  if (result.painSignals.length > 0) {
    lines.push('');
    lines.push(`Pain Signals (${result.painSignals.length}):`);
    const byType = new Map<string, number>();
    result.painSignals.forEach(s => {
      byType.set(s.type, (byType.get(s.type) || 0) + 1);
    });
    Array.from(byType.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => lines.push(`  ${type.replace(/_/g, ' ')}: ${count}`));
  }

  return lines;
}

// ── Generate sample news queries for a company ───────────────

export function generateNewsQueries(companyName: string): { query: string; signalType: NewsSignalType }[] {
  return NEWS_SEARCH_QUERIES.map(({ query, signalType }) => ({
    query: query.replace('{company}', companyName),
    signalType,
  }));
}

// ── Async orchestration (for use in reconScanner pipeline) ───

export interface NewsIntelItem {
  query: string;
  signals: NewsSignal[];
}

/**
 * Run all news search queries and return structured results.
 * Designed for use within the aggressive recon pipeline.
 */
export async function processNewsSearchResults(
  searchFn: (query: string, maxResults?: number) => Promise<{ success: boolean; results: WebSearchResult[]; message: string }>,
  companyName: string,
  options?: { maxResultsPerQuery?: number }
): Promise<NewsIntelItem[]> {
  const results: NewsIntelItem[] = [];
  const maxResults = options?.maxResultsPerQuery || 5;

  for (const { query } of NEWS_SEARCH_QUERIES) {
    try {
      const q = query.replace('{company}', companyName);
      const searchResult = await searchFn(q, maxResults);
      if (searchResult.success && searchResult.results.length > 0) {
        const signals = processNewsResults(searchResult.results, companyName, q);
        if (signals.length > 0) {
          results.push({ query: q, signals });
        }
      }
    } catch {
      // Skip failed queries — errors are handled at the pipeline level
    }
  }

  return results;
}
