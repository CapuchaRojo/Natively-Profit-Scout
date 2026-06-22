// ============================================================
// Recon Scanner Service
// Public web intelligence collector for auto-fill
// ============================================================
import type {
  ReconDiscoveredUrl, DetectedTool, InferredWorkflow,
  ReconAutoFillSuggestion, ReconOpening, ReconFindings, Company, ConfidenceLevel
} from '../types';
import { fingerprintPage, inferToolsFromText } from './toolFingerprintEngine';
import { inferWorkflowsFromText } from './workflowInferenceEngine';
import { scanUrlViaBackend } from './reconApiClient';

// ─── Constants ──────────────────────────────────────────────────

const COMMON_PATHS: { path: string; pageType: string }[] = [
  { path: '/about', pageType: 'About Page' },
  { path: '/about-us', pageType: 'About Page' },
  { path: '/services', pageType: 'Services Page' },
  { path: '/products', pageType: 'Products Page' },
  { path: '/pricing', pageType: 'Pricing Page' },
  { path: '/solutions', pageType: 'Solutions Page' },
  { path: '/industries', pageType: 'Industries Page' },
  { path: '/customers', pageType: 'Customers Page' },
  { path: '/case-studies', pageType: 'Case Studies Page' },
  { path: '/blog', pageType: 'Blog Page' },
  { path: '/news', pageType: 'News Page' },
  { path: '/careers', pageType: 'Careers Page' },
  { path: '/jobs', pageType: 'Careers Page' },
  { path: '/contact', pageType: 'Contact Page' },
  { path: '/support', pageType: 'Support Page' },
  { path: '/help', pageType: 'Support Page' },
  { path: '/faq', pageType: 'FAQ Page' },
  { path: '/faqs', pageType: 'FAQ Page' },
  { path: '/login', pageType: 'Login Page' },
  { path: '/signup', pageType: 'Signup Page' },
  { path: '/demo', pageType: 'Demo Page' },
  { path: '/book-demo', pageType: 'Demo Page' },
  { path: '/request-demo', pageType: 'Demo Page' },
  { path: '/security', pageType: 'Security Page' },
  { path: '/privacy', pageType: 'Privacy Page' },
  { path: '/terms', pageType: 'Terms Page' },
  { path: '/sitemap.xml', pageType: 'Sitemap' },
  { path: '/robots.txt', pageType: 'Robots.txt' },
  { path: '/.well-known/security.txt', pageType: 'Security.txt' },
];

// ─── Utility Functions ──────────────────────────────────────────

let idCounter = 0;
function uid(prefix = 'recon'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');
  return normalized.toLowerCase();
}

export function extractBaseDomain(url: string): string {
  try {
    const u = new URL(normalizeUrl(url));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function cleanHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' [NAV] ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' [FOOTER] ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' [HEADER] ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25000);
}

export function extractLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  try {
    const base = new URL(normalizeUrl(baseUrl));

    while ((match = anchorRegex.exec(html)) !== null) {
      try {
        const href = match[1].trim();
        const text = match[2].replace(/<[^>]+>/g, '').trim();

        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        // Resolve relative URLs
        const resolved = new URL(href, base.origin).href;

        // Only include same-domain links
        if (resolved.includes(base.hostname)) {
          links.push({ url: resolved, text });
        }
      } catch {
        // Skip malformed URLs
      }
    }
  } catch {
    // Invalid base URL
  }

  return links;
}

export function classifyUrl(url: string, linkText?: string): string {
  const path = url.toLowerCase();
  const text = (linkText || '').toLowerCase();

  if (path.includes('/about')) return 'About Page';
  if (path.includes('/services')) return 'Services Page';
  if (path.includes('/products') || path.includes('/product')) return 'Products Page';
  if (path.includes('/pricing') || path.includes('/price')) return 'Pricing Page';
  if (path.includes('/solutions') || path.includes('/solution')) return 'Solutions Page';
  if (path.includes('/industries') || path.includes('/industry')) return 'Industries Page';
  if (path.includes('/customer') || path.includes('/client') || path.includes('/portfolio')) return 'Customers Page';
  if (path.includes('/case-stud') || path.includes('/casestudy')) return 'Case Studies Page';
  if (path.includes('/blog') || path.includes('/articles') || path.includes('/posts')) return 'Blog Page';
  if (path.includes('/news') || path.includes('/press') || path.includes('/media')) return 'News Page';
  if (path.includes('/careers') || path.includes('/jobs') || path.includes('/join')) return 'Careers Page';
  if (path.includes('/contact') || path.includes('/reach')) return 'Contact Page';
  if (path.includes('/support') || path.includes('/help') || path.includes('/faq')) return 'Support Page';
  if (path.includes('/demo') || path.includes('/book')) return 'Demo Page';
  if (path.includes('/login') || path.includes('/signin') || path.includes('/signup') || path.includes('/register')) return 'Login/Signup Page';
  if (path.includes('/security') || path.includes('/trust')) return 'Security Page';
  if (path.includes('/privacy') || path.includes('/gdpr')) return 'Privacy Page';
  if (path.includes('/term') || path.includes('/legal')) return 'Terms Page';
  if (path.includes('/sitemap')) return 'Sitemap';
  if (path.includes('/robots.txt')) return 'Robots.txt';
  if (path.includes('/.well-known')) return 'Well-Known Page';

  // Guess from link text
  if (text.includes('about') && text.length < 30) return 'About Page';
  if (text.includes('service') && text.length < 30) return 'Services Page';
  if (text.includes('product') && text.length < 30) return 'Products Page';
  if (text.includes('pricing') || text.includes('price') || text.includes('plan')) return 'Pricing Page';
  if (text.includes('contact') || text.includes('get in touch') || text.includes('reach us')) return 'Contact Page';
  if (text.includes('blog') || text.includes('article') || text.includes('post')) return 'Blog Page';
  if (text.includes('career') || text.includes('job') || text.includes('join')) return 'Careers Page';
  if (text.includes('demo') || text.includes('see it')) return 'Demo Page';
  if (text.includes('support') || text.includes('help') || text.includes('faq')) return 'Support Page';
  if (text.includes('login') || text.includes('sign in') || text.includes('sign up')) return 'Login/Signup Page';

  return 'Other Page';
}

// ─── Public URL Discovery ──────────────────────────────────────

export function discoverPublicUrls(
  homepageUrl: string,
  homepageHtml?: string
): ReconDiscoveredUrl[] {
  const discovered: ReconDiscoveredUrl[] = [];
  const addedUrls = new Set<string>();
  const base = normalizeUrl(homepageUrl);
  const baseOrigin = (() => { try { return new URL(base).origin; } catch { return base; } })();

  // Always add homepage
  if (!addedUrls.has(base)) {
    discovered.push({
      urlId: uid('url'),
      url: base,
      pageType: 'Homepage',
      discoveryMethod: 'user-added',
      status: 'unscanned',
      confidence: 'High',
      notes: 'Primary homepage',
    });
    addedUrls.add(base);
  }

  // Add common paths
  for (const { path, pageType } of COMMON_PATHS) {
    const fullUrl = `${baseOrigin}${path}`;
    if (addedUrls.has(fullUrl)) continue;
    addedUrls.add(fullUrl);
    discovered.push({
      urlId: uid('url'),
      url: fullUrl,
      pageType,
      discoveryMethod: 'common-path',
      status: 'unscanned',
      confidence: 'Medium',
      notes: 'Discovered via common URL path pattern',
    });
  }

  // Parse homepage links if HTML available
  if (homepageHtml) {
    const links = extractLinks(homepageHtml, base);
    for (const link of links) {
      const url = link.url.replace(/\/+$/, '');
      if (addedUrls.has(url)) continue;
      if (url === base) continue;

      // Only add same-origin links
      try {
        const linkOrigin = new URL(url).origin;
        if (linkOrigin !== baseOrigin) continue;
      } catch {
        continue;
      }

      addedUrls.add(url);
      const pageType = classifyUrl(url, link.text);
      discovered.push({
        urlId: uid('url'),
        url,
        pageType,
        discoveryMethod: 'homepage-link',
        status: 'unscanned',
        confidence: 'Medium',
        notes: `Discovered from homepage link: "${link.text || 'no text'}"`,
      });
    }
  }

  return discovered;
}

// ─── Public Fetching Layer ──────────────────────────────────────

export async function fetchPublicUrl(url: string): Promise<{
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
  blocked?: boolean;
}> {
  try {
    // Check for robots.txt compliance (respect existing)
    if (url.includes('robots.txt')) {
      // Allow fetching robots.txt itself
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProfitScout/1.0; +https://natively.ai)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        blocked: response.status === 403 || response.status === 429,
      };
    }

    const html = await response.text();
    const text = cleanHtmlToText(html);

    return { success: true, html, text };
  } catch (err: unknown) {
    const error = err as Error;
    const isCors = error.message?.includes('Failed to fetch') ||
                   error.message?.includes('NetworkError') ||
                   error.name === 'TypeError' ||
                   error.message?.includes('CORS');

    if (isCors) {
      return {
        success: false,
        error: 'Fetch blocked by browser/CORS. Paste the page text or add a backend proxy later.',
        blocked: true,
      };
    }

    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out after 10 seconds.', blocked: false };
    }

    return { success: false, error: error.message || 'Unknown error', blocked: false };
  }
}

export async function fetchWithCorsFallback(url: string): Promise<{
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
  blocked?: boolean;
}> {
  // Try direct fetch first
  const result = await fetchPublicUrl(url);

  // If blocked by CORS and backend is configured, try backend
  if (result.blocked) {
    const backendResult = await scanUrlViaBackend(url);
    if (backendResult.success) {
      return { success: true, html: backendResult.data as string, text: cleanHtmlToText(backendResult.data as string) };
    }
    // Fall through — return the CORS error with instructions
  }

  return result;
}

// ─── Company Surface Scanner ────────────────────────────────────

export async function scanCompanyPublicSurface(
  company: Company,
  settings: {
    maxPagesPerScan: number;
    maxCharsPerPage: number;
    enableUrlDiscovery: boolean;
    enableToolFingerprinting: boolean;
    enableWorkflowInference: boolean;
  }
): Promise<{
  findings: ReconFindings;
  fetchedPages: { url: string; html: string; text: string }[];
}> {
  const homepageUrl = company.basic.website;
  const discoveredUrls = discoverPublicUrls(homepageUrl);

  // Limit pages to scan
  const toScan = discoveredUrls.filter(u => u.status === 'unscanned').slice(0, settings.maxPagesPerScan);

  const fetchedPages: { url: string; html: string; text: string }[] = [];
  const allTexts: { text: string; url: string }[] = [];
  const allDetectedTools: DetectedTool[] = [];
  const allWorkflows: InferredWorkflow[] = [];

  // Scan each URL
  for (const urlInfo of toScan) {
    const result = await fetchPublicUrl(urlInfo.url);

    if (result.success && result.html) {
      urlInfo.status = 'scanned';
      urlInfo.fetchedText = (result.text || '').slice(0, settings.maxCharsPerPage);
      urlInfo.fetchSourceType = 'browser-fetch';

      fetchedPages.push({ url: urlInfo.url, html: result.html, text: result.text || '' });
      allTexts.push({ text: result.text || '', url: urlInfo.url });

      // Tool fingerprinting
      if (settings.enableToolFingerprinting && result.html) {
        const fpResult = fingerprintPage(result.html, urlInfo.url);
        allDetectedTools.push(...fpResult.detected);

        // Also infer from text
        const textInferred = inferToolsFromText(result.text || '', urlInfo.url);
        allDetectedTools.push(...textInferred);
      }
    } else if (result.blocked) {
      urlInfo.status = 'blocked';
      urlInfo.notes = result.error || 'Blocked by CORS';
    } else {
      urlInfo.status = 'failed';
      urlInfo.notes = result.error || 'Fetch failed';
    }
  }

  // Workflow inference from all texts
  if (settings.enableWorkflowInference) {
    const workflows = [];
    for (const page of allTexts) {
      const wf = inferWorkflowsFromText(page.text, page.url, allDetectedTools);
      workflows.push(...wf);
    }
    // Deduplicate
    const wfMap = new Map<string, InferredWorkflow>();
    for (const w of workflows) {
      const existing = wfMap.get(w.workflowName);
      if (!existing || w.confidence === 'High') {
        wfMap.set(w.workflowName, w);
      }
    }
    allWorkflows.push(...Array.from(wfMap.values()));
  }

  // Generate auto-fill suggestions
  const autoFillSuggestions = generateAutoFillSuggestions(company, allDetectedTools, allWorkflows, allTexts);

  // Generate openings
  const openings = generateReconOpenings(allDetectedTools, allWorkflows, company, allTexts);

  const findings: ReconFindings = {
    companyId: company.id,
    discoveredUrls,
    detectedTools: allDetectedTools,
    inferredWorkflows: allWorkflows,
    autoFillSuggestions,
    openings,
    publicPeopleNotes: '',
    publicLeadershipText: '',
    scanDate: new Date().toISOString(),
    status: allDetectedTools.length > 0 || allWorkflows.length > 0 ? 'analyzed' : 'scanned',
  };

  return { findings, fetchedPages };
}

// ─── Auto-Fill Suggestion Engine ────────────────────────────────

export function generateAutoFillSuggestions(
  company: Company,
  tools: DetectedTool[],
  workflows: InferredWorkflow[],
  pageTexts: { text: string; url: string }[]
): ReconAutoFillSuggestion[] {
  const suggestions: ReconAutoFillSuggestion[] = [];
  const allText = pageTexts.map(p => p.text).join(' ').toLowerCase();

  // Company name
  if (company.basic.name) {
    const firstMatch = pageTexts.length > 0 ? extractCompanyName(allText) : undefined;
    if (firstMatch && !company.basic.name.includes(firstMatch)) {
      suggestions.push({
        field: 'Company Name',
        suggestedValue: firstMatch,
        source: 'Detected',
        evidence: `Found on homepage: "${firstMatch}"`,
        confidence: 'High',
      });
    }
  }

  // Industry
  const industryGuess = inferIndustry(allText, tools, workflows);
  if (industryGuess && !company.basic.industry) {
    suggestions.push({
      field: 'Industry',
      suggestedValue: industryGuess,
      source: 'Inferred',
      evidence: 'Inferred from site content and detected tools',
      confidence: 'Medium',
    });
  }

  // Location
  const locationGuess = inferLocation(allText, pageTexts);
  if (locationGuess) {
    suggestions.push({
      field: 'Location',
      suggestedValue: locationGuess,
      source: 'Inferred',
      evidence: 'Detected from site content',
      confidence: 'Medium',
    });
  }

  // Company description
  const descGuess = inferDescription(allText, pageTexts);
  if (descGuess && !company.business.productsServices) {
    suggestions.push({
      field: 'Description',
      suggestedValue: descGuess,
      source: 'Inferred',
      evidence: 'Generated from site content analysis',
      confidence: 'Medium',
    });
  }

  // Products/services
  if (!company.business.productsServices) {
    const prodSlug = pageTexts.find(p => p.url.toLowerCase().includes('/product') || p.url.toLowerCase().includes('/service'))?.text.slice(0, 500);
    if (prodSlug) {
      suggestions.push({
        field: 'Products/Services',
        suggestedValue: prodSlug.slice(0, 300),
        source: 'Detected',
        evidence: 'Extracted from products/services page',
        confidence: 'High',
      });
    }
  }

  // Target customers
  if (!company.business.targetCustomers) {
    const customerSlug = pageTexts.find(p =>
      p.url.toLowerCase().includes('/customer') || p.url.toLowerCase().includes('/case-stud')
    )?.text.slice(0, 500);
    if (customerSlug) {
      suggestions.push({
        field: 'Target Customers',
        suggestedValue: customerSlug.slice(0, 300),
        source: 'Inferred',
        evidence: 'From customer/case study pages',
        confidence: 'Medium',
      });
    }
  }

  // Tools
  for (const tool of tools.slice(0, 5)) {
    suggestions.push({
      field: `Tool: ${tool.category}`,
      suggestedValue: tool.toolName,
      source: tool.detectionMethod === 'Detected' ? 'Detected' : 'Inferred' as 'Detected' | 'Inferred',
      evidence: tool.evidence,
      confidence: tool.confidence,
    });
  }

  // Departments
  const departments = new Set<string>();
  for (const wf of workflows) {
    departments.add(wf.department);
  }
  for (const tool of tools) {
    departments.add(tool.likelyDepartment);
  }
  const deptStr = Array.from(departments).join(', ');
  if (deptStr) {
    suggestions.push({
      field: 'Likely Departments',
      suggestedValue: deptStr,
      source: 'Inferred',
      evidence: 'Inferred from detected tools and workflows',
      confidence: 'Medium',
    });
  }

  // Best conversation angle
  if (workflows.length > 0) {
    const topWf = workflows.sort((a, b) => {
      const confOrder = { High: 3, Medium: 2, Low: 1 };
      return (confOrder[b.confidence] || 1) - (confOrder[a.confidence] || 1);
    })[0];
    suggestions.push({
      field: 'Best Conversation Angle',
      suggestedValue: `Start with "${topWf.workflowName}" — ${topWf.discoveryQuestion}`,
      source: 'Inferred',
      evidence: `From detected workflow: ${topWf.workflowName}`,
      confidence: topWf.confidence,
    });
  }

  return suggestions;
}

// ─── Openings Engine ────────────────────────────────────────────

export function generateReconOpenings(
  tools: DetectedTool[],
  workflows: InferredWorkflow[],
  company: Company,
  pageTexts: { text: string; url: string }[]
): ReconOpening[] {
  const openings: ReconOpening[] = [];
  const allText = pageTexts.map(p => p.text).join(' ').toLowerCase();

  // Opening: Careers page mentions hiring onboarding specialists
  const careersText = pageTexts.find(p => p.url.toLowerCase().includes('/career') || p.url.toLowerCase().includes('/jobs'))?.text || '';
  if (careersText && (careersText.toLowerCase().includes('onboarding') || careersText.toLowerCase().includes('training') || careersText.toLowerCase().includes('support') || careersText.toLowerCase().includes('customer success'))) {
    openings.push({
      openingId: uid('open'),
      title: 'Careers page suggests hiring volume or training burden',
      sourceEvidence: `Careers page mentions: "${careersText.slice(0, 200)}"`,
      whatThisSuggests: 'The company is investing in roles that indicate onboarding volume or support/training friction',
      whyItMatters: 'Hiring for onboarding/support roles suggests manual processes that could be automated',
      likelyBusinessPain: 'High manual effort in onboarding customers or support agents',
      whoToApproach: 'Head of Customer Success, VP of Support, or HR/Operations Lead',
      firstLine: 'I noticed you\'re growing your support/onboarding team — we help companies automate that first 60% so your team can focus on complex cases.',
      discoveryQuestion: 'How many new customers do you onboard each month and what does that process look like?',
      suggestedNativelyDemo: 'Automated onboarding sequence with portal and milestone tracking',
      suggestedBuildPrompt: 'Build an automated customer onboarding portal with email sequences and progress tracking',
      confidence: 'Medium',
      riskUncertainty: 'Hiring may indicate growth, not pain. Validate during conversation.',
    });
  }

  // Opening: Multiple forms/scheduling links but no visible guided flow
  const formCount = (allText.match(/form|book|schedule|request|sign up/gi) || []).length;
  if (formCount > 5) {
    openings.push({
      openingId: uid('open'),
      title: 'Multiple forms and scheduling links — potential lead routing fragmentation',
      sourceEvidence: `Found ${formCount} form/scheduling-related text references across pages`,
      whatThisSuggests: 'Fragmented lead capture that may create manual routing or lost leads',
      whyItMatters: 'Multiple entry points without central routing means leads can fall through cracks',
      likelyBusinessPain: 'Lead fragmentation, slow response, lost opportunities',
      whoToApproach: 'VP of Sales, Marketing Director, or COO',
      firstLine: 'I noticed you have multiple ways prospects can reach you — forms, scheduling links, contact pages. How are those leads currently routed?',
      discoveryQuestion: 'How do you currently track and route leads from all your different entry points?',
      suggestedNativelyDemo: 'Unified lead intake and routing dashboard',
      suggestedBuildPrompt: 'Build a unified lead intake system with auto-routing and CRM integration',
      confidence: 'Medium',
      riskUncertainty: 'Forms may be well-integrated — verify with discovery question.',
    });
  }

  // Opening: Site promotes fast response but no chat/support automation detected
  if (allText.includes('fast') || allText.includes('quick') || allText.includes('instant') || allText.includes('24/7')) {
    const hasChat = tools.some(t => t.category === 'Support' || t.category === 'Chat');
    if (!hasChat) {
      openings.push({
        openingId: uid('open'),
        title: 'Promotes fast response but no chat/support automation detected',
        sourceEvidence: 'Site mentions speed/responsiveness but no live chat or support automation tools found',
        whatThisSuggests: 'Support burden may be growing, or response times are manually maintained',
        whyItMatters: 'Manual response at scale doesn\'t scale — automation could maintain speed without headcount growth',
        likelyBusinessPain: 'Support team overwhelmed, response times slipping, cost of scaling support',
        whoToApproach: 'Customer Support Manager, Head of Customer Experience',
        firstLine: 'You promote fast response — as you grow, how do you plan to maintain that without an AI support layer?',
        discoveryQuestion: 'How many support inquiries do you get daily and what\'s your current response time?',
        suggestedNativelyDemo: 'AI support chatbot with auto-responses and human escalation',
        suggestedBuildPrompt: 'Build an AI support assistant with FAQ knowledge base and human escalation',
        confidence: 'Medium',
        riskUncertainty: 'Company may use a support tool not detected. Validate with conversation.',
      });
    }
  }

  // Opening: Customer portal/login language detected
  if (allText.includes('customer portal') || allText.includes('client portal') || allText.includes('client login') || allText.includes('account login')) {
    openings.push({
      openingId: uid('open'),
      title: 'Customer portal detected — support/account workflow opportunity',
      sourceEvidence: 'Site mentions customer/client portal or account login',
      whatThisSuggests: 'Customers manage accounts online — likely has support and account management needs',
      whyItMatters: 'Portal indicates ongoing customer relationship with support/account management workflows',
      likelyBusinessPain: 'High support volume, manual account management, customer churn',
      whoToApproach: 'VP of Customer Success, Support Manager, Product Manager',
      firstLine: 'I see you have a customer portal — how much of your support volume is related to account management vs. technical issues?',
      discoveryQuestion: 'What are the top 3 things customers do in the portal and what support questions come from it?',
      suggestedNativelyDemo: 'AI support assistant integrated with customer portal',
      suggestedBuildPrompt: 'Build a customer portal support assistant with knowledge base and ticket automation',
      confidence: 'High',
      riskUncertainty: 'Portal may already have good support integration — explore gaps.',
    });
  }

  // Opening: Security/compliance mentions but no trust center detected
  if (allText.includes('security') || allText.includes('compliance') || allText.includes('gdpr') || allText.includes('hipaa') || allText.includes('audit') || allText.includes('certified')) {
    openings.push({
      openingId: uid('open'),
      title: 'Security/compliance mentioned but no trust center detected',
      sourceEvidence: 'Site mentions compliance/security language but no dedicated trust center page found',
      whatThisSuggests: 'Security is a selling point or requirement — may need compliance workflow automation',
      whyItMatters: 'Compliance-heavy companies have audit readiness, reporting, and tracking needs',
      likelyBusinessPain: 'Manual compliance tracking, audit prep stress, missed requirements',
      whoToApproach: 'CISO, Compliance Officer, Head of Security',
      firstLine: 'I see security is important to you. How do you currently manage compliance tracking and audit readiness?',
      discoveryQuestion: 'What compliance frameworks do you need to maintain and how do you track them?',
      suggestedNativelyDemo: 'Compliance checklist automation with audit trail and reporting',
      suggestedBuildPrompt: 'Build a compliance tracking and audit readiness automation system',
      confidence: 'Medium',
      riskUncertainty: 'Company may use third-party compliance tools. Validate need.',
    });
  }

  // Opening: Blog/resources but no newsletter/automation signal
  const hasBlog = pageTexts.some(p => p.url.toLowerCase().includes('/blog') || p.url.toLowerCase().includes('/resources'));
  const hasNewsletter = allText.includes('newsletter') || allText.includes('subscribe') || allText.includes('sign up for');
  if (hasBlog && !hasNewsletter) {
    openings.push({
      openingId: uid('open'),
      title: 'Blog/resources detected but no newsletter/capture automation',
      sourceEvidence: 'Blog or resources section found but no email capture or newsletter automation detected',
      whatThisSuggests: 'Content marketing exists but may lack lead capture automation',
      whyItMatters: 'Uncaptured content traffic means missed lead generation opportunities',
      likelyBusinessPain: 'Underutilized content, missed leads, poor marketing ROI',
      whoToApproach: 'Marketing Lead, Content Manager, CMO',
      firstLine: 'I see you have great content — how are you currently capturing leads from your blog readers?',
      discoveryQuestion: 'What percentage of your blog traffic converts into leads today?',
      suggestedNativelyDemo: 'Content capture automation with lead scoring and email sequences',
      suggestedBuildPrompt: 'Build a content-to-lead automation with email capture and nurturing sequences',
      confidence: 'Medium',
      riskUncertainty: 'May use email capture not visible on scanned pages. Validate.',
    });
  }

  // Opening: Service pages but no guided intake
  const hasServicePages = pageTexts.some(p => p.url.toLowerCase().includes('/service') || p.url.toLowerCase().includes('/solution'));
  const hasIntake = allText.includes('get started') || allText.includes('free consultation') || allText.includes('book a call');
  if (hasServicePages && !hasIntake) {
    openings.push({
      openingId: uid('open'),
      title: 'Service pages present but no visible guided intake flow',
      sourceEvidence: 'Service/solution pages found but no clear intake or qualification wizard detected',
      whatThisSuggests: 'Potential friction in converting site visitors to qualified leads',
      whyItMatters: 'Without guided intake, prospects may leave or submit unqualified inquiries',
      likelyBusinessPain: 'Lost leads, unqualified inquiries, long sales cycles',
      whoToApproach: 'VP of Sales, Marketing Director, COO',
      firstLine: 'I noticed you offer several services but don\'t have a guided intake flow. How do prospects typically engage?',
      discoveryQuestion: 'What does your current lead qualification process look like from first visit to sales call?',
      suggestedNativelyDemo: 'Guided intake wizard with qualification scoring and routing',
      suggestedBuildPrompt: 'Build a guided intake qualification wizard with lead scoring and routing',
      confidence: 'Medium',
      riskUncertainty: 'Intake may happen through different channels. Validate.',
    });
  }

  // Opening: Has scheduling tool but no CRM integration visible
  const hasScheduling = tools.some(t => t.category === 'Scheduling');
  const hasCRM = tools.some(t => t.category === 'CRM');
  if (hasScheduling && !hasCRM) {
    openings.push({
      openingId: uid('open'),
      title: 'Scheduling tool detected but no CRM integration visible',
      sourceEvidence: `Detected scheduling tool: ${tools.find(t => t.category === 'Scheduling')?.toolName || 'Unknown'}`,
      whatThisSuggests: 'Leads booked via scheduling may not automatically flow into CRM',
      whyItMatters: 'Manual CRM entry after booking creates data gaps and slows follow-up',
      likelyBusinessPain: 'Manual data entry, lost booking data, slow follow-up',
      whoToApproach: 'Sales Operations Manager, VP of Sales',
      firstLine: 'I see you use [tool] for scheduling. How do those booked meetings get into your CRM?',
      discoveryQuestion: 'What happens after a prospect books a meeting — is it automatically added to your CRM?',
      suggestedNativelyDemo: 'Scheduling-to-CRM auto-sync integration',
      suggestedBuildPrompt: 'Build a scheduling-to-CRM integration that auto-creates contacts and events',
      confidence: 'Medium',
      riskUncertainty: 'May already have integration. Validate.',
    });
  }

  return openings;
}

// ─── Apply Findings to Company ──────────────────────────────────

export function applyReconFindingsToCompany(
  company: Company,
  findings: ReconFindings
): Partial<Company> {
  const updates: Partial<Company> = {};

  // Auto-fill basic info from suggestions
  for (const suggestion of findings.autoFillSuggestions) {
    switch (suggestion.field) {
      case 'Industry':
        if (!company.basic.industry) {
          updates.basic = { ...company.basic, industry: suggestion.suggestedValue };
        }
        break;
      case 'Description':
        if (!company.business.productsServices) {
          updates.business = { ...company.business, productsServices: suggestion.suggestedValue };
        }
        break;
      case 'Location':
        if (!company.basic.location) {
          updates.basic = { ...company.basic, ...(company.basic.location ? {} : { location: suggestion.suggestedValue }) };
        }
        break;
      case 'Target Customers':
        if (!company.business.targetCustomers) {
          updates.business = { ...company.business, targetCustomers: suggestion.suggestedValue };
        }
        break;
    }
  }

  // Map detected tools to company tool fields
  if (findings.detectedTools.length > 0) {
    const toolUpdates: Partial<Company['tools']> = {};

    for (const dt of findings.detectedTools) {
      const lowerCat = dt.category.toLowerCase();
      if (lowerCat.includes('crm') && !toolUpdates.crm) toolUpdates.crm = dt.toolName;
      if ((lowerCat.includes('cms') || lowerCat.includes('website')) && !toolUpdates.websitePlatform) toolUpdates.websitePlatform = dt.toolName;
      if (lowerCat.includes('scheduling') && !toolUpdates.schedulingTools) toolUpdates.schedulingTools = dt.toolName;
      if (lowerCat.includes('support') && !toolUpdates.supportTools) toolUpdates.supportTools = dt.toolName;
      if (lowerCat.includes('payment') && !toolUpdates.billingTools) toolUpdates.billingTools = dt.toolName;
      if (lowerCat.includes('analytics') && !toolUpdates.unknownTools) toolUpdates.unknownTools = `${toolUpdates.unknownTools || ''} ${dt.toolName} (Analytics)`.trim();
      if (lowerCat.includes('marketing') && !toolUpdates.emailTools) toolUpdates.emailTools = dt.toolName;
    }

    // Only apply if fields are empty
    updates.tools = {
      ...company.tools,
      ...(company.tools.crm ? {} : { crm: toolUpdates.crm || company.tools.crm }),
      ...(company.tools.websitePlatform ? {} : { websitePlatform: toolUpdates.websitePlatform || company.tools.websitePlatform }),
      ...(company.tools.schedulingTools ? {} : { schedulingTools: toolUpdates.schedulingTools || company.tools.schedulingTools }),
      ...(company.tools.supportTools ? {} : { supportTools: toolUpdates.supportTools || company.tools.supportTools }),
      ...(company.tools.billingTools ? {} : { billingTools: toolUpdates.billingTools || company.tools.billingTools }),
    };
  }

  // Generate pain points from workflows
  const newPainPoints = findings.inferredWorkflows.map(wf => ({
    id: uid('pain-recon'),
    name: wf.workflowName,
    department: wf.department.toLowerCase() as any,
    symptoms: wf.possibleBottleneck,
    likelyCost: 'To be determined during discovery',
    timeLost: 'To be quantified during discovery',
    revenueImpact: 'To be quantified during discovery',
    automationOpportunity: wf.automationOpportunity,
    suggestedSolution: wf.suggestedNativeBuilderDemo,
    confidence: wf.confidence,
    discoveryQuestion: wf.discoveryQuestion,
    severity: 3,
    frequency: 3,
    revenueImpactScore: 3,
    easeOfSolution: 3,
    decisionMakerVisibility: 3,
  }));

  // Generate opportunities from openings
  const newOpportunities = findings.openings.map(o => ({
    id: uid('opp-recon'),
    title: o.title,
    businessProblem: o.likelyBusinessPain,
    whoFeelsPain: 'Relevant departments',
    whoPaysForFix: 'Company leadership',
    proposedSolution: o.suggestedNativelyDemo,
    nativelyBuildIdea: o.suggestedBuildPrompt,
    requiredFeatures: 'To be determined during discovery',
    estimatedComplexity: 'Medium' as const,
    estimatedBusinessValue: 'Medium' as const,
    suggestedDemoAngle: `Recon-based: ${o.title}`,
    suggestedBuildPrompt: o.suggestedBuildPrompt,
    discoveryQuestions: o.discoveryQuestion,
    proofNeeded: 'Recon-based discovery — validate with customer',
    closeStrategy: 'Recon-driven — start with discovery question',
    opportunityType: 'custom' as const,
  }));

  return {
    ...updates,
    painPoints: [...company.painPoints, ...newPainPoints],
    opportunities: [...company.opportunities, ...newOpportunities],
  };
}

// ─── Helper Functions ───────────────────────────────────────────

function extractCompanyName(text: string): string | undefined {
  // Try to extract from title tag or prominent text
  const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim().replace(/\s*\|.*$/, '').replace(/\s*—.*$/, '').trim();
  return undefined;
}

function inferIndustry(text: string, tools: DetectedTool[], workflows: InferredWorkflow[]): string | undefined {
  const lower = text.toLowerCase();

  const industrySignals: { keywords: string[]; industry: string }[] = [
    { keywords: ['saas', 'software', 'cloud platform', 'app', 'web application'], industry: 'SaaS / Technology' },
    { keywords: ['health', 'medical', 'healthcare', 'clinic', 'hospital', 'patient', 'doctor'], industry: 'Healthcare' },
    { keywords: ['legal', 'law firm', 'attorney', 'lawyer', 'law practice'], industry: 'Legal' },
    { keywords: ['financial', 'finance', 'bank', 'insurance', 'investment', 'wealth', 'mortgage'], industry: 'Financial Services' },
    { keywords: ['consulting', 'consultancy', 'advisory', 'strategy'], industry: 'Consulting' },
    { keywords: ['retail', 'store', 'shop', 'ecommerce', 'e-commerce', 'wholesale'], industry: 'Retail / E-commerce' },
    { keywords: ['manufacturing', 'factory', 'industrial', 'production', 'supply chain'], industry: 'Manufacturing' },
    { keywords: ['real estate', 'property', 'realtor', 'realty'], industry: 'Real Estate' },
    { keywords: ['education', 'school', 'university', 'training', 'learning', 'course'], industry: 'Education' },
    { keywords: ['hospitality', 'hotel', 'restaurant', 'travel', 'tourism'], industry: 'Hospitality / Travel' },
    { keywords: ['construction', 'contractor', 'building', 'engineering'], industry: 'Construction / Engineering' },
    { keywords: ['nonprofit', 'non-profit', 'foundation', 'charity'], industry: 'Nonprofit' },
    { keywords: ['marketing', 'agency', 'creative', 'digital agency'], industry: 'Marketing / Agency' },
    { keywords: ['logistics', 'transportation', 'shipping', 'freight', 'delivery'], industry: 'Logistics' },
    { keywords: ['hr', 'recruiting', 'staffing', 'talent', 'workforce'], industry: 'HR / Staffing' },
  ];

  for (const signal of industrySignals) {
    if (signal.keywords.some(k => lower.includes(k))) {
      return signal.industry;
    }
  }
  return undefined;
}

function inferLocation(text: string, pageTexts: { text: string; url: string }[]): string | undefined {
  const lower = text.toLowerCase();

  // Look for location patterns
  const locationPatterns = [
    /(?:located|based|headquarters|our office)\s+(?:in|at)\s+([A-Z][a-zA-Z\s,]+?)(?:\.|,|\s+(?:and|with|we))/,
    /(?:address|our location|visit us)[^:]*:\s*([A-Z][a-zA-Z\s,]+)/,
  ];

  // Check contact/about page first
  const aboutContactText = pageTexts.find(p =>
    p.url.includes('/contact') || p.url.includes('/about')
  )?.text || '';

  const searchText = aboutContactText || text;

  for (const pattern of locationPatterns) {
    const match = searchText.match(pattern);
    if (match) return match[1].trim();
  }

  return undefined;
}

function inferDescription(text: string, pageTexts: { text: string; url: string }[]): string | undefined {
  // Try meta description first
  const metaMatch = text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (metaMatch) return metaMatch[1].trim();

  // Try homepage hero text
  const homepageText = pageTexts.find(p => p.url.includes('/') && !p.url.includes('/about') && !p.url.includes('/contact'))?.text || '';
  const sentences = homepageText.match(/[A-Z][^.!?]*[.!?]/g) || [];
  const meaningful = sentences.filter(s => s.length > 30 && s.length < 200);

  if (meaningful.length > 0) {
    return meaningful.slice(0, 2).join(' ');
  }

  return undefined;
}
