// ============================================================
// Public Source Discovery Engine — v0.5
// Generates suggested public people/company source URLs from
// company name and website. No scraping, no logins, no auth bypass.
// ============================================================

import type { PeopleSourceQueueItem, PeopleSignalSourceType, PeopleSignals, ReconFindings, Company } from '../types';
import { analyzePeopleText } from './peopleSignalEngine';

// ─── ID Generator ─────────────────────────────────────────────

let idCounter = 0;
function uid(prefix = 'pq'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

// ─── Infer LinkedIn Slug from company name ─────────────────────

function inferLinkedInSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ─── Build Google Search URL ──────────────────────────────────

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

// ─── Main Source Discovery ────────────────────────────────────

export function discoverPeopleSources(
  companyName: string,
  website: string
): PeopleSourceQueueItem[] {
  const sources: PeopleSourceQueueItem[] = [];
  const slug = inferLinkedInSlug(companyName);
  const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  // ── 1. Company website pages ────────────────────────────
  const baseUrl = website.replace(/\/$/, '');

  const websitePages: { path: string; label: string; type: PeopleSignalSourceType; reason: string }[] = [
    { path: '', label: 'Homepage', type: 'manual_role_notes', reason: 'Company homepage — primary public source' },
    { path: '/about', label: 'About Page', type: 'company_team_page', reason: 'About page often lists leadership and team' },
    { path: '/about-us', label: 'About Us Page', type: 'company_team_page', reason: 'About Us page often lists leadership' },
    { path: '/team', label: 'Team Page', type: 'company_team_page', reason: 'Team page with people information' },
    { path: '/leadership', label: 'Leadership Page', type: 'leadership_page', reason: 'Leadership page with executive team' },
    { path: '/management', label: 'Management Page', type: 'leadership_page', reason: 'Management team listing' },
    { path: '/careers', label: 'Careers Page', type: 'careers_page', reason: 'Careers page with open roles and team info' },
    { path: '/jobs', label: 'Jobs Page', type: 'careers_page', reason: 'Job openings and hiring signals' },
    { path: '/news', label: 'News Page', type: 'press_release', reason: 'Company news and press mentions' },
    { path: '/press', label: 'Press Page', type: 'press_release', reason: 'Press releases and media coverage' },
    { path: '/blog', label: 'Blog Page', type: 'manual_role_notes', reason: 'Company blog with team and culture signals' },
    { path: '/contact', label: 'Contact Page', type: 'manual_role_notes', reason: 'Contact page with team references' },
  ];

  for (const page of websitePages) {
    const url = page.path ? `${baseUrl}${page.path}` : baseUrl;
    sources.push({
      id: uid(),
      sourceType: page.type,
      sourceUrl: url,
      reasonSuggested: page.reason,
      status: 'suggested',
      confidence: 'Medium',
    });
  }

  // ── 2. LinkedIn search / company URLs ───────────────────
  const linkedInSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
  sources.push({
    id: uid(),
    sourceType: 'linkedin_company_about',
    sourceUrl: linkedInSearchUrl,
    reasonSuggested: 'LinkedIn company search — open in new tab, review public about page, paste relevant text',
    status: 'suggested',
    confidence: 'Medium',
  });

  // Try a direct LinkedIn company URL
  const directLinkedInUrl = `https://www.linkedin.com/company/${slug}`;
  sources.push({
    id: uid(),
    sourceType: 'linkedin_company_about',
    sourceUrl: directLinkedInUrl,
    reasonSuggested: 'Direct LinkedIn company page (inferred slug) — verify and open in new tab',
    status: 'suggested',
    confidence: 'Low',
  });

  // ── 3. Google search links ──────────────────────────────
  const searchQueries: { query: string; type: PeopleSignalSourceType; reason: string }[] = [
    { query: `${companyName} LinkedIn`, type: 'linkedin_company_about', reason: 'Search for company LinkedIn profile' },
    { query: `${companyName} leadership team`, type: 'leadership_page', reason: 'Search for leadership information' },
    { query: `${companyName} team`, type: 'company_team_page', reason: 'Search for team information' },
    { query: `${companyName} careers`, type: 'careers_page', reason: 'Search for careers and hiring' },
    { query: `${companyName} press release`, type: 'press_release', reason: 'Search for recent press releases' },
    { query: `${companyName} funding`, type: 'press_release', reason: 'Search for funding news and milestones' },
    { query: `${companyName} hiring`, type: 'careers_page', reason: 'Search for hiring signals' },
  ];

  for (const sq of searchQueries) {
    sources.push({
      id: uid(),
      sourceType: sq.type,
      sourceUrl: googleSearchUrl(sq.query),
      reasonSuggested: sq.reason,
      status: 'suggested',
      confidence: 'Medium',
    });
  }

  // ── 4. If domain exists, add WHOIS / Crunchbase search hints
  if (domain) {
    sources.push({
      id: uid(),
      sourceType: 'manual_role_notes',
      sourceUrl: googleSearchUrl(`${companyName} crunchbase`),
      reasonSuggested: 'Search for company Crunchbase profile (public company data)',
      status: 'suggested',
      confidence: 'Low',
    });
    sources.push({
      id: uid(),
      sourceType: 'manual_role_notes',
      sourceUrl: googleSearchUrl(`${companyName} site:${domain}`),
      reasonSuggested: `Search all public pages on ${domain}`,
      status: 'suggested',
      confidence: 'Low',
    });
  }

  return sources;
}

// ─── Generate preliminary people signals from existing recon data ──

export function generatePreliminaryPeopleSignals(
  company: Company,
  reconFindings?: ReconFindings
): PeopleSignals | null {
  // Collect all available text from company profile + recon
  const textParts: string[] = [];

  // Company profile fields
  if (company.basic.name) textParts.push(`Company: ${company.basic.name}`);
  if (company.basic.industry) textParts.push(`Industry: ${company.basic.industry}`);
  if (company.basic.location) textParts.push(`Location: ${company.basic.location}`);
  if (company.basic.notes) textParts.push(`Notes: ${company.basic.notes}`);
  if (company.basic.employeeCount > 0) textParts.push(`Employees: ${company.basic.employeeCount}`);

  if (company.business.productsServices) textParts.push(`Products/Services: ${company.business.productsServices}`);
  if (company.business.targetCustomers) textParts.push(`Target customers: ${company.business.targetCustomers}`);
  if (company.business.operationsModel) textParts.push(`Operations: ${company.business.operationsModel}`);

  // People notes
  if (company.people.leadership) textParts.push(`Leadership: ${company.people.leadership}`);
  if (company.people.salesTeam) textParts.push(`Sales: ${company.people.salesTeam}`);
  if (company.people.technicalTeam) textParts.push(`Technical: ${company.people.technicalTeam}`);

  // Recon data
  if (reconFindings) {
    if (reconFindings.publicPeopleNotes) textParts.push(reconFindings.publicPeopleNotes);
    if (reconFindings.publicLeadershipText) textParts.push(reconFindings.publicLeadershipText);

    for (const wf of reconFindings.inferredWorkflows || []) {
      textParts.push(`Workflow: ${wf.workflowName} (${wf.department})`);
      textParts.push(`Bottleneck: ${wf.possibleBottleneck}`);
      textParts.push(`Automation: ${wf.automationOpportunity}`);
    }

    for (const tool of reconFindings.detectedTools || []) {
      textParts.push(`Tool: ${tool.toolName} (${tool.category}) in ${tool.likelyDepartment}`);
    }

    for (const opening of reconFindings.openings || []) {
      textParts.push(`Opening: ${opening.title} — ${opening.whatThisSuggests}`);
      textParts.push(`Approach: ${opening.whoToApproach}`);
    }

    for (const url of reconFindings.discoveredUrls || []) {
      if (url.fetchedText) {
        textParts.push(url.fetchedText.slice(0, 3000));
      }
    }
  }

  const combinedText = textParts.filter(Boolean).join('\n\n').trim();

  if (!combinedText || combinedText.length < 50) {
    return null; // Not enough data to generate signals
  }

  // Use the existing people signal engine to analyze the combined text
  return analyzePeopleText(
    combinedText,
    'manual_role_notes',
    company.basic.website || 'Recon-based analysis'
  );
}
