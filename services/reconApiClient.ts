// ============================================================
// Recon API Client — v2.0 (Power-Up)
// Edge Function Proxy Layer with smart retry, concurrency
// limiting, circuit breaker, and structured logging.
//
// Phase 2a power-up:
//   - All calls go through smartEdgeCall (retry + backoff + circuit breaker)
//   - Concurrency-limited via withConcurrencyLimit (max 5 concurrent)
//   - Timeout protection on every call
//   - Health analytics: getCallAnalytics(), getCircuitStatus()
// ============================================================
import { smartEdgeCall, withConcurrencyLimit, getCallAnalytics, getPendingCount, getCircuitStatus } from './edgeRequestManager';
import { NINJAPEAR_PROXY_FUNCTION, FETCH_PUBLIC_URL_FUNCTION } from '../constants/config';

// ── Shared response types ─────────────────────────────────────

export interface BackendScanResponse {
  success: boolean;
  message: string;
  data?: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  success: boolean;
  results: WebSearchResult[];
  message: string;
}

export interface TeamPageResult {
  url: string;
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
}

export interface TeamPagesResponse {
  success: boolean;
  pages: TeamPageResult[];
  message: string;
}

export interface EnrichCompanyResponse {
  success: boolean;
  message: string;
  company?: unknown;
  people?: unknown;
  funding?: unknown;
  updates?: unknown;
}

export interface EnrichPersonResponse {
  success: boolean;
  message: string;
  person?: unknown;
}

export interface LinkedInUrl {
  type: string;
  url: string;
  label: string;
}

export interface LinkedInUrlsResponse {
  success: boolean;
  linkedInUrls?: LinkedInUrl[];
  error?: string;
  message: string;
}

export interface FullReconResponse {
  success: boolean;
  message: string;
  html?: string;
  text?: string;
  results?: WebSearchResult[];
  pages?: TeamPageResult[];
  company?: unknown;
  people?: unknown;
  funding?: unknown;
  updates?: unknown;
  jobs?: unknown;
  person?: unknown;
  reconSummary?: string;
  linkedInUrls?: LinkedInUrl[];
}

// ── Health / Analytics exports ────────────────────────────────
export { getCallAnalytics, getPendingCount, getCircuitStatus };

// ── Internal wrapper: smart + concurrency-limited call ────────

async function callEdge<R = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options?: { important?: boolean; timeoutMs?: number; retries?: number }
): Promise<{ data: R | null; error: string | null }> {
  return withConcurrencyLimit(
    () => smartEdgeCall<R>(functionName, body, options).then(r => ({ data: r.data, error: r.error })),
    { concurrency: 5, key: 'edge-call' }
  );
}

// ── fetch-public-url (simple server-side fetch) ─────────

export async function fetchPageViaEdgeFunction(url: string): Promise<{
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
  blocked?: boolean;
}> {
  const { data, error } = await callEdge<{
    success: boolean; html?: string; text?: string; error?: string;
    blocked?: boolean; statusCode?: number;
  }>(FETCH_PUBLIC_URL_FUNCTION, { url }, { timeoutMs: 20000, important: true });

  if (error || !data) {
    console.warn('[ReconApiClient] fetchPageViaEdgeFunction error:', error);
    return { success: false, error: error || 'No response from edge function', blocked: false };
  }
  return {
    success: data.success, html: data.html, text: data.text,
    error: data.error, blocked: data.blocked || false,
  };
}

// ── fetch_page (NinjaPear scrape — needs API key) ─────────

export async function scanUrlViaBackend(url: string): Promise<BackendScanResponse> {
  const { data, error } = await callEdge<{
    success: boolean; html?: string; text?: string; error?: string;
  }>(NINJAPEAR_PROXY_FUNCTION, { url, action: 'fetch_page' }, { important: true, timeoutMs: 25000 });

  if (error || !data) {
    return { success: false, message: error || 'Backend proxy returned no data.' };
  }
  if (!data.success || !data.html) {
    return { success: false, message: data.error || 'Backend proxy could not fetch the page.' };
  }
  return { success: true, message: 'Page fetched via NinjaPear proxy.', data: data.html };
}

export async function scanDomainViaBackend(domain: string): Promise<BackendScanResponse> {
  const homepageUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  return scanUrlViaBackend(homepageUrl);
}

// ── scan_team_pages ──────────────────────────────────────

export async function scanTeamPagesViaBackend(urls: string[]): Promise<TeamPagesResponse> {
  const { data, error } = await callEdge<{
    success: boolean; pages: TeamPageResult[];
  }>(NINJAPEAR_PROXY_FUNCTION, { action: 'scan_team_pages', urls }, { important: true, timeoutMs: 30000 });

  if (error || !data) {
    return { success: false, pages: [], message: error || 'No data returned.' };
  }
  return { ...data, message: `Scanned ${data.pages?.length || 0} pages.` };
}

// ── search_web (DuckDuckGo, public — no API key needed) ──

export async function searchWebViaBackend(
  query: string,
  maxResults = 10
): Promise<WebSearchResponse> {
  const { data, error } = await callEdge<{
    success: boolean; results?: WebSearchResult[]; error?: string;
  }>(NINJAPEAR_PROXY_FUNCTION, { action: 'search_web', query, maxResults }, { timeoutMs: 15000 });

  if (error || !data) {
    return { success: false, results: [], message: error || 'No data returned.' };
  }
  return {
    success: data.success,
    results: data.results || [],
    message: data.success
      ? `Found ${data.results?.length || 0} results for "${query}".`
      : data.error || 'Search failed.',
  };
}

// ── fetch_linkedin_jobs (SAFE — research links, no scraping) ──

export async function fetchLinkedInJobsViaBackend(
  keywords: string,
  location = ''
): Promise<LinkedInUrlsResponse> {
  const { data, error } = await callEdge<{
    success: boolean; linkedInUrls?: LinkedInUrl[]; error?: string;
  }>(NINJAPEAR_PROXY_FUNCTION, { action: 'fetch_linkedin_jobs', keywords, location }, { timeoutMs: 10000 });

  if (error || !data) {
    return { success: false, message: error || 'No data returned.' };
  }
  return {
    success: data.success,
    linkedInUrls: data.linkedInUrls || [],
    message: data.success
      ? `Generated ${data.linkedInUrls?.length || 0} LinkedIn research links.`
      : data.error || 'LinkedIn link generation failed.',
  };
}

// ── fetch_linkedin_company (SAFE — research URLs, no scraping) ──

export async function fetchLinkedInCompanyViaBackend(
  companyName: string
): Promise<LinkedInUrlsResponse> {
  const { data, error } = await callEdge<{
    success: boolean; linkedInUrls?: LinkedInUrl[]; error?: string;
  }>(NINJAPEAR_PROXY_FUNCTION, { action: 'fetch_linkedin_company', companyName }, { timeoutMs: 10000 });

  if (error || !data) {
    return { success: false, message: error || 'No data returned.' };
  }
  return {
    success: data.success,
    linkedInUrls: data.linkedInUrls || [],
    message: data.success
      ? `Generated ${data.linkedInUrls?.length || 0} LinkedIn research URLs.`
      : data.error || 'LinkedIn link generation failed.',
  };
}

// ── enrich_company (NinjaPear — needs API key) ────────────

export async function enrichCompanyViaBackend(
  domain: string,
  enrichActions: string[] = ['details', 'employees', 'funding', 'updates']
): Promise<EnrichCompanyResponse> {
  const { data, error } = await callEdge<EnrichCompanyResponse>(
    NINJAPEAR_PROXY_FUNCTION,
    { action: 'enrich_company', domain, enrichActions },
    { important: true, timeoutMs: 30000 }
  );

  if (error || !data) {
    return { success: false, message: error || 'No data returned.' };
  }
  return { ...data, message: data.success ? 'Company enriched via NinjaPear.' : 'Enrichment failed.' };
}

// ── enrich_person (NinjaPear — needs API key) ─────────────

export async function enrichPersonViaBackend(
  linkedinUrl: string
): Promise<EnrichPersonResponse> {
  const { data, error } = await callEdge<EnrichPersonResponse>(
    NINJAPEAR_PROXY_FUNCTION,
    { action: 'enrich_person', linkedinUrl },
    { important: true, timeoutMs: 20000 }
  );

  if (error || !data) {
    return { success: false, message: error || 'No data returned.' };
  }
  return { ...data, message: data.success ? 'Person enriched via NinjaPear.' : 'Enrichment failed.' };
}

// ── full_recon (orchestrated — public + NinjaPear) ────────

export async function fullReconViaBackend(params: {
  url?: string;
  domain?: string;
  companyName?: string;
  linkedinUrl?: string;
  query?: string;
  keywords?: string;
  location?: string;
  maxResults?: number;
  enrichActions?: string[];
}): Promise<FullReconResponse> {
  const { data, error } = await callEdge<FullReconResponse>(
    NINJAPEAR_PROXY_FUNCTION,
    { action: 'full_recon', ...params },
    { important: true, timeoutMs: 60000 }
  );

  if (error || !data) {
    return { success: false, message: error || 'No data returned.', reconSummary: 'Recon failed.' };
  }
  return { ...data, message: data.success ? 'Full recon completed.' : 'Recon failed.' };
}
