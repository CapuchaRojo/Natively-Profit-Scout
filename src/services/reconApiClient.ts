// ============================================================
// Recon API Client — Backend Proxy Placeholder
// Future: replace with real backend calls
// ============================================================

export interface BackendScanResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Scan a single URL via backend proxy.
 * Currently returns "not configured" — implement when backend is ready.
 */
export async function scanUrlViaBackend(url: string): Promise<BackendScanResponse> {
  console.warn('[ReconApiClient] Backend scanner not configured. Called with:', url);
  return {
    success: false,
    message: 'Backend scanner not configured. Configure in Settings or use browser fetch / manual paste.',
  };
}

/**
 * Scan an entire domain via backend proxy.
 * Currently returns "not configured" — implement when backend is ready.
 */
export async function scanDomainViaBackend(domain: string): Promise<BackendScanResponse> {
  console.warn('[ReconApiClient] Backend scanner not configured. Called with:', domain);
  return {
    success: false,
    message: 'Backend scanner not configured. Configure in Settings or use browser fetch / manual paste.',
  };
}

/**
 * Enrich company data via backend proxy.
 * Currently returns "not configured" — implement when backend is ready.
 */
export async function enrichCompanyViaBackend(
  companyName: string,
  website: string
): Promise<BackendScanResponse> {
  console.warn('[ReconApiClient] Backend scanner not configured. Called with:', companyName, website);
  return {
    success: false,
    message: 'Backend scanner not configured. Configure in Settings or use browser fetch / manual paste.',
  };
}
