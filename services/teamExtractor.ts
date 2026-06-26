// ============================================================
// Team Page Extractor — v1.1
// Aggressive name/role extraction from HTML using multiple strategies:
//   1. Schema.org Person JSON-LD
//   2. hCard microformat
//   3. Semantic CSS class patterns
//   4. Regex name + role proximity matching
//   5. Blog byline / author meta extraction
//
// All extraction is from public HTML — no login, no private data.
// Uses canonical COMMON_FIRST_NAMES from peopleSignalEngine.
// ============================================================

import type { ConfidenceLevel } from '../types';
import { COMMON_FIRST_NAMES } from './peopleSignalEngine';

// ── Output type ───────────────────────────────────────────────

export interface ExtractedPerson {
  name: string;
  role: string;
  department: string;
  linkedInUrl?: string;
  evidence: string;
  sourceUrl: string;
  confidence: ConfidenceLevel;
}

// ── Product/technology term blocklist ─────────────────────────

const PRODUCT_BLOCKLIST = new Set([
  'builder platform','data platform','model hub','compute infrastructure',
  'cloud services','api gateway','machine learning','artificial intelligence',
  'customer portal','admin dashboard','mobile app','web application',
  'web portal','saas platform','enterprise solution','digital transformation',
  'content management','workflow automation','business intelligence',
  'data analytics','customer experience','supply chain','payment processing',
  'identity management','access control','network security','endpoint protection',
  'threat detection','risk management','compliance management','devops platform',
  'ci/cd pipeline','container orchestration','microservices architecture',
  'event streaming','message queue','data warehouse','data lake',
  'real-time analytics','predictive modeling','natural language processing',
  'computer vision','speech recognition','recommendation engine',
  'fraud detection','anomaly detection','sentiment analysis',
  'conversational ai','generative ai','large language model',
  'blockchain platform','cryptocurrency exchange','nft marketplace',
  'augmented reality','virtual reality','mixed reality','spatial computing',
  'internet of things','edge computing','cloud native','serverless',
  'low code','no code','citizen developer','process mining',
  'robotic process automation','intelligent automation','hyper automation',
  'commerce platform','marketplace platform','subscription management',
  'revenue operations','sales engagement','marketing automation',
  'customer data platform','identity resolution','audience segmentation',
]);

function extractFromJsonLd(html: string, sourceUrl: string): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || item['@type'] !== 'Person') continue;
        const name = item.name;
        const role = item.jobTitle || item.worksFor?.jobTitle || '';
        if (name && isLikelyPersonName(name)) {
          people.push({
            name,
            role,
            department: inferDepartment(role),
            linkedInUrl: item.sameAs?.find((u: string) => u.includes('linkedin.com')),
            evidence: 'schema.org Person JSON-LD',
            sourceUrl,
            confidence: 'High',
          });
        }
      }
    } catch { /* invalid JSON */ }
  }
  return people;
}

// ── hCard microformat extraction ──────────────────────────────

function extractFromHCard(html: string, sourceUrl: string): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  // Find vcard blocks
  const vcardRegex = /<[^>]*class=["'][^"']*vcard[^"']*["'][^>]*>([\s\S]*?)<\/\w+>/gi;
  let match;
  while ((match = vcardRegex.exec(html)) !== null) {
    const block = match[0];
    const fn = extractTagContent(block, 'fn');
    const title = extractTagContent(block, 'title') || extractTagContent(block, 'role') || extractTagContent(block, 'org-title');
    if (fn && isLikelyPersonName(fn)) {
      people.push({
        name: fn,
        role: title,
        department: inferDepartment(title),
        evidence: 'hCard microformat',
        sourceUrl,
        confidence: 'High',
      });
    }
  }
  return people;
}

function extractTagContent(html: string, className: string): string {
  const regex = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([^<]*)<`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

// ── Semantic CSS class extraction ─────────────────────────────

function extractFromSemanticHtml(html: string, sourceUrl: string): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  
  // Common team member CSS patterns
  const teamPatterns = [
    /<[^>]*class=["'][^"']*(?:team-member|staff-member|team_member|staff_member|employee-card|employee_profile|profile-card|bio-card|person-card|member-card)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<article[^>]*class=["'][^"']*(?:team|staff|employee|profile|bio)[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
    /<li[^>]*class=["'][^"']*(?:team|staff|employee|member)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
  ];

  for (const pattern of teamPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const block = match[0];
      const extracted = extractNameRoleFromBlock(block, sourceUrl, 'semantic HTML team pattern');
      if (extracted) people.push(extracted);
    }
  }

  return people;
}

function extractNameRoleFromBlock(block: string, sourceUrl: string, evidence: string): ExtractedPerson | null {
  // Try common heading + subtitle patterns
  const namePatterns = [
    /<(?:h[1-6]|strong|span)[^>]*class=["'][^"']*(?:name|title|heading)[^"']*["'][^>]*>([^<]+)<\/\w+>\s*<(?:p|span|div)[^>]*class=["'][^"']*(?:role|title|position|subtitle)[^"']*["'][^>]*>([^<]+)<\/\w+>/i,
    /<(?:h[1-6]|strong|span)[^>]*>([^<]+)<\/\w+>\s*<(?:p|span|div)[^>]*class=["'][^"']*(?:role|title|position|subtitle)[^"']*["'][^>]*>([^<]+)<\/\w+>/i,
    /<(?:h[1-6]|strong|span)[^>]*class=["'][^"']*(?:name|title|heading)[^"']*["'][^>]*>([^<]+)<\/\w+>\s*<(?:p|span|div)[^>]*>([^<]+)<\/\w+>/i,
  ];

  for (const pat of namePatterns) {
    const m = block.match(pat);
    if (m) {
      const name = cleanName(m[1].trim());
      const role = m[2].trim();
      if (name && isLikelyPersonName(name)) {
        return { name, role, department: inferDepartment(role), evidence, sourceUrl, confidence: 'Medium' };
      }
    }
  }

  // Try alt text on images: <img alt="John Smith, CEO">
  const altMatch = block.match(/<img[^>]*alt=["']([^"']+)["'][^>]*>/i);
  if (altMatch) {
    const altText = altMatch[1].trim();
    const personFromAlt = extractNameRoleFromText(altText, sourceUrl, 'image alt text');
    if (personFromAlt) return personFromAlt;
  }

  return null;
}

// ── Regex name + role proximity ───────────────────────────────

function extractFromTextPatterns(html: string, sourceUrl: string): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];
  // Strip HTML tags for text analysis
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern: Name — Role (em-dash separator)
  const emDashPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*[—–-]\s*(VP|Vice President|Head|Director|Manager|CEO|CTO|CFO|COO|CIO|CMO|CSO|CPO|Founder|President|Partner|Principal|Lead|Chief|EVP|SVP|AVP|Senior|Junior|Associate|Staff|Engineer|Developer|Architect|Designer|Analyst|Consultant|Specialist|Coordinator|Administrator|Officer|Representative)[^,.\\n]{0,80}/g;

  let match;
  while ((match = emDashPattern.exec(text)) !== null) {
    const name = cleanName(match[1].trim());
    const role = match[0].replace(match[1], '').replace(/^[—–-\s]+/, '').trim();
    if (isLikelyPersonName(name) && role.length > 2) {
      people.push({ name, role, department: inferDepartment(role), evidence: 'name—role text pattern', sourceUrl, confidence: 'Medium' });
    }
  }

  // Pattern: "Role, Name" (e.g. "CEO John Smith")
  const roleFirstPattern = /\b(CEO|CTO|CFO|COO|CIO|CMO|CSO|CPO|Founder|President|VP of|Vice President of|Head of|Director of|Manager of)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/g;
  while ((match = roleFirstPattern.exec(text)) !== null) {
    const name = cleanName(match[2].trim());
    const role = match[1].trim();
    if (isLikelyPersonName(name)) {
      people.push({ name, role, department: inferDepartment(role), evidence: 'role-name text pattern', sourceUrl, confidence: 'Medium' });
    }
  }

  // Pattern: "Name | Role" or "Name, Role" (pipe or comma separator)
  const pipeCommaPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*[|,]\s*(VP|Vice President|Head|Director|Manager|CEO|CTO|CFO|COO|CIO|CMO|CSO|Founder|President|Partner|Principal|Lead|Chief)[^,.\\n]{0,60}/g;
  while ((match = pipeCommaPattern.exec(text)) !== null) {
    const name = cleanName(match[1].trim());
    const role = match[0].replace(match[1], '').replace(/^[|,\s]+/, '').trim();
    if (isLikelyPersonName(name) && role.length > 2) {
      people.push({ name, role, department: inferDepartment(role), evidence: 'name|role text pattern', sourceUrl, confidence: 'Medium' });
    }
  }

  return people;
}

// ── Blog byline / author extraction ───────────────────────────

function extractFromBylines(html: string, sourceUrl: string): ExtractedPerson[] {
  const people: ExtractedPerson[] = [];

  // <meta name="author" content="John Smith">
  const metaAuthor = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (metaAuthor) {
    const name = cleanName(metaAuthor[1].trim());
    if (isLikelyPersonName(name)) {
      people.push({ name, role: '', department: '', evidence: 'meta author tag', sourceUrl, confidence: 'Low' });
    }
  }

  // "By [Name]" patterns in blog posts
  const byPattern = /(?:By|by|Author:?)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/g;
  let match;
  while ((match = byPattern.exec(html)) !== null) {
    const name = cleanName(match[1].trim());
    if (isLikelyPersonName(name)) {
      people.push({ name, role: '', department: '', evidence: 'blog byline', sourceUrl, confidence: 'Low' });
    }
  }

  return people;
}

// ── Utility: extract from a single text string ────────────────

export function extractNameRoleFromText(
  text: string,
  sourceUrl: string,
  evidence: string
): ExtractedPerson | null {
  // Name — Role
  const m = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*[—–-]\s*(.+)$/);
  if (m) {
    const name = cleanName(m[1].trim());
    const role = m[2].trim();
    if (isLikelyPersonName(name) && role.length > 2) {
      return { name, role, department: inferDepartment(role), evidence, sourceUrl, confidence: 'Medium' };
    }
  }
  // Name, Role
  const m2 = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\s*,\s*(.+)$/);
  if (m2) {
    const name = cleanName(m2[1].trim());
    const role = m2[2].trim();
    if (isLikelyPersonName(name) && role.length > 2) {
      return { name, role, department: inferDepartment(role), evidence, sourceUrl, confidence: 'Medium' };
    }
  }
  return null;
}

// ─── Name Validation ──────────────────────────────────────────

export function isLikelyPersonName(text: string): boolean {
  const words = text.trim().split(/\s+/);
  
  // Must be 2-3 words
  if (words.length < 2 || words.length > 3) return false;
  
  // First word must be a known first name
  if (!COMMON_FIRST_NAMES.has(words[0].toLowerCase())) return false;
  
  // No digits
  if (/\d/.test(text)) return false;
  
  // Not ALL CAPS (likely a company/product name)
  if (text === text.toUpperCase() && text.length > 3) return false;
  
  // Not too long (genuine names are short)
  if (text.length > 30) return false;
  
  // Check against product blocklist
  const lower = text.toLowerCase();
  if (PRODUCT_BLOCKLIST.has(lower)) return false;
  
  // Each remaining word should start with capital letter (proper names)
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > 0 && words[i][0] !== words[i][0].toUpperCase()) return false;
  }
  
  return true;
}

// ─── Department Inference ──────────────────────────────────────

export function inferDepartment(role: string): string {
  const lower = role.toLowerCase();
  if (/\b(ceo|cto|cio|cfo|coo|cmo|cso|cpo|founder|president|chief|owner|managing director|executive director|partner)\b/i.test(lower)) return 'Executive';
  if (/\b(engineer|developer|architect|devops|sre|qa|software|technical|tech lead|coding|programmer|systems)\b/i.test(lower)) return 'Technology';
  if (/\b(sales|account executive|ae |bdr|sdr|business development|revenue|gtm|go-to-market|growth)\b/i.test(lower)) return 'Sales';
  if (/\b(marketing|content|brand|growth marketing|demand gen|seo|sem|social media|pr|communications|creative)\b/i.test(lower)) return 'Marketing';
  if (/\b(support|customer success|cs |customer experience|cx |service desk|help desk|technical support|client services)\b/i.test(lower)) return 'Customer Support';
  if (/\b(finance|accounting|controller|treasurer|audit|tax|bookkeep|cfp|financial)\b/i.test(lower)) return 'Finance';
  if (/\b(hr |human resources|people|talent|recruiting|recruiter|workplace|culture|diversity)\b/i.test(lower)) return 'HR';
  if (/\b(operations|ops |logistics|supply chain|facilities|administration|admin |office manager|procurement)\b/i.test(lower)) return 'Operations';
  if (/\b(legal|counsel|attorney|compliance|regulatory|governance|risk)\b/i.test(lower)) return 'Legal & Compliance';
  if (/\b(security|cyber|infosec|cissp|cism|penetration|soc)\b/i.test(lower)) return 'Security';
  if (/\b(product|product manager|product owner|po |program manager)\b/i.test(lower)) return 'Product';
  if (/\b(data|analytics|bi |business intelligence|data science|data engineer|ml |machine learning|ai |artificial intelligence|research)\b/i.test(lower)) return 'Data & Analytics';
  if (/\b(design|ux |ui |user experience|user interface|graphic|visual|creative director|art director)\b/i.test(lower)) return 'Design';
  return 'Other';
}

// ─── Name Cleaning ────────────────────────────────────────────

function cleanName(raw: string): string {
  return raw
    .replace(/[^a-zA-Z\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main Export: Extract from HTML ───────────────────────────

export function extractPeopleFromHtml(html: string, sourceUrl: string): ExtractedPerson[] {
  const allPeople: ExtractedPerson[] = [];
  
  // Run all strategies in order of confidence
  allPeople.push(...extractFromJsonLd(html, sourceUrl));
  allPeople.push(...extractFromHCard(html, sourceUrl));
  allPeople.push(...extractFromSemanticHtml(html, sourceUrl));
  allPeople.push(...extractFromTextPatterns(html, sourceUrl));
  allPeople.push(...extractFromBylines(html, sourceUrl));

  // Deduplicate by name (keep highest confidence)
  const seen = new Map<string, ExtractedPerson>();
  const confidenceScore = { High: 3, Medium: 2, Low: 1 };
  
  for (const p of allPeople) {
    const key = `${p.name.toLowerCase()}::${p.sourceUrl}`;
    const existing = seen.get(key);
    if (!existing || confidenceScore[p.confidence] > confidenceScore[existing.confidence]) {
      seen.set(key, p);
    }
  }

  return Array.from(seen.values());
}

// ─── Extract from plain text (non-HTML) ───────────────────────

export function extractPeopleFromText(text: string, sourceUrl: string): ExtractedPerson[] {
  // Apply regex patterns directly on text
  const wrappedText = `<div>${text}</div>`; // minimal HTML wrapping for pattern engines
  return [
    ...extractFromTextPatterns(text, sourceUrl),
    ...extractFromBylines(text, sourceUrl),
  ].filter((p, i, arr) => {
    const key = `${p.name.toLowerCase()}::${p.sourceUrl}`;
    return arr.findIndex(x => `${x.name.toLowerCase()}::${x.sourceUrl}` === key) === i;
  });
}

// ─── Source quality scoring ───────────────────────────────────

export function scoreExtractionQuality(people: ExtractedPerson[]): {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  withRoles: number;
  departmentsFound: string[];
} {
  const depts = new Set<string>();
  let high = 0, medium = 0, low = 0, withRoles = 0;

  for (const p of people) {
    if (p.confidence === 'High') high++;
    else if (p.confidence === 'Medium') medium++;
    else low++;
    if (p.role) withRoles++;
    if (p.department) depts.add(p.department);
  }

  return {
    total: people.length,
    highConfidence: high,
    mediumConfidence: medium,
    lowConfidence: low,
    withRoles,
    departmentsFound: Array.from(depts),
  };
}
