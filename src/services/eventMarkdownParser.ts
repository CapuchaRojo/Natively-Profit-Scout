// ============================================================
// Natively Profit Scout — Event Markdown Parser Service
// Parses .txt / .md files containing event attendee/sponsor
// lists and extracts structured EventDiscoveryCandidate records.
// ============================================================

import type { EventDiscoveryCandidate, ExtractedPerson, ConfidenceLevel, AccountType } from '../types';

// ── Known SaaS/tech keywords for tech stack extraction ──

const TECH_STACK_KEYWORDS = [
  'salesforce', 'hubspot', 'slack', 'asana', 'jira', 'notion', 'airtable',
  'zendesk', 'intercom', 'stripe', 'shopify', 'wordpress', 'shopify',
  'mailchimp', 'sendgrid', 'twilio', 'datadog', 'sentry', 'mixpanel',
  'amplitude', 'segment', 'snowflake', 'databricks', 'looker', 'tableau',
  'power bi', 'metabase', 'posthog', 'linear', 'clickup', 'monday.com',
  'trello', 'basecamp', 'confluence', 'gitlab', 'github', 'bitbucket',
  'circleci', 'jenkins', 'docker', 'kubernetes', 'aws', 'gcp',
  'azure', 'vercel', 'netlify', 'heroku', 'digitalocean', 'supabase',
  'firebase', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
  'algolia', 'meilisearch', 'cloudflare', 'fastly', 'akamai',
  'zoom', 'google meet', 'teams', 'calendly', 'hubspot meetings',
  'docuSign', 'hellosign', 'pandaDoc', 'quickbooks', 'xero',
  'adobe', 'figma', 'sketch', 'invision', 'zeplin',
  'sentry', 'rollbar', 'bugsnag', 'new relic', 'grafana',
  'prometheus', 'pagerduty', 'opsgenie', 'statuspage',
];

// ── Regex patterns ──

/** Match **Company Name** — bold markdown segments */
const BOLD_PATTERN = /\*\*([^*]+)\*\*/g;

/** Match *URL* — italic markdown segments (typically right after the company name) */
const ITALIC_PATTERN = /\*([^*]+)\*/g;

/** Match [tag] patterns like [scout], [sponsor], [speaker] */
const TAG_PATTERN = /\[(\w[\w-]*)\]/gi;

/** Match bullet points (lines starting with - or * followed by a space) */
const BULLET_PATTERN = /^[-*]\s+(.+)$/gm;

/** Match person mentions: "- Name (Role)" or "- Name – Role" or "- Name, Role" */
const PERSON_PATTERN = /[-*]\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:\(([^)]*)\)|(?:–|-|,)\s*([^,]*))?/g;

/** Match URLs in text */
const URL_PATTERN = /https?:\/\/[^\s*)+]+/g;

// ── Helpers ──

let idCounter = 0;
function generateId(): string {
  return `event-candidate-${Date.now()}-${++idCounter}`;
}

/**
 * Guess the event name from a filename.
 * E.g. "SXSW-2025.txt" → "SXSW 2025", "NVIDIA_GTC_2026.md" → "NVIDIA GTC 2026"
 */
function guessEventName(fileName: string): string {
  const cleaned = fileName
    .replace(/\.(txt|md)$/i, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Unknown Event';
}

/**
 * Determine confidence level based on how many fields are populated.
 */
function determineConfidence(
  hasName: boolean,
  hasWebsite: boolean,
  hasDescription: boolean,
  hasPeople: boolean,
): ConfidenceLevel {
  if (hasName && hasWebsite) return 'High';
  if (hasName && (hasDescription || hasPeople)) return 'Medium';
  if (hasName) return 'Medium';
  return 'Low';
}

/**
 * Extract people names from a bullet point.
 */
function extractPeopleFromBullets(rawBullets: string[]): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  const seen = new Set<string>();

  for (const bullet of rawBullets) {
    PERSON_PATTERN.lastIndex = 0;
    let match;
    while ((match = PERSON_PATTERN.exec(bullet)) !== null) {
      const name = (match[1] || '').trim();
      if (!name || name.length < 3) continue;
      const role = (match[2] || match[3] || '').trim();
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        people.push({ name, role: role || undefined, sourceBullet: bullet });
      }
    }
  }

  return people;
}

/**
 * Extract tech stack mentions from bullet points.
 */
function extractTechStack(rawBullets: string[]): string[] {
  const found = new Set<string>();
  const combined = rawBullets.join(' ').toLowerCase();

  for (const keyword of TECH_STACK_KEYWORDS) {
    if (combined.includes(keyword)) {
      found.add(keyword);
    }
  }

  return Array.from(found).sort();
}

/**
 * Extract URLs from text content.
 */
function extractUrls(text: string): string[] {
  const urls: string[] = [];
  URL_PATTERN.lastIndex = 0;
  let match;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    urls.push(match[0]);
  }
  return urls;
}

/**
 * Infer account type from tags and description.
 * [sponsor] → compute_provider (default for event sponsors)
 * [speaker] → client_lead
 * [scout] → partner
 */
function inferAccountType(tags: string[], description: string): AccountType {
  const lower = description.toLowerCase();
  const tagLower = tags.map(t => t.toLowerCase());

  if (tagLower.includes('sponsor') || tagLower.includes('exhibitor')) return 'compute_provider';
  if (tagLower.includes('speaker') || tagLower.includes('panelist')) return 'client_lead';
  if (tagLower.includes('scout') || tagLower.includes('partner')) return 'partner';

  // Fallback heuristics
  if (/\b(gpu|compute|data center|infrastructure|cloud|chip)\b/i.test(lower)) return 'compute_provider';
  if (/\b(agency|consulting|partner)\b/i.test(lower)) return 'partner';

  return 'client_lead';
}

// ── Main Parser ──

/**
 * Parse markdown event text and extract structured company records.
 *
 * Expected format:
 * ```
 * ## Event Name (optional — auto-detected from filename)
 *
 * **Company Name** *https://company.com* [sponsor]
 * - Description / tagline
 * - John Doe (CTO)
 * - Uses Salesforce, Slack
 *
 * **Another Company** [scout]
 * - Notable detail
 * ```
 */
export function parseEventMarkdown(
  markdown: string,
  fileName?: string,
): EventDiscoveryCandidate[] {
  const lines = markdown.split('\n');
  const candidates: EventDiscoveryCandidate[] = [];

  const eventName = fileName ? guessEventName(fileName) : undefined;

  // Split text into company blocks delimited by **Company Name**
  // Strategy: find all **Name** segments and collect the text between them
  const segments: { name: string; textBlock: string }[] = [];

  let currentName = '';
  let currentText = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line contains a bold company name
    const boldMatch = trimmed.match(BOLD_PATTERN);
    if (boldMatch) {
      // If we already had a company in progress, save it
      if (currentName) {
        // Remove the company name line from the text block
        segments.push({ name: currentName, textBlock: currentText });
      }

      // Start new company — extract the name from bold
      const nameMatch = trimmed.match(/\*\*([^*]+)\*\*/);
      currentName = nameMatch ? nameMatch[1].trim() : trimmed.replace(/\*+/g, '').trim();
      currentText = trimmed;
    } else if (currentName) {
      // Append to current company's text block
      currentText += '\n' + trimmed;
    }
  }

  // Don't forget the last company
  if (currentName) {
    segments.push({ name: currentName, textBlock: currentText });
  }

  // If no bold segments found, try a fallback: treat each non-empty line as a company
  if (segments.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      segments.push({ name: trimmed, textBlock: trimmed });
    }
  }

  // Process each segment into a candidate
  for (const { name, textBlock } of segments) {
    if (!name || name.length < 2) continue;

    const rawBullets: string[] = [];

    // Extract bullet points from this block
    BULLET_PATTERN.lastIndex = 0;
    let bMatch;
    while ((bMatch = BULLET_PATTERN.exec(textBlock)) !== null) {
      rawBullets.push(bMatch[1].trim());
    }

    // If no explicit bullets, treat non-bold lines as pseudo-bullets
    if (rawBullets.length === 0) {
      const textLines = textBlock.split('\n').map(l => l.trim()).filter(Boolean);
      for (const tl of textLines) {
        // Skip the line that contains the company name itself
        if (tl.includes(`**${name}**`)) continue;
        const cleaned = tl.replace(/\*+/g, '').replace(/^[-*]\s*/, '').trim();
        if (cleaned && cleaned.length > 2) {
          rawBullets.push(cleaned);
        }
      }
    }

    // Extract website URL
    const urls = extractUrls(textBlock);
    let website = urls.find(u => !u.includes('linkedin.com')) || urls[0] || '';

    // Also check for italic markdown for a URL
    if (!website) {
      ITALIC_PATTERN.lastIndex = 0;
      let iMatch;
      while ((iMatch = ITALIC_PATTERN.exec(textBlock)) !== null) {
        const val = iMatch[1].trim();
        if (val.startsWith('http')) {
          website = val;
          break;
        }
      }
    }

    // Extract tags
    const tags: string[] = [];
    TAG_PATTERN.lastIndex = 0;
    let tMatch;
    while ((tMatch = TAG_PATTERN.exec(textBlock)) !== null) {
      tags.push(tMatch[1].trim());
    }

    // Extract people
    const extractedPeople = extractPeopleFromBullets(rawBullets);

    // Extract tech stack
    const extractedTechStack = extractTechStack(rawBullets);

    // The first few bullets often contain a description
    const description = rawBullets[0] || '';

    // Determine confidence
    const confidence = determineConfidence(
      !!name,
      !!website,
      !!description,
      extractedPeople.length > 0,
    );

    const suggestedAccountType = inferAccountType(tags, description);
    const suggestedProductLane = suggestedAccountType === 'compute_provider' ? 'compute' : 'builder';

    candidates.push({
      id: generateId(),
      companyName: name,
      website,
      eventName,
      description,
      extractedPeople,
      extractedTechStack,
      rawBullets,
      tags,
      confidence,
      sourceFile: fileName || 'paste',
      status: tags.includes('scout') ? 'research_queue' : 'pending',
      suggestedAccountType,
      suggestedProductLane,
      editableNotes: '',
    });
  }

  return candidates;
}

/**
 * Detect if text is likely an event markdown list.
 * Returns a score from 0-1.
 */
export function detectEventMarkdown(text: string): number {
  const lines = text.split('\n').filter(l => l.trim()).length;
  const boldMatches = (text.match(BOLD_PATTERN) || []).length;
  const bulletMatches = (text.match(BULLET_PATTERN) || []).length;

  // Need at least a few lines, some bold names, and some bullets
  if (lines < 3) return 0;
  if (boldMatches < 1) return 0.3;

  const ratio = bulletMatches / lines;
  if (boldMatches >= 2 && ratio >= 0.2) return 0.9;
  if (boldMatches >= 1 && ratio >= 0.1) return 0.7;

  return 0.4;
}

/**
 * Deduplicate candidates against existing companies.
 * Returns the candidate with `matchedExistingCompanyId` set if found.
 */
export function deduplicateCandidates(
  candidates: EventDiscoveryCandidate[],
  existingCompanyNames: string[],
): EventDiscoveryCandidate[] {
  const normalizedExisting = new Set(
    existingCompanyNames.map(n => n.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
  );

  return candidates.map(c => {
    const normalized = c.companyName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const websiteLower = c.website.toLowerCase().trim();

    // Check by normalized name
    const nameMatch = [...normalizedExisting].find(n => n === normalized);

    if (nameMatch) {
      return { ...c, matchedExistingCompanyId: 'existing' };
    }

    // Check by website
    if (websiteLower) {
      const webMatch = existingCompanyNames.find(n => {
        const existingWebsite = n.toLowerCase().trim();
        return websiteLower.includes(existingWebsite) || existingWebsite.includes(websiteLower);
      });
      if (webMatch) {
        return { ...c, matchedExistingCompanyId: 'existing' };
      }
    }

    return c;
  });
}
