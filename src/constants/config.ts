// ============================================================
// App Configuration — Frontend-safe Supabase & API config
// ============================================================

export const SUPABASE_URL = 'https://fugmunrrwewyvghdlgnp.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Z211bnJyd2V3eXZnaGRsZ25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDY0MTYsImV4cCI6MjA5NzgyMjQxNn0.dIIrIY9M_xffmqZb6fYWQpLqTjPHJqGwLv1FVwceUeI';
/**
 * The Supabase Edge Function that proxies requests to NinjaPear API.
 */
export const NINJAPEAR_PROXY_FUNCTION = 'ninjapear-proxy';

/**
 * Standalone server-side fetch Edge Function — simple HTTP fetch
 * with no NinjaPear dependency. Used as the first attempt in the
 * fetch chain before falling back to NinjaPear or browser fetch.
 */
export const FETCH_PUBLIC_URL_FUNCTION = 'fetch-public-url';

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return { data: data as T, error: null };
  } catch (err: unknown) {
    const error = err as Error;
    // Re-throw AbortError so smartEdgeCall can handle timeouts
    if (error.name === 'AbortError') throw error;
    return { data: null, error: error.message || 'Failed to invoke edge function' };
  }
}
