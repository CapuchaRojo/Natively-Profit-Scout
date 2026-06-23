// ============================================================
// Public Source Discovery Engine — v0.5
// Generates suggested public people/company source URLs from
// company name and website. No scraping, no logins, no auth bypass.
// ============================================================

import type { PeopleSourceQueueItem, PeopleSignalSourceType, PeopleSignals, ReconFindings, Company, DiscoveredEmployee, LinkedInPostSignal } from '../types';
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


export function discoverLinkedInEmployees(
  companyName: string,
  website: string
): DiscoveredEmployee[] {
  const employees: DiscoveredEmployee[] = [];
  const slug = inferLinkedInSlug(companyName);

  // LinkedIn people search — find employees
  const peopleSearchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${companyName}`)}&origin=GLOBAL_SEARCH_HEADER`;
  employees.push({
    id: uid('emp'),
    name: `Employees of ${companyName}`,
    role: 'All employees (LinkedIn people search)',
    profileSearchUrl: peopleSearchUrl,
    department: 'Multiple',
    source: 'linkedin_employee_profile',
    status: 'suggested',
    confidence: 'Medium',
  });

  // Try to find specific roles via LinkedIn search
  const roleSearches: { role: string; department: string }[] = [
    { role: 'CEO', department: 'Executive' },
    { role: 'CTO', department: 'Technology & Product' },
    { role: 'Sales', department: 'Sales & Marketing' },
    { role: 'Marketing', department: 'Sales & Marketing' },
    { role: 'Operations', department: 'Operations' },
    { role: 'Support', department: 'Customer Support' },
    { role: 'Engineering', department: 'Technology & Product' },
    { role: 'Product', department: 'Technology & Product' },
    { role: 'HR', department: 'HR & Talent' },
    { role: 'Finance', department: 'Finance & Administration' },
  ];

  for (const rs of roleSearches) {
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${companyName} ${rs.role}`)}&origin=GLOBAL_SEARCH_HEADER`;
    employees.push({
      id: uid('emp'),
      name: `${rs.role} at ${companyName}`,
      role: rs.role,
      profileSearchUrl: searchUrl,
      department: rs.department,
      source: 'linkedin_employee_profile',
      status: 'suggested',
      confidence: 'Low',
    });
  }

  // Direct LinkedIn company page
  const directLinkedInUrl = `https://www.linkedin.com/company/${slug}`;
  employees.push({
    id: uid('emp'),
    name: `LinkedIn Company Page: ${companyName}`,
    role: 'Company page (inferred slug)',
    linkedInUrl: directLinkedInUrl,
    profileSearchUrl: directLinkedInUrl,
    department: 'Multiple',
    source: 'linkedin_company_page',
    status: 'suggested',
    confidence: 'Medium',
  });

  return employees;
}

// ─── Generate LinkedIn Post Feed URLs ────────────────────────────

export function discoverLinkedInPosts(
  companyName: string
): PeopleSourceQueueItem[] {
  const posts: PeopleSourceQueueItem[] = [];
  const slug = inferLinkedInSlug(companyName);

  // Direct company LinkedIn posts feed
  const companyPostsUrl = `https://www.linkedin.com/company/${slug}/posts/`;
  posts.push({
    id: uid('lpp'),
    sourceType: 'linkedin_company_posts_feed',
    sourceUrl: companyPostsUrl,
    reasonSuggested: 'Company LinkedIn posts feed — open in new tab, review recent posts, paste relevant post text',
    status: 'suggested',
    confidence: 'Low',
  });

  // LinkedIn search for posts mentioning the company
  const postSearchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(companyName)}&origin=GLOBAL_SEARCH_HEADER&sid=m%2Cg`;
  posts.push({
    id: uid('lpp'),
    sourceType: 'linkedin_company_post',
    sourceUrl: postSearchUrl,
    reasonSuggested: 'LinkedIn content search — posts mentioning the company',
    status: 'suggested',
    confidence: 'Medium',
  });

  // LinkedIn job posts
  const jobsUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(companyName)}`;
  posts.push({
    id: uid('lpp'),
    sourceType: 'linkedin_job_post',
    sourceUrl: jobsUrl,
    reasonSuggested: 'LinkedIn job search — open roles at the company',
    status: 'suggested',
    confidence: 'Medium',
  });

  return posts;
}

// ─── Analyze pasted LinkedIn post text ───────────────────────────

export function analyzeLinkedInPostText(
  text: string,
  companyName: string
): LinkedInPostSignal {
  const lower = text.toLowerCase();
  const themes: string[] = [];
  const hiringRelevance: string[] = [];
  const painHints: string[] = [];
  const oppHints: string[] = [];

  // Detect themes
  if (lower.includes('launch') || lower.includes('new product') || lower.includes('introducing')) {
    themes.push('Product/feature launch');
  }
  if (lower.includes('partner') || lower.includes('alliance') || lower.includes('collaboration')) {
    themes.push('Partnership/collaboration');
  }
  if (lower.includes('hiring') || lower.includes('join our team') || lower.includes('we are looking')) {
    themes.push('Hiring/recruiting');
    hiringRelevance.push('Active hiring — likely growing team');
  }
  if (lower.includes('customer') || lower.includes('client') || lower.includes('case study')) {
    themes.push('Customer success/testimonial');
  }
  if (lower.includes('award') || lower.includes('recognized') || lower.includes('ranked')) {
    themes.push('Award/recognition');
  }
  if (lower.includes('funding') || lower.includes('investment') || lower.includes('raised')) {
    themes.push('Funding/investment');
  }
  if (lower.includes('growing') || lower.includes('expansion') || lower.includes('new office')) {
    themes.push('Growth/expansion');
    hiringRelevance.push('Expanding operations — potential workflow pain');
  }
  if (lower.includes('automation') || lower.includes('workflow') || lower.includes('efficiency')) {
    themes.push('Automation/efficiency focus');
    oppHints.push('Already thinking about automation — warm opportunity');
  }
  if (lower.includes('pain') || lower.includes('challenge') || lower.includes('difficult') || lower.includes('struggle')) {
    themes.push('Pain/challenge acknowledgment');
    painHints.push('Openly acknowledges challenges — good discovery entry point');
  }
  if (lower.includes('excited') || lower.includes('announce') || lower.includes('celebrate')) {
    themes.push('Milestone/celebration');
  }
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('risk')) {
    themes.push('Security/compliance focus');
    oppHints.push('Security/compliance concerns — potential pain point');
  }
  if (lower.includes('ai') || lower.includes('artificial intelligence') || lower.includes('machine learning')) {
    themes.push('AI/adoption');
    oppHints.push('Exploring AI — receptive to automation solutions');
  }

  // Auto-detect post type
  let postType: LinkedInPostSignal['postType'] = 'unknown';
  if (lower.includes('hiring') || lower.includes('job') || lower.includes('career') || lower.includes('open position')) {
    postType = 'job_posting';
  } else if (lower.includes('we are') || lower.includes('our company') || lower.includes('we just')) {
    postType = 'company_post';
  } else if (lower.includes('proud') || lower.includes('excited to share') || lower.includes('my team')) {
    postType = 'employee_post';
  }

  // Detect author role cues
  let authorRole: string | undefined;
  const rolePatterns = [
    { keywords: ['founder', 'ceo', 'chief'], role: 'Founder/CEO' },
    { keywords: ['sales', 'revenue', 'account executive'], role: 'Sales' },
    { keywords: ['engineer', 'developer', 'cto', 'technical'], role: 'Technical' },
    { keywords: ['marketing', 'content', 'brand'], role: 'Marketing' },
    { keywords: ['support', 'customer success'], role: 'Customer Success' },
    { keywords: ['product', 'product manager'], role: 'Product' },
  ];
  for (const rp of rolePatterns) {
    if (rp.keywords.some(k => lower.includes(k))) {
      authorRole = rp.role;
      break;
    }
  }

  // Detect author name (simple heuristic)
  let authorName: string | undefined;
  const nameMatch = text.match(/^(\w+\s+\w+)\s*[|\-–—]/m);
  if (nameMatch) {
    authorName = nameMatch[1].trim();
  }

  if (themes.length === 0) {
    themes.push('General company update');
  }

  return {
    id: uid('lps'),
    authorName,
    authorRole,
    postType,
    keyThemes: themes,
    hiringRelevance,
    painPointHints: painHints,
    opportunityHints: oppHints,
    confidence: 'Medium',
    pastedText: text.slice(0, 3000),
  };
}

// ─── Extract employee names from pasted LinkedIn company text ────

export function extractEmployeesFromLinkedInText(
  text: string,
  companyName: string
): DiscoveredEmployee[] {
  const employees: DiscoveredEmployee[] = [];
  const lines = text.split('\n');
  const seen = new Set<string>();

  // Look for patterns like "Name — Role" or "Name | Role" or "Name, Role"
  const nameRolePattern = /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[|\-–—,]+\s*([A-Za-z][A-Za-z\s\/]+)/g;
  let match;
  while ((match = nameRolePattern.exec(text)) !== null) {
    const name = match[1].trim();
    const role = match[2].trim();
    if (!seen.has(name) && name.length > 3) {
      seen.add(name);
      employees.push({
        id: uid('emp'),
        name,
        role,
        department: inferDepartmentFromRole(role),
        source: 'linkedin_employee_profile',
        status: 'suggested',
        confidence: 'Medium',
      });
    }
  }

  // Look for bullet-pointed names (common on LinkedIn)
  const bulletPattern = /[•\-]\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/g;
  while ((match = bulletPattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (!seen.has(name) && name.length > 3) {
      seen.add(name);
      employees.push({
        id: uid('emp'),
        name,
        source: 'linkedin_employee_profile',
        status: 'suggested',
        confidence: 'Low',
      });
    }
  }

  return employees;
}

// ─── Infer department from role title ────────────────────────────

function inferDepartmentFromRole(role: string): string {
  const lower = role.toLowerCase();
  if (lower.includes('ceo') || lower.includes('founder') || lower.includes('president') || lower.includes('chief')) return 'Executive';
  if (lower.includes('sales') || lower.includes('revenue') || lower.includes('account') || lower.includes('bdr') || lower.includes('gtm')) return 'Sales & Marketing';
  if (lower.includes('market') || lower.includes('brand') || lower.includes('content') || lower.includes('pr') || lower.includes('social')) return 'Sales & Marketing';
  if (lower.includes('engineer') || lower.includes('developer') || lower.includes('cto') || lower.includes('technical') || lower.includes('product')) return 'Technology & Product';
  if (lower.includes('support') || lower.includes('customer success') || lower.includes('service') || lower.includes('help')) return 'Customer Support';
  if (lower.includes('operation') || lower.includes('ops') || lower.includes('logistics')) return 'Operations';
  if (lower.includes('finance') || lower.includes('accounting') || lower.includes('cfo') || lower.includes('admin')) return 'Finance & Administration';
  if (lower.includes('hr') || lower.includes('talent') || lower.includes('recruit') || lower.includes('people')) return 'HR & Talent';
  if (lower.includes('security') || lower.includes('compliance') || lower.includes('risk') || lower.includes('audit')) return 'Security & Compliance';
  if (lower.includes('legal') || lower.includes('counsel') || lower.includes('attorney')) return 'Legal & Compliance';
  return 'Unknown';
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
