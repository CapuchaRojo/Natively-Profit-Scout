// ============================================================
// People Name Extractor — v0.7
// Robust extraction of real person names and roles from
// pasted LinkedIn/company/team text.
// Handles patterns like:
//   "Andrea Marazzi, PhD — Chief Commercial Officer"
//   "Pawel Czech — Thinking about thinking. Building the AI-Native Economy"
// ============================================================

import { COMMON_FIRST_NAMES, ROLE_TITLE_KEYWORDS } from './peopleSignalEngine';
import type { ConfidenceLevel } from '../types';
import type { NamedPerson } from '../types';

// ─── Name-Role Extraction Patterns ────────────────────────────

/**
 * Extended common first names — includes international variations
 * that LinkedIn text often contains.
 */
const EXTENDED_FIRST_NAMES = new Set([
  ...COMMON_FIRST_NAMES,
  'andrea', 'pawel', 'marco', 'luca', 'giovanni', 'francesco',
  'alessandro', 'matteo', 'lorenzo', 'federico', 'stefano', 'nikolai',
  'dmitri', 'sergei', 'vladimir', 'alexei', 'yuri', 'igor',
  'bjorn', 'sven', 'lars', 'anders', 'magnus', 'henrik',
  'jan', 'pieter', 'klaas', 'hendrik', 'willem',
  'jean-pierre', 'jean-luc', 'pierre', 'francois', 'antoine',
  'hans', 'klaus', 'dieter', 'wolfgang', 'juergen',
  'juan', 'carlos', 'luis', 'jose', 'miguel', 'pedro', 'rafael',
  'yuki', 'takeshi', 'kenji', 'hiroshi', 'akira',
  'wei', 'ming', 'jian', 'lei', 'li', 'xin',
  'raj', 'vikram', 'arjun', 'ravi', 'anil', 'sanjay',
  'amos', 'moshe', 'david', 'avi', 'yael',
  'patrick', 'bridget', 'siobhan', 'ciaran', 'aoife', 'niamh',
  'maria', 'josef', 'tomas', 'karel', 'pavel',
  'nikola', 'dusan', 'marko', 'ivan', 'dragan',
]);

/**
 * Common surname patterns for disambiguation
 */
const COMMON_LAST_NAME_PATTERNS = [
  /^[A-Z][a-z]+$/,
  /^[A-Z][a-z]+-[A-Z][a-z]+$/,
  /^Mc[A-Z][a-z]+$/,
  /^Mac[A-Z][a-z]+$/,
  /^O'[A-Z][a-z]+$/,
  /^[A-Z][a-z]+sson$/,
  /^[A-Z][a-z]+sen$/,
  /^[A-Z][a-z]+ski$/,
  /^[A-Z][a-z]+ov$/,
  /^[A-Z][a-z]+ova$/,
  /^[A-Z][a-z]+es$/,
  /^[A-Z][a-z]+ez$/,
  /^[A-Z]'[A-Z][a-z]+$/,
  /^da [A-Z][a-z]+$/i,
  /^de [A-Z][a-z]+$/i,
  /^van [A-Z][a-z]+$/i,
  /^von [A-Z][a-z]+$/i,
];

/**
 * Titles to strip from role lines
 */
const TITLE_STRIP = /(?:(?:Ph\.?D|M\.?D|M\.?B\.?A|M\.?S\.?c|CPA|Esq\.?|Jr\.?|Sr\.?|III|II|IV|1st|2nd)\s*,?\s*)*$/i;

// ─── Extraction Functions ────────────────────────────────────

export interface NameWithRole {
  name: string;
  role?: string;
  department?: string;
  confidence: ConfidenceLevel;
  evidence: string;
  buyerType?: NamedPerson['buyerType'];
}

/**
 * Extract named people from LinkedIn-style company/about text.
 * Handles multiple formats commonly found in pasted LinkedIn text.
 */
export function extractNamedPeople(text: string): NameWithRole[] {
  const results: NameWithRole[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\n/);

  // ── Pattern 1: "Name, credentials — Role description" (LinkedIn about section) ──
  // "Andrea Marazzi, PhD — Chief Commercial Officer"
  // "Pawel Czech — Thinking about thinking. Building the AI-Native Economy"
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 8) continue;

    // Match: "Prefix Name LastName[, suffix] [|–—,-] [role/description]"
    const nameRoleMatch = trimmed.match(
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2}(?:,?\s*(?:Ph\.?D|M\.?D|M\.?B\.?A|M\.?S\.?c|CPA|1st|2nd|3rd))?(?:\s*,?\s*(?:Ph\.?D|M\.?D|M\.?B\.?A))?)\s*[–—|\-,:]\s*(.+)$/
    );
    if (nameRoleMatch) {
      const rawName = nameRoleMatch[1].trim();
      const afterDash = nameRoleMatch[2].trim();
      const name = cleanName(rawName);
      if (!isLikelyPersonNameExtended(name)) continue;

      const { role, department, buyerType } = extractRoleFromAfterDash(afterDash);

      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        results.push({
          name,
          role,
          department,
          confidence: role ? 'High' : 'Medium',
          evidence: trimmed.slice(0, 200),
          buyerType,
        });
      }
      continue;
    }

    // ── Pattern 2: "Name • Role" or "Name · Role" ──
    const bulletMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})\s*[•·]\s*(.+)$/);
    if (bulletMatch) {
      const name = cleanName(bulletMatch[1].trim());
      if (!isLikelyPersonNameExtended(name)) continue;
      const roleText = bulletMatch[2].trim();
      const { role, department, buyerType } = extractRoleFromAfterDash(roleText);

      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        results.push({
          name, role, department,
          confidence: role ? 'High' : 'Medium',
          evidence: trimmed.slice(0, 200),
          buyerType,
        });
      }
      continue;
    }

    // ── Pattern 3: "Name\nRole Title" (multi-line) ──
    // Already handled by the line-by-line approach in extractEmployeesFromLinkedInText
  }

  // ── Pattern 4: "Name1st · 1stName2nd · 2ndRole Description"
  // Like LinkedIn profile headers: "Andrea Marazzi, PhD1st · 1stSerial Founder..."
  // We already handle the primary name-role in Pattern 1 above.
  // For secondary indicators (the "1st · 1st" pattern), try:
  const linkedInHeaderPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})\s*(?:1st|2nd|3rd)?\s*·/g;
  let m;
  while ((m = linkedInHeaderPattern.exec(text)) !== null) {
    const name = cleanName(m[1].trim());
    if (!isLikelyPersonNameExtended(name) || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    // Look for role info in the surrounding context
    const contextStart = Math.max(0, m.index - 50);
    const contextEnd = Math.min(text.length, m.index + 300);
    const context = text.slice(contextStart, contextEnd);
    const { role, department, buyerType } = extractRoleFromContext(context, name);

    results.push({
      name, role, department,
      confidence: role ? 'Medium' : 'Low',
      evidence: context.slice(0, 200),
      buyerType,
    });
  }

  // ── Pattern 5: Line starts with a name and contains nearby role keyword ──
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 8) continue;

    const nameMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z'-]+){1,2})(?:\s|$)/);
    if (!nameMatch) continue;

    const name = cleanName(nameMatch[1].trim());
    if (!isLikelyPersonNameExtended(name) || seen.has(name.toLowerCase())) continue;
    if (!hasRoleKeywordNearbyExtended(trimmed)) continue;

    seen.add(name.toLowerCase());
    const { role, department, buyerType } = extractRoleFromContext(trimmed, name);
    results.push({
      name, role, department,
      confidence: role ? 'Medium' : 'Low',
      evidence: trimmed.slice(0, 200),
      buyerType,
    });
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────────────────

function cleanName(rawName: string): string {
  // Strip credentials/suffixes but keep the name
  return rawName
    .replace(/\s*,?\s*(?:Ph\.?D|M\.?D|M\.?B\.?A|M\.?S\.?c|CPA|Esq\.?|Jr\.?|Sr\.?|III|II|IV)\s*,?\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyPersonNameExtended(text: string): boolean {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 3) return false;

  // First word must be a known first name
  if (!EXTENDED_FIRST_NAMES.has(words[0].toLowerCase())) return false;

  // No digits, reasonable length
  if (/\d/.test(trimmed)) return false;
  if (trimmed.length > 40) return false;

  // Not all uppercase
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) return false;

  // Check last name plausibility
  const lastName = words[words.length - 1];
  if (lastName.length < 2) return false;
  if (lastName === lastName.toUpperCase() && lastName.length > 3) return false;

  return true;
}

function hasRoleKeywordNearbyExtended(text: string): boolean {
  return ROLE_TITLE_KEYWORDS.some(k => text.toLowerCase().includes(k));
}

function extractRoleFromAfterDash(text: string): { role: string | undefined; department: string | undefined; buyerType: NamedPerson['buyerType'] | undefined } {
  const trimmed = text.trim();

  // Try to find an explicit role title
  const rolePatterns = [
    // C-level titles
    /\b((?:Chief|Head|VP|Vice President|Director|Senior|Principal|Lead|Manager|Global|Regional)\s+(?:of\s+)?[A-Za-z\s]+(?:Officer|Director|Manager|Lead|Head|President|Executive|Architect|Engineer|Consultant|Specialist|Analyst|Coordinator|Administrator|Supervisor|Partner|Founder|Advisor|Representative)?)\b/i,
    // CxO patterns
    /\b(C(?:EO|TO|OO|FO|MO|IO|SO|RO|PO))\b/i,
    // Founder patterns
    /\b((?:Serial\s+)?Founder|Co[- ]?Founder)\b/i,
    // Standard role pattern
    /\b((?:Sales|Marketing|Product|Engineering|Support|Operations|Finance|HR|Customer\s+Success)\s+(?:Director|Manager|Lead|Head|VP|Executive))\b/i,
  ];

  for (const pattern of rolePatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const role = match[1];
      return {
        role,
        department: inferDepartment(role),
        buyerType: inferBuyerType(role),
      };
    }
  }

  // Try to extract meaningful role description from longer text
  if (trimmed.length > 20 && trimmed.length < 200) {
    const roleKeywords = ['founder', 'executive', 'advisor', 'leader', 'chief', 'director', 'head of', 'president', 'partner', 'consultant'];
    for (const kw of roleKeywords) {
      if (trimmed.toLowerCase().includes(kw)) {
        // Extract the phrase containing this keyword
        const idx = trimmed.toLowerCase().indexOf(kw);
        const start = Math.max(0, trimmed.lastIndexOf(' ', idx - 30) + 1);
        const end = Math.min(trimmed.length, trimmed.indexOf(' ', idx + kw.length + 60));
        const phrase = trimmed.slice(start, end > start ? end : undefined);
        return {
          role: phrase.length < 100 ? phrase : trimmed.slice(0, 100),
          department: inferDepartment(phrase),
          buyerType: inferBuyerType(phrase),
        };
      }
    }
    // If the after-dash text is a longer description, use it as-is
    if (trimmed.length > 30) {
      return {
        role: trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed,
        department: undefined,
        buyerType: undefined,
      };
    }
  }

  // Return the text as role if it's short enough
  if (trimmed.length < 50) {
    return {
      role: trimmed,
      department: inferDepartment(trimmed),
      buyerType: inferBuyerType(trimmed),
    };
  }

  return { role: undefined, department: undefined, buyerType: undefined };
}

function extractRoleFromContext(context: string, _name: string): { role: string | undefined; department: string | undefined; buyerType: NamedPerson['buyerType'] | undefined } {
  return extractRoleFromAfterDash(context);
}

// ─── Department & Buyer Type Inference ───────────────────────

function inferDepartment(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes('ceo') || lower.includes('founder') || lower.includes('president') || lower.includes('chief') || lower.includes('executive')) return 'Executive';
  if (lower.includes('commercial') || lower.includes('revenue') || lower.includes('growth')) return 'Commercial / Revenue';
  if (lower.includes('sales') || lower.includes('gtm') || lower.includes('go-to-market') || lower.includes('account executive') || lower.includes('bdr')) return 'Sales & Marketing';
  if (lower.includes('market') || lower.includes('brand') || lower.includes('content') || lower.includes('pr')) return 'Sales & Marketing';
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('cto') || lower.includes('technical') || lower.includes('product')) return 'Technology & Product';
  if (lower.includes('support') || lower.includes('customer success') || lower.includes('service')) return 'Customer Support';
  if (lower.includes('operation') || lower.includes('ops') || lower.includes('logistics') || lower.includes('coo')) return 'Operations';
  if (lower.includes('finance') || lower.includes('accounting') || lower.includes('cfo') || lower.includes('admin')) return 'Finance & Administration';
  if (lower.includes('hr') || lower.includes('talent') || lower.includes('recruit') || lower.includes('people')) return 'HR & Talent';
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('risk') || lower.includes('audit')) return 'Security & Compliance';
  if (lower.includes('legal') || lower.includes('counsel') || lower.includes('attorney')) return 'Legal & Compliance';
  if (lower.includes('ai') || lower.includes('artificial intelligence') || lower.includes('machine learning')) return 'AI / Technology';
  return 'Unknown';
}

function inferBuyerType(role: string): NamedPerson['buyerType'] | undefined {
  const lower = role.toLowerCase();
  if (lower.includes('ceo') || lower.includes('founder') || lower.includes('president') || lower.includes('chief') || lower.includes('owner')) return 'economic_buyer';
  if (lower.includes('cto') || lower.includes('technical') || lower.includes('engineer') || lower.includes('architect')) return 'technical_buyer';
  if (lower.includes('director') || lower.includes('vp') || lower.includes('head of') || lower.includes('manager')) return 'influencer';
  if (lower.includes('champion') || lower.includes('lead')) return 'champion';
  if (lower.includes('operations') || lower.includes('support') || lower.includes('customer success')) return 'operator';
  return undefined;
}

// ─── Company-Level Field Extraction ──────────────────────────

export interface ExtractedCompanyFields {
  website?: string;
  industry?: string;
  companySize?: string;
  associatedMemberCount?: number;
  headquarters?: string;
  overview?: string;
  productCategories?: string[];
  targetAudiences?: string[];
  milestoneClaims?: string[];
}

export function extractCompanyFields(text: string): ExtractedCompanyFields {
  const fields: ExtractedCompanyFields = {};

  // Website extraction
  const websiteMatch = text.match(/\b(https?:\/\/)?(www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-z]{2,}(?:\/[^\s]*)?)\b/i);
  if (websiteMatch) {
    const domain = websiteMatch[3];
    fields.website = websiteMatch[1] ? websiteMatch[0] : `https://${domain}`;
  }

  // Headquarters/location
  const hqMatches = [
    /headquarters?\s*(?:in|at)?\s*([A-Z][a-zA-Z\s,]+)(?:\.|,|\n)/i,
    /based in\s*([A-Z][a-zA-Z\s,]+)(?:\.|,|\n)/i,
    /location\s*([A-Z][a-zA-Z\s,]+)(?:\.|,|\n)/i,
  ];
  for (const pattern of hqMatches) {
    const m = text.match(pattern);
    if (m) { fields.headquarters = m[1].trim(); break; }
  }

  // Company size
  const sizeMatch = text.match(/(\d+[-–]\d+|\d+[+,])\s*(?:employees|staff|team\s+members|people)/i);
  if (sizeMatch) fields.companySize = sizeMatch[0].trim();

  // Associated member count
  const memberMatch = text.match(/(\d+(?:,\d+)*)\s*(?:associated\s+)?members/i);
  if (memberMatch) fields.associatedMemberCount = parseInt(memberMatch[1].replace(/,/g, ''));

  // Industry (from known patterns)
  const industryPatterns: { regex: RegExp; industry: string }[] = [
    { regex: /\b(?:saas|software as a service)\b/i, industry: 'SaaS / Technology' },
    { regex: /\b(?:fintech|financial technology)\b/i, industry: 'Fintech' },
    { regex: /\b(?:healthtech|health tech|digital health)\b/i, industry: 'Healthcare Technology' },
    { regex: /\b(?:edtech|education technology)\b/i, industry: 'Education Technology' },
    { regex: /\b(?:ecommerce|e-commerce|online retail)\b/i, industry: 'E-commerce' },
    { regex: /\b(?:artificial intelligence|ai platform|machine learning)\b/i, industry: 'AI / Machine Learning' },
    { regex: /\b(?:cybersecurity|security platform)\b/i, industry: 'Cybersecurity' },
  ];
  for (const { regex, industry } of industryPatterns) {
    if (regex.test(text)) { fields.industry = industry; break; }
  }

  // Overview — find the "About" section
  const aboutMatch = text.match(/(?:About|Overview)[:\s]*\n?([\s\S]{50,500}?)(?:\n\n|\n[A-Z][a-z]+ [A-Z]|\n(?:Website|Industry|Company size|Headquarters|Specialties))/i);
  if (aboutMatch) {
    fields.overview = aboutMatch[1].trim().slice(0, 500);
  }

  // Product categories
  const productSection = text.match(/(?:Products?|Platform|Solutions?)[:\s]*\n?([\s\S]{50,300}?)(?:\n\n|\n[A-Z][a-z]+ [A-Z]|\n(?:Website|Industry))/i);
  if (productSection) {
    const products = productSection[1]
      .split(/[,;•·\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 3 && s.length < 100);
    if (products.length > 0) fields.productCategories = products.slice(0, 10);
  }

  // Target audiences
  const audienceMatch = text.match(/(?:Serves?|Customers?|Clients?|Target(?:ing)?|For)[:\s]*\n?([\s\S]{50,300}?)(?:\n\n|\n[A-Z][a-z]+ [A-Z])/i);
  if (audienceMatch) {
    const audiences = audienceMatch[1]
      .split(/[,;•·\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 3 && s.length < 100);
    if (audiences.length > 0) fields.targetAudiences = audiences.slice(0, 5);
  }

  // Milestone claims
  const milestonePatterns = [
    /(?:raised|secured)\s+\$?(\d+[KMB]?)\s*(?:in\s+)?(?:seed|series\s+[a-c]|funding|investment)/gi,
    /(\d+[KMB]?)\+?\s*(?:customers|users|clients|companies)/gi,
    /(?:founded|established)\s+(?:in\s+)?(\d{4})/gi,
    /(?:named|recognized|awarded)\s+(?:as\s+)?([^.\n]{10,100})/gi,
  ];
  for (const pattern of milestonePatterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      if (!fields.milestoneClaims) fields.milestoneClaims = [];
      fields.milestoneClaims.push(m[0].trim());
    }
  }

  return fields;
}