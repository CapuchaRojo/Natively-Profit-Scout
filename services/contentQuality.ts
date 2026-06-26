// ============================================================
// Content Quality Service — v0.7
// Content grading, noise removal, fetch status classification,
// and source weighting for recon intelligence pipeline.
// ============================================================

import type { ReconDiscoveredUrl, SourceWeight, FetchStatus, ConfidenceLevel } from '../types';

// ─── Fetch Status Classification ────────────────────────────

export interface FetchClassification {
  status: FetchStatus;
  notes: string;
  contentLength: number;
  httpStatus: number | undefined;
}

export function classifyFetchResult(
  url: string,
  html: string | undefined,
  text: string | undefined,
  httpStatus: number | undefined,
  error: string | undefined,
  blocked: boolean | undefined
): FetchClassification {
  const lowerUrl = url.toLowerCase();
  const contentLength = text?.length || html?.length || 0;

  // ── Case 1: Actual HTTP 404 or content that looks like a 404 ──
  if (httpStatus === 404) {
    return {
      status: 'not_found_404',
      notes: `HTTP 404 — page not found. Excluded from business inference.`,
      contentLength: 0,
      httpStatus: 404,
    };
  }

  if (text && is404Content(text)) {
    return {
      status: 'not_found_404',
      notes: `Content matches 404/not-found patterns. Excluded from business inference.`,
      contentLength,
      httpStatus,
    };
  }

  // ── Case 2: Blocked by proxy (CORS/network) ──
  if (blocked && (!html || contentLength < 100)) {
    const isLoginWall = lowerUrl.includes('linkedin') || lowerUrl.includes('login') || lowerUrl.includes('signin');
    if (isLoginWall) {
      return {
        status: 'login_walled',
        notes: `Login-walled page — requires authentication. Paste visible content manually.`,
        contentLength,
        httpStatus,
      };
    }
    return {
      status: 'blocked_by_proxy',
      notes: `Blocked by CORS/proxy. Try pasting page content manually if you can access it in a browser.`,
      contentLength,
      httpStatus,
    };
  }

  // ── Case 3: Empty or app-shell content ──
  if (html && contentLength < 200) {
    if (html.includes('<div id="root"') || html.includes('<div id="app"') || html.includes('__NEXT_DATA__') && contentLength < 500) {
      return {
        status: 'app_shell_or_empty',
        notes: `App shell detected — JS-rendered content not crawlable. Paste visible page content manually.`,
        contentLength,
        httpStatus,
      };
    }
    return {
      status: 'app_shell_or_empty',
      notes: `Nearly empty page (${contentLength} chars). Likely JS-rendered or thin content.`,
      contentLength,
      httpStatus,
    };
  }

  // ── Case 4: Success but needs manual paste (login-walled content pattern) ──
  if (text && isLoginWallContent(text)) {
    return {
      status: 'login_walled',
      notes: `Content appears to be a login page or auth-gated page. Paste visible content manually.`,
      contentLength,
      httpStatus,
    };
  }

  // ── Case 5: Scanned successfully ──
  return {
    status: 'scanned',
    notes: `Successfully fetched (${contentLength.toLocaleString()} chars)`,
    contentLength,
    httpStatus,
  };
}

// ─── Source Weight Classification ────────────────────────────

/**
 * Determine the signal quality weight of a URL based on its page type.
 * High-signal pages: homepage, about, product/service, pricing, case studies, team, careers, pasted LinkedIn
 * Medium-signal: blog, news, press, contact, demo, security
 * Low-signal: robots.txt, sitemap.xml, security.txt, terms, privacy
 * Noise: 404, app shell, empty pages
 */
export function classifySourceWeight(
  pageType: string,
  status: FetchStatus,
  fetchSourceType?: string
): SourceWeight {
  // Noise pages — never used for inference
  const noiseStatuses: FetchStatus[] = ['not_found_404', 'app_shell_or_empty'];
  if (noiseStatuses.includes(status)) return 'noise';

  // Pasted content is always high signal (user intentionally provided)
  if (fetchSourceType === 'pasted-public-page' || status === 'pasted') return 'high_signal';

  const lowerType = pageType.toLowerCase();

  // High-signal page types
  const highSignalPatterns = [
    'homepage', 'about page', 'about us',
    'services', 'products', 'solutions',
    'pricing', 'price',
    'case stud', 'customer', 'client', 'portfolio',
    'careers', 'jobs', 'join',
    'team', 'leadership', 'management',
  ];
  if (highSignalPatterns.some(p => lowerType.includes(p))) return 'high_signal';

  // Also high-signal: pasted LinkedIn text
  if (fetchSourceType === 'pasted-public-page') return 'high_signal';

  // Medium-signal page types
  const mediumSignalPatterns = [
    'blog', 'news', 'press', 'media', 'articles',
    'contact', 'reach',
    'demo', 'book',
    'security', 'trust',
    'support', 'help', 'faq',
  ];
  if (mediumSignalPatterns.some(p => lowerType.includes(p))) return 'medium_signal';

  // Low-signal / infrastructure pages
  const lowSignalPatterns = [
    'robots.txt', 'sitemap', 'sitemap.xml',
    'security.txt', '.well-known',
    'privacy', 'terms', 'legal', 'gdpr',
    'login', 'signin', 'signup', 'register',
  ];
  if (lowSignalPatterns.some(p => lowerType.includes(p))) return 'low_signal';

  // Default: medium for unknown page types that were successfully fetched
  if (status === 'scanned' || status === 'pasted') return 'medium_signal';

  return 'low_signal';
}

/**
 * Returns true if this URL should be excluded from business inference
 * (workflows, suggestions, openings, descriptions).
 */
export function shouldExcludeFromInference(status: FetchStatus, sourceWeight: SourceWeight): boolean {
  if (status === 'not_found_404' || status === 'app_shell_or_empty') return true;
  if (sourceWeight === 'noise') return true;
  return false;
}

/**
 * Returns true if this is a low-value infrastructure page
 * that shouldn't trigger workflow/suggestion generation.
 */
export function isInfrastructurePage(pageType: string): boolean {
  const lower = pageType.toLowerCase();
  const infraPatterns = [
    'robots.txt', 'sitemap', 'sitemap.xml',
    'security.txt', '.well-known',
    'privacy', 'terms', 'legal', 'gdpr',
    'login', 'signin', 'signup',
  ];
  return infraPatterns.some(p => lower.includes(p));
}

// ─── Content Detection Helpers ───────────────────────────────

function is404Content(text: string): boolean {
  const lower = text.slice(0, 500).toLowerCase();
  const patterns = [
    '404 not found',
    'page not found',
    'the page you',
    'page doesn\'t exist',
    'page does not exist',
    'can\'t find that page',
    'cannot find',
    'no results found',
    'nothing found',
    'error 404',
    'not found</title>',
    '<title>404',
    'page was not found',
    'the requested url was not found',
    'sorry, the page',
    'sorry, we couldn\'t find',
    'oops! page not found',
    'this page could not be found',
    'we can\'t find the page',
    'page not available',
  ];
  return patterns.some(p => lower.includes(p));
}

function isLoginWallContent(text: string): boolean {
  const lower = text.slice(0, 1000).toLowerCase();
  const loginIndicators = [
    'sign in to continue',
    'please log in',
    'please sign in',
    'login to view',
    'sign in to view',
    'you must be logged in',
    'create an account to',
    'join to view',
  ];
  const hasLoginForm = lower.includes('password') && (lower.includes('email') || lower.includes('username'));
  const hasLoginIndicators = loginIndicators.some(p => lower.includes(p));

  // Only flag if content is short AND has login patterns (avoid false positives
  // on pages that mention "login" as a feature)
  return text.length < 2000 && (hasLoginIndicators || (hasLoginForm && text.length < 800));
}

// ─── Content Cleaning ────────────────────────────────────────

/**
 * Clean text before feeding it to inference engines.
 * Removes 404 text, app shell boilerplate, nav repetition, and boilerplate legal text.
 */
export function cleanContentForInference(text: string, pageType: string, url: string): string {
  let cleaned = text;

  // Strip 404 messages
  cleaned = cleaned.replace(/404[:\s]*Not Found[\s\S]{0,200}/gi, ' ');
  cleaned = cleaned.replace(/page (not found|doesn'?t exist|was not found|is not available)[\s\S]{0,200}/gi, ' ');

  // Strip repeated navigation labels (common in scraped HTML)
  const navBoilerplate = /\b(Home|About|Services|Products|Pricing|Blog|Contact|Login|Sign Up|Careers|Support|FAQ)\b(?:\s+\|\s+|\s+·\s+|\s+>\s+|\s+\/\s+)/g;
  cleaned = cleaned.replace(navBoilerplate, ' ');

  // Strip boilerplate legal text for non-legal pages
  if (!pageType.toLowerCase().includes('privacy') && !pageType.toLowerCase().includes('terms') && !pageType.toLowerCase().includes('legal') && !pageType.toLowerCase().includes('security')) {
    cleaned = cleaned.replace(/\b(cookie policy|cookies policy|privacy policy|terms of service|terms and conditions|all rights reserved|copyright\s+\d{4})\b/gi, ' ');
  }

  // Strip app shell boilerplate
  cleaned = cleaned.replace(/\b(loading\.{3}|please wait\.{3}|javascript is required|enable javascript)\b/gi, ' ');

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Deduplicate repeated snippets (simple approach — find lines repeated > 3 times)
  const lines = cleaned.split('\n');
  const lineCount = new Map<string, number>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;
    lineCount.set(trimmed, (lineCount.get(trimmed) || 0) + 1);
  }
  const overusedLines = new Set<string>();
  for (const [line, count] of lineCount) {
    if (count > 4) overusedLines.add(line);
  }
  if (overusedLines.size > 0) {
    cleaned = lines.filter(l => !overusedLines.has(l.trim())).join('\n');
  }

  return cleaned.trim();
}

// ─── Weighted confidence adjustment ──────────────────────────

/**
 * Adjust confidence based on source weight.
 * Low-signal sources get confidence downgraded; noise sources are suppressed entirely.
 */
export function adjustConfidenceForSource(
  confidence: ConfidenceLevel,
  sourceWeight: SourceWeight
): ConfidenceLevel {
  if (sourceWeight === 'noise') return 'Low';
  if (sourceWeight === 'low_signal' && confidence === 'High') return 'Medium';
  if (sourceWeight === 'low_signal' && confidence === 'Medium') return 'Low';
  if (sourceWeight === 'medium_signal' && confidence === 'High') return 'Medium';
  return confidence;
}

/**
 * Determine whether a workflow inference from this page should be suppressed.
 */
export function shouldSuppressWorkflowInference(sourceWeight: SourceWeight): boolean {
  return sourceWeight === 'low_signal' || sourceWeight === 'noise';
}

// ─── Apply source weight to discovered URLs ──────────────────

export function applySourceWeights(urls: ReconDiscoveredUrl[]): ReconDiscoveredUrl[] {
  return urls.map(url => ({
    ...url,
    sourceWeight: classifySourceWeight(url.pageType, url.status, url.fetchSourceType),
  }));
}

// ─── Get summary of source quality ───────────────────────────

export interface SourceQualitySummary {
  highSignal: number;
  mediumSignal: number;
  lowSignal: number;
  noise: number;
  total: number;
  actionableCount: number;
}

export function getSourceQualitySummary(urls: ReconDiscoveredUrl[]): SourceQualitySummary {
  const weighted = applySourceWeights(urls);
  const counts = {
    highSignal: weighted.filter(u => u.sourceWeight === 'high_signal').length,
    mediumSignal: weighted.filter(u => u.sourceWeight === 'medium_signal').length,
    lowSignal: weighted.filter(u => u.sourceWeight === 'low_signal').length,
    noise: weighted.filter(u => u.sourceWeight === 'noise').length,
  };
  return {
    ...counts,
    total: urls.length,
    actionableCount: counts.highSignal + counts.mediumSignal,
  };
}