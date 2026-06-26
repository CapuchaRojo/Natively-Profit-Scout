// ============================================================
// Social Discovery Engine — v1.0
// Discovers company social/professional profiles via web search.
// Finds Twitter/X, GitHub, Crunchbase, YouTube, LinkedIn, blog,
// Glassdoor, G2, and other public profiles.
//
// Uses the proxy's search_web action to find canonical profile
// URLs for each platform. No login, no scraping of private data.
// ============================================================

import type { ConfidenceLevel } from '../types';
import type { WebSearchResult } from './reconApiClient';

// ── Output types ──────────────────────────────────────────────

export interface SocialFootprint {
  twitter?: string;
  github?: string;
  crunchbase?: string;
  youtube?: string;
  linkedin_company?: string;
  blog?: string;
  facebook?: string;
  instagram?: string;
  glassdoor?: string;
  g2?: string;
}

export interface SocialDiscoveryUrl {
  platform: string;
  url: string;
  confidence: ConfidenceLevel;
  evidence: string;
}

export interface SocialDiscoveryResult {
  footprint: SocialFootprint;
  discoveredUrls: SocialDiscoveryUrl[];
  summary: string;
  errors: string[];
}

// ── Platform search configurations ───────────────────────────

interface PlatformConfig {
  platform: string;
  domains: string[];
  /** Path patterns that indicate a company profile (not a random page) */
  pathPatterns: RegExp[];
  /** Minimum confidence if we find a match on this platform */
  baseConfidence: ConfidenceLevel;
  /** How to extract/clean the URL for this platform */
  normalize?: (url: string) => string;
}

const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: 'Twitter/X',
    domains: ['twitter.com', 'x.com'],
    pathPatterns: [/^\/[A-Za-z0-9_]{1,15}$/],
    baseConfidence: 'High',
    normalize: (url: string) => {
      // Ensure we get the canonical x.com or twitter.com handle URL
      try {
        const u = new URL(url);
        const handle = u.pathname.split('/')[1];
        if (handle && handle.length <= 15) {
          return `https://x.com/${handle}`;
        }
      } catch {}
      return url;
    },
  },
  {
    platform: 'GitHub',
    domains: ['github.com'],
    pathPatterns: [/^\/[A-Za-z0-9._-]+$/, /^\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/],
    baseConfidence: 'High',
    normalize: (url: string) => {
      // Keep the org or org/repo URL
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 1) {
          return `https://github.com/${parts[0]}`;
        }
      } catch {}
      return url;
    },
  },
  {
    platform: 'Crunchbase',
    domains: ['crunchbase.com'],
    pathPatterns: [/^\/organization\/[A-Za-z0-9-]+$/],
    baseConfidence: 'High',
  },
  {
    platform: 'YouTube',
    domains: ['youtube.com', 'youtube.com'],
    pathPatterns: [/^\/@[A-Za-z0-9_-]+$/, /^\/channel\/[A-Za-z0-9_-]+$/, /^\/c\/[A-Za-z0-9_-]+$/],
    baseConfidence: 'Medium',
  },
  {
    platform: 'LinkedIn Company',
    domains: ['linkedin.com'],
    pathPatterns: [/^\/company\/[A-Za-z0-9-]+$/],
    baseConfidence: 'High',
    normalize: (url: string) => {
      try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0] === 'company' && parts[1]) {
          return `https://www.linkedin.com/company/${parts[1]}`;
        }
      } catch {}
      return url;
    },
  },
  {
    platform: 'Facebook',
    domains: ['facebook.com'],
    pathPatterns: [/^\/[A-Za-z0-9.]+$/, /^\/pg\/[A-Za-z0-9.]+$/],
    baseConfidence: 'Medium',
  },
  {
    platform: 'Instagram',
    domains: ['instagram.com'],
    pathPatterns: [/^\/[A-Za-z0-9._]+$/],
    baseConfidence: 'Medium',
  },
  {
    platform: 'Glassdoor',
    domains: ['glassdoor.com'],
    pathPatterns: [/^\/Overview\/[A-Za-z0-9-]+/i, /^\/Reviews\/[A-Za-z0-9-]+/i],
    baseConfidence: 'High',
  },
  {
    platform: 'G2',
    domains: ['g2.com'],
    pathPatterns: [/^\/products\/[A-Za-z0-9-]+\/reviews$/i],
    baseConfidence: 'High',
  },
];

// ── Search queries for each platform ─────────────────────────

interface PlatformSearchQuery {
  platform: string;
  query: (companyName: string) => string;
  /** Filter to only URLs from these domains */
  filterDomains: string[];
}

const PLATFORM_SEARCHES: PlatformSearchQuery[] = [
  {
    platform: 'Twitter/X',
    query: (c) => `"${c}" Twitter`,
    filterDomains: ['twitter.com', 'x.com'],
  },
  {
    platform: 'GitHub',
    query: (c) => `"${c}" GitHub`,
    filterDomains: ['github.com'],
  },
  {
    platform: 'Crunchbase',
    query: (c) => `"${c}" Crunchbase`,
    filterDomains: ['crunchbase.com'],
  },
  {
    platform: 'YouTube',
    query: (c) => `"${c}" YouTube`,
    filterDomains: ['youtube.com'],
  },
  {
    platform: 'LinkedIn Company',
    query: (c) => `"${c}" LinkedIn`,
    filterDomains: ['linkedin.com'],
  },
  {
    platform: 'Facebook',
    query: (c) => `"${c}" Facebook`,
    filterDomains: ['facebook.com'],
  },
  {
    platform: 'Instagram',
    query: (c) => `"${c}" Instagram`,
    filterDomains: ['instagram.com'],
  },
  {
    platform: 'Glassdoor',
    query: (c) => `"${c}" Glassdoor`,
    filterDomains: ['glassdoor.com'],
  },
  {
    platform: 'G2',
    query: (c) => `"${c}" G2`,
    filterDomains: ['g2.com'],
  },
];

// ── Blog-specific search ─────────────────────────────────────

const BLOG_SEARCH_QUERIES = [
  (c: string) => `"${c}" blog`,
  (c: string) => `"${c}" resources insights`,
  (c: string) => `"${c}" newsroom`,
];

// Common blog path indicators
const BLOG_PATH_PATTERNS = [
  /\/blog/i,
  /\/resources/i,
  /\/insights/i,
  /\/articles/i,
  /\/posts/i,
  /\/news/i,
  /\/newsroom/i,
  /\/updates/i,
  /\/learn/i,
  /\/stories/i,
  /\/journal/i,
  /\/thinking/i,
  /\/ideas/i,
];

// ── URL normalization utilities ──────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove tracking params, fragments
    u.searchParams.forEach((_v, k) => {
      if (k.startsWith('utm_') || k === 'ref' || k === 'source' || k === 'fbclid' || k === 'gclid') {
        u.searchParams.delete(k);
      }
    });
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

// ── Slugify company name for URL matching ────────────────────

function slugifyCompany(name: string): string[] {
  const lower = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim();
  const words = lower.split(/\s+/);

  return [
    // Full slug: "acme-corporation"
    lower.replace(/\s+/g, '-'),
    // First word: "acme"
    words[0] || '',
    // Abbreviated: "acmecorp"
    words.join(''),
    // No spaces: "acmecorporation"
    lower.replace(/\s+/g, ''),
    // First two words: "acme-corporation"
    words.slice(0, 2).join('-'),
    // CamelCase: "AcmeCorporation"
    name.replace(/[^a-zA-Z0-9]/g, ''),
  ].filter(s => s.length >= 2);
}

// ── Match URL to platform ────────────────────────────────────

function matchPlatformUrl(
  url: string,
  config: PlatformConfig,
  companySlugs: string[]
): { url: string; confidence: ConfidenceLevel } | null {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '').toLowerCase();

    // Check if domain matches
    const domainMatch = config.domains.some(d => domain === d || domain.endsWith('.' + d));
    if (!domainMatch) return null;

    // Check path patterns
    const path = parsed.pathname;
    const pathMatches = config.pathPatterns.some(p => p.test(path));
    if (!pathMatches) return null;

    // Check if the URL path contains the company slug
    const pathLower = path.toLowerCase();
    const slugMatch = companySlugs.some(slug => pathLower.includes(slug));
    
    // Apply normalization if available
    const finalUrl = config.normalize ? config.normalize(url) : normalizeUrl(url);

    const confidence: ConfidenceLevel = slugMatch
      ? config.baseConfidence
      : config.baseConfidence === 'High' ? 'Medium' : 'Low';

    return { url: finalUrl, confidence };
  } catch {
    return null;
  }
}

// ── Extract blog URL from search results ─────────────────────

function extractBlogUrl(
  results: WebSearchResult[],
  companyDomain: string
): { url: string; confidence: ConfidenceLevel } | null {
  // Strategy 1: Look for results from the company's own domain with blog paths
  for (const result of results) {
    try {
      const domain = extractDomain(result.url);
      if (!domain) continue;
      
      // Must be from the company's own domain
      if (domain !== companyDomain && !domain.endsWith('.' + companyDomain)) {
        continue;
      }

      const path = new URL(result.url).pathname.toLowerCase();
      const isBlogPath = BLOG_PATH_PATTERNS.some(p => p.test(path));
      if (isBlogPath) {
        // Extract the blog root URL
        const rootUrl = new URL(result.url);
        for (const pattern of BLOG_PATH_PATTERNS) {
          const match = path.match(pattern);
          if (match) {
            rootUrl.pathname = path.slice(0, match.index! + match[0].length);
            return {
              url: normalizeUrl(rootUrl.toString()),
              confidence: 'High',
            };
          }
        }
      }
    } catch {}
  }

  // Strategy 2: Look for common blog paths on the company domain
  const commonBlogPaths = ['/blog', '/resources', '/insights', '/articles', '/news', '/newsroom', '/updates', '/learn'];
  for (const result of results) {
    try {
      const domain = extractDomain(result.url);
      if (!domain || domain !== companyDomain) continue;
      
      const path = new URL(result.url).pathname.toLowerCase();
      for (const blogPath of commonBlogPaths) {
        if (path.startsWith(blogPath)) {
          return {
            url: normalizeUrl(`https://${companyDomain}${blogPath}`),
            confidence: 'Medium',
          };
        }
      }
    } catch {}
  }

  return null;
}

// ── Main discovery function ──────────────────────────────────

/**
 * Discover social profiles for a company by searching the web.
 * Uses the provided search function (searchWebViaBackend) to find
 * canonical profile URLs on each platform.
 *
 * @param companyName - The company name to search for
 * @param companyWebsite - The company's website (for domain-based filtering)
 * @param searchFn - The search function to use (typically searchWebViaBackend)
 * @param options - Optional configuration
 */
export async function discoverSocialFootprint(
  companyName: string,
  companyWebsite: string,
  searchFn: (query: string, maxResults?: number) => Promise<{ success: boolean; results: WebSearchResult[]; message: string }>,
  options?: {
    skipPlatforms?: string[];
    maxResultsPerQuery?: number;
  }
): Promise<SocialDiscoveryResult> {
  const companySlugs = slugifyCompany(companyName);
  const companyDomain = (() => {
    try {
      const url = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  })();

  const discoveredUrls: SocialDiscoveryUrl[] = [];
  const errors: string[] = [];
  const skip = new Set(options?.skipPlatforms?.map(s => s.toLowerCase()) || []);
  const maxResults = options?.maxResultsPerQuery || 5;

  // ── Run platform searches ──────────────────────────────────
  for (const search of PLATFORM_SEARCHES) {
    if (skip.has(search.platform.toLowerCase())) continue;

    try {
      const query = search.query(companyName);
      const result = await searchFn(query, maxResults);

      if (!result.success || !result.results.length) {
        continue;
      }

      // Find the platform config for this search
      const config = PLATFORM_CONFIGS.find(c => c.platform.toLowerCase() === search.platform.toLowerCase());
      if (!config) continue;

      // Filter results to only those from the target domains
      const domainResults = result.results.filter(r => {
        const domain = extractDomain(r.url);
        return search.filterDomains.some(d => domain === d || domain.endsWith('.' + d));
      });

      // Try to match each result to the platform
      let bestMatch: { url: string; confidence: ConfidenceLevel; evidence: string } | null = null;

      for (const r of domainResults) {
        const match = matchPlatformUrl(r.url, config, companySlugs);
        if (match) {
          const evidence = `Found via search "${query}": "${r.title}" — ${r.snippet.slice(0, 120)}`;
          if (!bestMatch || (match.confidence === 'High' && bestMatch.confidence !== 'High')) {
            bestMatch = { ...match, evidence };
          }
          // Also add as a discovered URL (non-primary matches)
          if (bestMatch && match.url !== bestMatch.url) {
            discoveredUrls.push({
              platform: config.platform,
              url: match.url,
              confidence: 'Low',
              evidence,
            });
          }
        }
      }

      if (bestMatch) {
        discoveredUrls.push({
          platform: config.platform,
          url: bestMatch.url,
          confidence: bestMatch.confidence,
          evidence: bestMatch.evidence,
        });
      }
    } catch (err) {
      errors.push(`Failed to discover ${search.platform}: ${String(err)}`);
    }
  }

  // ── Blog discovery ─────────────────────────────────────────
  if (!skip.has('blog')) {
    try {
      // Search for blog using company website domain
      const blogQuery = `site:${companyDomain} blog`;
      const blogResult = await searchFn(blogQuery, maxResults);
      
      let blogUrl: { url: string; confidence: ConfidenceLevel } | null = null;

      if (blogResult.success && blogResult.results.length > 0) {
        blogUrl = extractBlogUrl(blogResult.results, companyDomain);
      }

      // If still no blog, try broader searches
      if (!blogUrl) {
        for (const queryFn of BLOG_SEARCH_QUERIES) {
          const query = queryFn(companyName);
          const result = await searchFn(query, maxResults);
          if (result.success && result.results.length > 0) {
            blogUrl = extractBlogUrl(result.results, companyDomain);
            if (blogUrl) break;
          }
        }
      }

      if (blogUrl) {
        discoveredUrls.push({
          platform: 'Blog',
          url: blogUrl.url,
          confidence: blogUrl.confidence,
          evidence: `Discovered blog URL from web search results.`,
        });
      }
    } catch (err) {
      errors.push(`Failed to discover blog: ${String(err)}`);
    }
  }

  // ── Build footprint ────────────────────────────────────────
  const footprint: SocialFootprint = {};

  for (const d of discoveredUrls) {
    if (d.confidence === 'Low') continue; // Only high/medium confidence in footprint
    switch (d.platform) {
      case 'Twitter/X': footprint.twitter = d.url; break;
      case 'GitHub': footprint.github = d.url; break;
      case 'Crunchbase': footprint.crunchbase = d.url; break;
      case 'YouTube': footprint.youtube = d.url; break;
      case 'LinkedIn Company': footprint.linkedin_company = d.url; break;
      case 'Facebook': footprint.facebook = d.url; break;
      case 'Instagram': footprint.instagram = d.url; break;
      case 'Glassdoor': footprint.glassdoor = d.url; break;
      case 'G2': footprint.g2 = d.url; break;
      case 'Blog': footprint.blog = d.url; break;
    }
  }

  // ── Build summary ──────────────────────────────────────────
  const foundPlatforms = Object.entries(footprint)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => k.replace(/_/g, ' '));

  const highConfidence = discoveredUrls.filter(d => d.confidence === 'High').length;
  const mediumConfidence = discoveredUrls.filter(d => d.confidence === 'Medium').length;

  const summary = foundPlatforms.length > 0
    ? `Discovered ${foundPlatforms.length} social profiles: ${foundPlatforms.join(', ')}. (${highConfidence} high, ${mediumConfidence} medium confidence).`
    : `No social profiles discovered for ${companyName}. Try verifying the company name or searching manually.`;

  return {
    footprint,
    discoveredUrls,
    summary,
    errors,
  };
}

// ── Synchronous helper: generate candidate URLs ──────────────

/**
 * Generate candidate profile URLs without executing any searches.
 * Useful for pre-populating the UI with "likely" URLs before
 * the async discovery runs.
 */
export function generateCandidateUrls(
  companyName: string,
  companyWebsite: string
): SocialDiscoveryUrl[] {
  const candidates: SocialDiscoveryUrl[] = [];
  const slugs = slugifyCompany(companyName);
  const primarySlug = slugs[0]; // "acme-corporation"

  // Twitter: try the company name as a handle
  const twitterHandle = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
  if (twitterHandle.length >= 3) {
    candidates.push({
      platform: 'Twitter/X',
      url: `https://x.com/${twitterHandle}`,
      confidence: 'Low',
      evidence: `Generated candidate from company name "${companyName}".`,
    });
  }

  // GitHub: try org slug
  if (primarySlug.length >= 2) {
    candidates.push({
      platform: 'GitHub',
      url: `https://github.com/${primarySlug}`,
      confidence: 'Low',
      evidence: `Generated candidate from company slug.`,
    });
  }

  // LinkedIn: try company slug
  if (primarySlug.length >= 2) {
    candidates.push({
      platform: 'LinkedIn Company',
      url: `https://www.linkedin.com/company/${primarySlug}`,
      confidence: 'Low',
      evidence: `Generated candidate from company slug.`,
    });
  }

  // Crunchbase: try organization slug
  if (primarySlug.length >= 2) {
    candidates.push({
      platform: 'Crunchbase',
      url: `https://www.crunchbase.com/organization/${primarySlug}`,
      confidence: 'Low',
      evidence: `Generated candidate from company slug.`,
    });
  }

  // YouTube: try channel handle
  const ytHandle = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
  if (ytHandle.length >= 3) {
    candidates.push({
      platform: 'YouTube',
      url: `https://www.youtube.com/@${ytHandle}`,
      confidence: 'Low',
      evidence: `Generated candidate from company name.`,
    });
  }

  // Blog: try common paths on the company domain
  try {
    const domain = companyWebsite.startsWith('http')
      ? new URL(companyWebsite).hostname.replace(/^www\./, '')
      : companyWebsite;
    const baseUrl = `https://${domain}`;
    const blogPaths = ['/blog', '/resources', '/insights', '/news', '/articles'];
    for (const path of blogPaths) {
      candidates.push({
        platform: 'Blog',
        url: `${baseUrl}${path}`,
        confidence: 'Low',
        evidence: `Generated candidate — common blog path on company domain.`,
      });
    }
  } catch {
    // Invalid website URL, skip
  }

  return candidates;
}

// ── Format for CRM brief ─────────────────────────────────────

export function formatSocialForCrmBrief(
  footprint: SocialFootprint,
  companyName: string
): string[] {
  const lines: string[] = [];
  lines.push('SOCIAL & REVIEW PROFILES');
  lines.push('='.repeat(40));

  const entries: [string, string | undefined][] = [
    ['LinkedIn', footprint.linkedin_company],
    ['Twitter/X', footprint.twitter],
    ['GitHub', footprint.github],
    ['Crunchbase', footprint.crunchbase],
    ['YouTube', footprint.youtube],
    ['Blog', footprint.blog],
    ['Facebook', footprint.facebook],
    ['Instagram', footprint.instagram],
    ['Glassdoor', footprint.glassdoor],
    ['G2', footprint.g2],
  ];

  let found = 0;
  for (const [label, url] of entries) {
    if (url) {
      lines.push(`  ${label}: ${url}`);
      found++;
    }
  }

  if (found === 0) {
    lines.push(`  No social profiles discovered for ${companyName}.`);
  }

  return lines;
}

// ── Merge candidates with discovered results ─────────────────

/**
 * Merge manually verified/generated candidates with discovered results.
 * Discovered URLs with High confidence take priority over candidates.
 */
export function mergeWithCandidates(
  discovered: SocialDiscoveryUrl[],
  candidates: SocialDiscoveryUrl[]
): SocialDiscoveryUrl[] {
  const merged = new Map<string, SocialDiscoveryUrl>();

  // Add candidates first (lower priority)
  for (const c of candidates) {
    const key = `${c.platform}:${c.url}`;
    merged.set(key, c);
  }

  // Override with discovered (higher priority for High/Medium confidence)
  for (const d of discovered) {
    const platformKey = d.platform;
    // Remove any candidate for this platform
    for (const [key, value] of merged) {
      if (value.platform === platformKey && value.confidence === 'Low') {
        merged.delete(key);
      }
    }
    merged.set(`${d.platform}:${d.url}`, d);
  }

  return Array.from(merged.values());
}