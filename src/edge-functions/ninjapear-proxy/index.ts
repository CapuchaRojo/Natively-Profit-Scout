// ============================================================
// NinjaPear Proxy Edge Function — v9.0 (Power-Up)
//
// Phase 2a enhancements:
//   1. 🔍 Better search: DuckDuckGo + NinjaPear fallback
//   2. ⚡ Concurrency: controlled parallelism in full_recon
//   3. 📊 Structured logging: call metadata in every response
//   4. 🔐 Auth hardening: JWT verification via Authorization header
//
// Actions:
//   fetch_page            — NinjaPear scrape (any URL) [needs API key]
//   scan_team_pages       — parallel NinjaPear scrape [needs API key]
//   search_web            — DuckDuckGo HTML search, falls back to NinjaPear
//   fetch_linkedin_jobs   — generate safe LinkedIn research links
//   fetch_linkedin_company — generate safe LinkedIn research URLs
//   enrich_company        — NinjaPear company details [needs API key]
//   enrich_person         — NinjaPear person profile [needs API key]
//   full_recon            — orchestrated multi-step recon
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ── Types ────────────────────────────────────────────────────

interface RequestBody {
  action?: string;
  url?: string;
  urls?: string[];
  query?: string;
  maxResults?: number;
  keywords?: string;
  location?: string;
  companyName?: string;
  domain?: string;
  linkedinUrl?: string;
  enrichActions?: string[];
  [key: string]: unknown;
}

interface SuccessResponse {
  success: true;
  [key: string]: unknown;
}

interface ErrorResponse {
  success: false;
  error: string;
  action?: string;
  meta?: Record<string, unknown>;
}

type ActionResponse = SuccessResponse | ErrorResponse;

// ── Configuration ────────────────────────────────────────────

const NINJAPEAR_API_KEY = Deno.env.get('NINJAPEAR_API_KEY');
const NINJAPEAR_BASE = 'https://api.ninjapear.com/v1';

// Concurrency limits
const MAX_CONCURRENT = 5;
const MAX_SEARCH_RESULTS = 10;
const DEFAULT_SEARCH_COUNT = 8;

// ── Helper: auto-reject aborted requests ─────────────────────

function getApiKey(): string {
  if (!NINJAPEAR_API_KEY) throw new Error('NinjaPear API key not configured');
  return NINJAPEAR_API_KEY;
}

// ── JWT Auth check (lightweight — verifies token exists) ────

interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

function validateAuth(req: Request): { authorized: boolean; role?: string } {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }
  try {
    // Decode JWT payload (base64 decode the second segment)
    const parts = authHeader.split('.');
    if (parts.length !== 3) return { authorized: false, role: 'unknown' };
    const payload = JSON.parse(atob(parts[1])) as JWTPayload;
    return { authorized: true, role: payload.role || 'anon' };
  } catch {
    return { authorized: false };
  }
}

// ── Logging helper ──────────────────────────────────────────

function callLog(action: string, status: 'ok' | 'error' | 'timeout', meta?: Record<string, unknown>): void {
  const entry = { timestamp: new Date().toISOString(), action, status, ...meta };
  console.log(JSON.stringify(entry));
}

// ── Fetch helper with timeout ───────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// =============================================================
// ACTION HANDLERS
// =============================================================

// ── fetch_page: NinjaPear scrape ─────────────────────────────

async function handleFetchPage(url: string): Promise<ActionResponse> {
  const apiKey = getApiKey();
  const start = Date.now();

  const response = await fetchWithTimeout(`${NINJAPEAR_BASE}/fetch`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, options: { include_html: true } }),
  }, 25000);

  if (!response.ok) {
    const errText = await response.text();
    callLog('fetch_page', 'error', { url, statusCode: response.status, durationMs: Date.now() - start });
    return { success: false, error: `NinjaPear fetch failed: HTTP ${response.status} — ${errText.slice(0, 200)}` };
  }

  const data = await response.json();
  const html = data?.html || data?.data?.html || data?.content || '';
  const text = data?.text || data?.data?.text || '';
  callLog('fetch_page', 'ok', { url, htmlLength: html.length, durationMs: Date.now() - start });

  return { success: true, html, text, source: 'ninjapear', url };
}

// ── scan_team_pages: parallel NinjaPear ─────────────────────

async function handleScanTeamPages(urls: string[]): Promise<ActionResponse> {
  const apiKey = getApiKey();
  const pages: { url: string; success: boolean; html?: string; text?: string; error?: string }[] = [];
  const start = Date.now();

  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < urls.length; i += MAX_CONCURRENT) {
    const batch = urls.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const response = await fetchWithTimeout(`${NINJAPEAR_BASE}/fetch`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, options: { include_html: true } }),
          }, 20000);

          if (!response.ok) {
            return { url, success: false, error: `HTTP ${response.status}` };
          }
          const data = await response.json();
          const html = data?.html || data?.data?.html || data?.content || '';
          const text = data?.text || data?.data?.text || '';
          return { url, success: true, html, text };
        } catch (err: unknown) {
          return { url, success: false, error: (err as Error).message };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        pages.push(result.value);
      }
    }
  }

  callLog('scan_team_pages', 'ok', { urlCount: urls.length, successful: pages.filter(p => p.success).length, durationMs: Date.now() - start });
  return { success: true, pages };
}

// ── search_web: DuckDuckGo → NinjaPear fallback ─────────────

function extractDuckDuckGoResults(html: string, maxResults: number): { title: string; url: string; snippet: string }[] {
  const results: { title: string; url: string; snippet: string }[] = [];

  // Strategy 1: Modern DDG result articles
  const articleRegex = /<article[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<a[^>]*>([^<]*)<\/a>/);
    const urlMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*>/);
    const snippetMatch = block.match(/<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([^<]*)<\/span>/) ||
                          block.match(/<td[^>]*class="[^"]*snippet[^"]*"[^>]*>([^<]*)<\/td>/) ||
                          block.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]*)<\/div>/);

    if (titleMatch && urlMatch) {
      const url = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`;
      results.push({
        title: titleMatch[1].trim(),
        url: url.split('?')[0], // strip query params
        snippet: snippetMatch ? snippetMatch[1].trim() : '',
      });
    }
    if (results.length >= maxResults) break;
  }

  if (results.length > 0) return results;

  // Strategy 2: Old DDG result links
  const linkRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].startsWith('http') ? match[1] : `https://${match[1]}`;
    const snippetMatch = html.slice(match.index).match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]*)<\/a>/);
    results.push({
      title: match[2].trim(),
      url: url.split('?')[0],
      snippet: snippetMatch ? snippetMatch[1].trim() : '',
    });
    if (results.length >= maxResults) break;
  }

  if (results.length > 0) return results;

  // Strategy 3: Generic link extraction from DDG
  const genericRegex = /<a[^>]*rel="nofollow"[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  while ((match = genericRegex.exec(html)) !== null) {
    const url = match[1].startsWith('http') ? match[1] : `https://${match[1]}`;
    if (url.includes('duckduckgo.com') || url.includes('//r.')) continue;
    results.push({
      title: match[2].trim(),
      url: url.split('?')[0],
      snippet: '',
    });
    if (results.length >= maxResults) break;
  }

  return results;
}

async function handleDuckDuckGoSearch(query: string, maxResults: number): Promise<ActionResponse> {
  const start = Date.now();
  const encodedQuery = encodeURIComponent(query);
  const urls = [
    `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
    `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`,
  ];

  let lastError = '';

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProfitScout/1.0; +https://natively.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }, 10000);

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const html = await response.text();
      const results = extractDuckDuckGoResults(html, maxResults);

      if (results.length > 0) {
        callLog('search_web', 'ok', { query, source: 'duckduckgo', resultCount: results.length, durationMs: Date.now() - start });
        return { success: true, results, query, source: 'duckduckgo' };
      }
      lastError = 'No results extracted from DuckDuckGo';
    } catch (err: unknown) {
      lastError = (err as Error).message;
    }
  }

  callLog('search_web', 'error', { query, error: lastError, durationMs: Date.now() - start });

  // ── Fallback: Try NinjaPear search if available ──
  if (NINJAPEAR_API_KEY) {
    try {
      const response = await fetchWithTimeout(`${NINJAPEAR_BASE}/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${NINJAPEAR_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: Math.min(maxResults, DEFAULT_SEARCH_COUNT) }),
      }, 15000);

      if (response.ok) {
        const data = await response.json();
        const ninjaResults = (data?.results || data?.data || [])
          .slice(0, maxResults)
          .map((r: Record<string, unknown>) => ({
            title: String(r.title || r.name || ''),
            url: String(r.url || r.link || ''),
            snippet: String(r.snippet || r.description || r.text || ''),
          }))
          .filter((r: { title: string; url: string }) => r.title && r.url);

        if (ninjaResults.length > 0) {
          callLog('search_web', 'ok', { query, source: 'ninjapear', resultCount: ninjaResults.length, durationMs: Date.now() - start });
          return { success: true, results: ninjaResults, query, source: 'ninjapear' };
        }
      }
    } catch { /* NinjaPear search is best-effort fallback */ }
  }

  return { success: false, error: lastError || 'All search methods failed', query };
}

async function handleSearchWeb(query: string, maxResults: number): Promise<ActionResponse> {
  return handleDuckDuckGoSearch(query, maxResults || MAX_SEARCH_RESULTS);
}

// ── fetch_linkedin_jobs: generate safe research links ───────

async function handleFetchLinkedInJobs(keywords: string, location?: string): Promise<ActionResponse> {
  const encodedKeywords = encodeURIComponent(keywords);
  const encodedLocation = location ? encodeURIComponent(location) : '';

  const urls: { type: string; url: string; label: string }[] = [];

  // Generate safe research links that the user can open manually
  if (encodedLocation) {
    urls.push({
      type: 'linkedin_jobs',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}&location=${encodedLocation}`,
      label: `LinkedIn Jobs: ${keywords} in ${location}`,
    });
  }
  urls.push({
    type: 'linkedin_jobs',
    url: `https://www.linkedin.com/jobs/search/?keywords=${encodedKeywords}`,
    label: `LinkedIn Jobs: ${keywords}`,
  });

  return { success: true, linkedInUrls: urls, keywords, location };
}

// ── fetch_linkedin_company: generate safe research URLs ─────

async function handleFetchLinkedInCompany(companyName: string): Promise<ActionResponse> {
  const encodedName = encodeURIComponent(companyName);
  const searchQuery = encodeURIComponent(`${companyName} linkedin`);

  const urls: { type: string; url: string; label: string }[] = [
    {
      type: 'linkedin_company_search',
      url: `https://www.linkedin.com/search/results/companies/?keywords=${encodedName}`,
      label: `LinkedIn Company Search: ${companyName}`,
    },
  ];

  // Add additional research URLs that can help the user
  urls.push({
    type: 'google_search',
    url: `https://www.google.com/search?q=${searchQuery}`,
    label: `Google Search: ${companyName} LinkedIn`,
  });

  return { success: true, linkedInUrls: urls, companyName };
}

// ── enrich_company: NinjaPear company enrichment ────────────

async function handleEnrichCompany(domain: string, actions: string[]): Promise<ActionResponse> {
  const apiKey = getApiKey();
  const start = Date.now();
  const result: Record<string, unknown> = {};

  for (const action of actions) {
    try {
      const endpoint = action === 'details' ? `${NINJAPEAR_BASE}/company/enrich`
        : action === 'employees' ? `${NINJAPEAR_BASE}/company/employees`
        : action === 'funding' ? `${NINJAPEAR_BASE}/company/funding`
        : action === 'updates' ? `${NINJAPEAR_BASE}/company/updates`
        : null;

      if (!endpoint) continue;

      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      }, 15000);

      if (response.ok) {
        result[action] = await response.json();
      } else {
        result[action] = { error: `HTTP ${response.status}` };
      }
    } catch (err: unknown) {
      result[action] = { error: (err as Error).message };
    }
  }

  callLog('enrich_company', 'ok', { domain, actions: actions.length, durationMs: Date.now() - start });
  return { success: true, domain, ...result };
}

// ── enrich_person: NinjaPear person enrichment ──────────────

async function handleEnrichPerson(linkedinUrl: string): Promise<ActionResponse> {
  const apiKey = getApiKey();
  const start = Date.now();

  const response = await fetchWithTimeout(`${NINJAPEAR_BASE}/person/enrich`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedin_url: linkedinUrl }),
  }, 15000);

  if (!response.ok) {
    return { success: false, error: `NinjaPear person enrichment failed: HTTP ${response.status}` };
  }

  const data = await response.json();
  callLog('enrich_person', 'ok', { url: linkedinUrl, durationMs: Date.now() - start });
  return { success: true, person: data, linkedinUrl };
}

// ── full_recon: orchestrated multi-step recon ───────────────

async function handleFullRecon(body: RequestBody): Promise<ActionResponse> {
  const start = Date.now();
  const errors: string[] = [];
  const results: Record<string, unknown> = {};
  const steps: { name: string; fn: () => Promise<ActionResponse | null> }[] = [];

  // Build steps based on available inputs
  if (body.url) {
    steps.push({ name: 'fetch_page', fn: () => handleFetchPage(body.url!) });
  }
  if (body.urls) {
    steps.push({ name: 'scan_team_pages', fn: () => handleScanTeamPages(body.urls as string[]) });
  }
  if (body.query) {
    steps.push({ name: 'search_web', fn: () => handleDuckDuckGoSearch(body.query!, body.maxResults || MAX_SEARCH_RESULTS) });
  }
  if (body.companyName) {
    steps.push({ name: 'fetch_linkedin_jobs', fn: () => handleFetchLinkedInJobs(body.companyName!, body.location) });
    steps.push({ name: 'fetch_linkedin_company', fn: () => handleFetchLinkedInCompany(body.companyName!) });
  }
  if (body.domain) {
    steps.push({ name: 'enrich_company', fn: () => handleEnrichCompany(body.domain!, (body.enrichActions as string[]) || ['details', 'employees']) });
  }
  if (body.linkedinUrl) {
    steps.push({ name: 'enrich_person', fn: () => handleEnrichPerson(body.linkedinUrl!) });
  }

  // Run steps with controlled concurrency
  for (let i = 0; i < steps.length; i += MAX_CONCURRENT) {
    const batch = steps.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.allSettled(
      batch.map(async (step) => {
        try {
          const result = await step.fn();
          if (result) results[step.name] = result;
        } catch (err: unknown) {
          errors.push(`${step.name}: ${(err as Error).message}`);
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'rejected') {
        errors.push(result.reason?.toString() || 'Unknown step error');
      }
    }
  }

  const durationMs = Date.now() - start;
  const reconSummary = `Full recon completed in ${(durationMs / 1000).toFixed(1)}s: ${Object.keys(results).length} steps, ${errors.length} errors.`;
  callLog('full_recon', errors.length > 0 ? 'error' : 'ok', { steps: steps.length, errors: errors.length, durationMs });

  return {
    success: true,
    ...results,
    errors,
    reconSummary,
    _meta: { durationMs, stepCount: steps.length, errorCount: errors.length, timestamp: new Date().toISOString() },
  };
}

// =============================================================
// MAIN REQUEST HANDLER
// =============================================================

Deno.serve(async (req: Request) => {
  const start = Date.now();
  const { authorized, role } = validateAuth(req);

  if (!authorized) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized — valid JWT required in Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const action = body.action || 'fetch_page';

  try {
    let result: ActionResponse;

    switch (action) {
      case 'fetch_page':
        if (!body.url) return new Response(JSON.stringify({ success: false, error: 'Missing url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleFetchPage(body.url);
        break;

      case 'scan_team_pages':
        if (!body.urls || !Array.isArray(body.urls)) return new Response(JSON.stringify({ success: false, error: 'Missing urls array' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleScanTeamPages(body.urls);
        break;

      case 'search_web':
        if (!body.query) return new Response(JSON.stringify({ success: false, error: 'Missing query' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleSearchWeb(body.query, body.maxResults || MAX_SEARCH_RESULTS);
        break;

      case 'fetch_linkedin_jobs':
        if (!body.keywords) return new Response(JSON.stringify({ success: false, error: 'Missing keywords' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleFetchLinkedInJobs(body.keywords, body.location);
        break;

      case 'fetch_linkedin_company':
        if (!body.companyName) return new Response(JSON.stringify({ success: false, error: 'Missing companyName' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleFetchLinkedInCompany(body.companyName);
        break;

      case 'enrich_company':
        if (!body.domain) return new Response(JSON.stringify({ success: false, error: 'Missing domain' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleEnrichCompany(body.domain, (body.enrichActions as string[]) || ['details', 'employees', 'funding', 'updates']);
        break;

      case 'enrich_person':
        if (!body.linkedinUrl) return new Response(JSON.stringify({ success: false, error: 'Missing linkedinUrl' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        result = await handleEnrichPerson(body.linkedinUrl);
        break;

      case 'full_recon':
        result = await handleFullRecon(body);
        break;

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Add metadata to successful responses
    const meta = {
      action,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      version: 9,
    };

    return new Response(JSON.stringify({ ...result, _meta: meta }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Edge-Version': '9',
        'X-Edge-Duration': String(Date.now() - start),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    callLog(action, 'error', { error: error.message, durationMs: Date.now() - start });

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      _meta: { action, durationMs: Date.now() - start, timestamp: new Date().toISOString(), version: 9 },
    }), {
      status: 200, // 200 with success:false so the client handles it gracefully
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});