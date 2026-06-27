// ============================================================
// Recon API Client — Edge Function Proxy Layer
//
// Three-tier fetch chain (used by reconScanner.ts):
//   1. fetch-public-url Edge Function  → server-side HTTP fetch
//   2. Browser fetch                   → fast path for CORS-friendly sites
//   3. NinjaPear proxy                 → last resort, rate-limited
//
// NinjaPear Edge Function v3 actions (ninjapear-proxy):
//   fetch_page            — NinjaPear scrape (any URL) [needs API key]
//   scan_team_pages       — parallel NinjaPear scrape [needs API key]
//   search_web            — DuckDuckGo HTML search (public, no key needed)
//   fetch_linkedin_jobs   — safe LinkedIn research links (public)
//   fetch_linkedin_company — safe LinkedIn research URLs (public)
//   enrich_company        — NinjaPear company details [needs API key]
//   enrich_person         — NinjaPear person profile [needs API key]
//   full_recon            — orchestrated multi-step recon
// ============================================================
import { invokeEdgeFunction, NINJAPEAR_PROXY_FUNCTION, FETCH_PUBLIC_URL_FUNCTION } from '../constants/config';

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

// ── fetch-public-url (simple server-side fetch) ─────────

/**
 * Fetch any public URL via the standalone Edge Function proxy.
 * This is a simple server-side HTTP fetch — no NinjaPear dependency,
 * no CORS restrictions. It returns raw HTML and cleaned text.
 *
 * Use this as the FIRST attempt in the fetch chain, before falling
 * back to NinjaPear or user paste.
 */
export async function fetchPageViaEdgeFunction(url: string): Promise<{
  success: boolean;
  html?: string;
  text?: string;
  error?: string;
  blocked?: boolean;
}> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      html?: string;
      text?: string;
      error?: string;
      blocked?: boolean;
      statusCode?: number;
    }>(FETCH_PUBLIC_URL_FUNCTION, { url });

    if (error || !data) {
      console.warn('[ReconApiClient] fetchPageViaEdgeFunction error:', error);
      return { success: false, error: error || 'No response from edge function', blocked: false };
    }

    return {
      success: data.success,
      html: data.html,
      text: data.text,
      error: data.error,
      blocked: data.blocked || false,
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] fetchPageViaEdgeFunction exception:', error.message);
    return { success: false, error: error.message, blocked: false };
  }
}

// ── fetch_page (NinjaPear scrape — needs API key) ─────────

export async function scanUrlViaBackend(url: string): Promise<BackendScanResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      html?: string;
      text?: string;
      error?: string;
    }>(NINJAPEAR_PROXY_FUNCTION, {
      url,
      action: 'fetch_page',
    });

    if (error || !data) {
      console.warn('[ReconApiClient] Backend proxy error:', error);
      return { success: false, message: error || 'Backend proxy returned no data.' };
    }

    if (!data.success || !data.html) {
      return { success: false, message: data.error || 'Backend proxy could not fetch the page.' };
    }

    return { success: true, message: 'Page fetched via NinjaPear proxy.', data: data.html };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] Exception:', error.message);
    return { success: false, message: error.message || 'Unknown error calling backend proxy.' };
  }
}

export async function scanDomainViaBackend(domain: string): Promise<BackendScanResponse> {
  const homepageUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  return scanUrlViaBackend(homepageUrl);
}

// ── scan_team_pages ──────────────────────────────────────

export async function scanTeamPagesViaBackend(urls: string[]): Promise<TeamPagesResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      pages: TeamPageResult[];
    }>(NINJAPEAR_PROXY_FUNCTION, {
      action: 'scan_team_pages',
      urls,
    });

    if (error || !data) {
      return { success: false, pages: [], message: error || 'No data returned.' };
    }

    return { ...data, message: `Scanned ${data.pages?.length || 0} pages.` };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] scanTeamPagesViaBackend exception:', error.message);
    return { success: false, pages: [], message: error.message };
  }
}

// ── search_web (DuckDuckGo, public — no API key needed) ──

export async function searchWebViaBackend(
  query: string,
  maxResults = 10
): Promise<WebSearchResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      results?: WebSearchResult[];
      error?: string;
    }>(NINJAPEAR_PROXY_FUNCTION, {
      action: 'search_web',
      query,
      maxResults,
    });

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
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] searchWebViaBackend exception:', error.message);
    return { success: false, results: [], message: error.message };
  }
}

// ── fetch_linkedin_jobs (SAFE — research links, no scraping) ──

/**
 * Generate safe LinkedIn research links via Edge Function.
 * Returns URLs the user opens manually — NO scraping of LinkedIn.
 */
export async function fetchLinkedInJobsViaBackend(
  keywords: string,
  location = ''
): Promise<LinkedInUrlsResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      linkedInUrls?: LinkedInUrl[];
      error?: string;
    }>(NINJAPEAR_PROXY_FUNCTION, {
      action: 'fetch_linkedin_jobs',
      keywords,
      location,
    });

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
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] fetchLinkedInJobsViaBackend exception:', error.message);
    return { success: false, message: error.message };
  }
}

// ── fetch_linkedin_company (SAFE — research URLs, no scraping) ──

/**
 * Generate safe LinkedIn company research URLs via Edge Function.
 * Returns URLs the user opens manually — NO scraping of LinkedIn.
 */
export async function fetchLinkedInCompanyViaBackend(
  companyName: string
): Promise<LinkedInUrlsResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      linkedInUrls?: LinkedInUrl[];
      error?: string;
    }>(NINJAPEAR_PROXY_FUNCTION, {
      action: 'fetch_linkedin_company',
      companyName,
    });

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
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] fetchLinkedInCompanyViaBackend exception:', error.message);
    return { success: false, message: error.message };
  }
}

// ── enrich_company (NinjaPear — needs API key) ────────────

export async function enrichCompanyViaBackend(
  domain: string,
  enrichActions: string[] = ['details', 'employees', 'funding', 'updates']
): Promise<EnrichCompanyResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<EnrichCompanyResponse>(
      NINJAPEAR_PROXY_FUNCTION,
      { action: 'enrich_company', domain, enrichActions }
    );

    if (error || !data) {
      return { success: false, message: error || 'No data returned.' };
    }

    return { ...data, message: data.success ? 'Company enriched via NinjaPear.' : 'Enrichment failed.' };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] enrichCompanyViaBackend exception:', error.message);
    return { success: false, message: error.message };
  }
}

// ── enrich_person (NinjaPear — needs API key) ─────────────

export async function enrichPersonViaBackend(
  linkedinUrl: string
): Promise<EnrichPersonResponse> {
  try {
    const { data, error } = await invokeEdgeFunction<EnrichPersonResponse>(
      NINJAPEAR_PROXY_FUNCTION,
      { action: 'enrich_person', linkedinUrl }
    );

    if (error || !data) {
      return { success: false, message: error || 'No data returned.' };
    }

    return { ...data, message: data.success ? 'Person enriched via NinjaPear.' : 'Enrichment failed.' };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] enrichPersonViaBackend exception:', error.message);
    return { success: false, message: error.message };
  }
}

// ── full_recon (orchestrated — public + NinjaPear where available) ──

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
  try {
    const { data, error } = await invokeEdgeFunction<FullReconResponse>(
      NINJAPEAR_PROXY_FUNCTION,
      { action: 'full_recon', ...params }
    );

    if (error || !data) {
      return { success: false, message: error || 'No data returned.', reconSummary: 'Recon failed.' };
    }

    return { ...data, message: data.success ? 'Full recon completed.' : 'Recon failed.' };
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[ReconApiClient] fullReconViaBackend exception:', error.message);
    return { success: false, message: error.message, reconSummary: 'Recon failed.' };
  }
}
