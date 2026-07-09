// ============================================================
// Edge Request Manager — v1.0
// Concurrent request limiting, retry with backoff, circuit
// breaker, and structured logging for all Edge Function calls.
//
// Phase 2a power-up:
//   - p-limit-style concurrency (no extra dependency)
//   - Exponential backoff with jitter
//   - Circuit breaker (trips after N failures)
//   - Structured call tracking & analytics
// ============================================================

import { invokeEdgeFunction } from '../constants/config';

// ── Types ────────────────────────────────────────────────────

export interface CallRecord {
  functionName: string;
  action: string;
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  attempt: number;
  error?: string;
  timestamp: string;
}

export interface EdgeCallOptions {
  retries?: number;
  timeoutMs?: number;
  important?: boolean; // if true, retry harder
}

// ── Analytics buffer ─────────────────────────────────────────

const callLog: CallRecord[] = [];
const MAX_CALL_LOG = 200;

export function getCallLog(): CallRecord[] {
  return [...callLog];
}

export function getCallAnalytics() {
  const total = callLog.length;
  const errors = callLog.filter(c => c.status === 'error').length;
  const timeouts = callLog.filter(c => c.status === 'timeout').length;
  const byFunction = new Map<string, { calls: number; errors: number }>();
  for (const record of callLog) {
    const key = `${record.functionName}:${record.action}`;
    const entry = byFunction.get(key) || { calls: 0, errors: 0 };
    entry.calls++;
    if (record.status !== 'success') entry.errors++;
    byFunction.set(key, entry);
  }
  return { total, errors, timeouts, successRate: total > 0 ? ((total - errors - timeouts) / total * 100).toFixed(1) + '%' : 'N/A', byFunction: Array.from(byFunction.entries()).map(([k, v]) => ({ action: k, ...v })) };
}

function logCall(record: CallRecord) {
  callLog.push(record);
  if (callLog.length > MAX_CALL_LOG) callLog.shift();
}

// ── Simple semaphore (no external dependency) ────────────────

const pending = new Map<string, Promise<unknown>>();

export function getPendingCount(): number {
  return pending.size;
}

// ── Concurrency limiter ──────────────────────────────────────

interface QueueItem {
  fn: () => Promise<void>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const concurrencyQueues = new Map<string, QueueItem[]>();
const activeCounts = new Map<string, number>();

/**
 * Run async functions with a concurrency limit per key.
 * Key = 'edge-call' by default (all edge calls share one queue).
 */
export async function withConcurrencyLimit<T>(
  fn: () => Promise<T>,
  options?: { concurrency?: number; key?: string }
): Promise<T> {
  const key = options?.key || 'edge-call';
  const concurrency = options?.concurrency || 5;
  const current = activeCounts.get(key) || 0;

  if (current < concurrency) {
    activeCounts.set(key, current + 1);
    try {
      return await fn();
    } finally {
      activeCounts.set(key, (activeCounts.get(key) || 1) - 1);
      processQueue(key);
    }
  }

  // Queue it
  return new Promise<T>((resolve, reject) => {
    const queue = concurrencyQueues.get(key) || [];
    queue.push({ fn: fn as unknown as () => Promise<void>, resolve: resolve as (value: unknown) => void, reject });
    concurrencyQueues.set(key, queue);
  });
}

function processQueue(key: string) {
  const queue = concurrencyQueues.get(key);
  if (!queue || queue.length === 0) return;
  const current = activeCounts.get(key) || 0;
  const concurrency = 5;
  const slots = concurrency - current;
  for (let i = 0; i < slots && queue.length > 0; i++) {
    const item = queue.shift()!;
    activeCounts.set(key, (activeCounts.get(key) || 1) + 1);
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeCounts.set(key, (activeCounts.get(key) || 1) - 1);
        processQueue(key);
      });
  }
  if (queue.length === 0) concurrencyQueues.delete(key);
}

// ── Exponential backoff ──────────────────────────────────────

function backoffDelay(attempt: number, baseMs = 1000): number {
  const exponential = baseMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, 15000); // max 15s
}

// ── Circuit breaker ──────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuits = new Map<string, CircuitState>();
const THRESHOLD = 5;  // open after 5 failures
const RESET_MS = 30000; // try closing after 30s

function checkCircuit(key: string): boolean {
  const circuit = circuits.get(key);
  if (!circuit || !circuit.isOpen) return true; // closed, allow
  if (Date.now() - circuit.lastFailure > RESET_MS) {
    // Half-open: allow one request through
    circuit.isOpen = false;
    circuit.failures = 0;
    return true;
  }
  return false; // open, reject fast
}

function recordSuccess(key: string) {
  circuits.delete(key);
}

function recordFailure(key: string) {
  const circuit = circuits.get(key) || { failures: 0, lastFailure: 0, isOpen: false };
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= THRESHOLD) {
    circuit.isOpen = true;
    console.warn(`[EdgeRequestManager] ⛔ Circuit OPEN for ${key} (${circuit.failures} failures)`);
  }
  circuits.set(key, circuit);
}

export function getCircuitStatus(): { key: string; isOpen: boolean; failures: number }[] {
  return Array.from(circuits.entries()).map(([key, state]) => ({
    key, isOpen: state.isOpen, failures: state.failures,
  }));
}

// ── Smart edge call with retry, backoff, circuit breaker ────

export async function smartEdgeCall<T = unknown>(
  functionName: string,
  body: Record<string, unknown>,
  options: EdgeCallOptions = {}
): Promise<{ data: T | null; error: string | null; attempts: number; durationMs: number }> {
  const action = (body.action as string) || 'default';
  const circuitKey = `${functionName}:${action}`;
  const maxRetries = options.retries ?? (options.important ? 3 : 2);
  const startTime = Date.now();
  let lastError: string | null = null;
  let attempts = 0;

  // Check circuit breaker
  if (!checkCircuit(circuitKey)) {
    const durationMs = Date.now() - startTime;
    logCall({ functionName, action, status: 'error', durationMs, attempt: 0, error: 'Circuit breaker open', timestamp: new Date().toISOString() });
    console.warn(`[EdgeRequestManager] ⛔ Circuit breaker open for ${circuitKey} — rejecting fast`);
    return { data: null, error: `Circuit breaker open for ${circuitKey}. Try again later.`, attempts: 0, durationMs };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    try {
      // Timeout handling via AbortController
      const timeoutMs = options.timeoutMs ?? 15000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const result = await invokeEdgeFunction<T>(functionName, body, controller.signal);
      clearTimeout(timeoutId);

      if (result.error) {
        lastError = result.error;
        if (attempt < maxRetries) {
          const delay = backoffDelay(attempt);
          console.warn(`[EdgeRequestManager] Retry ${attempt}/${maxRetries} for ${circuitKey} in ${delay}ms: ${result.error}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      } else {
        // Success
        const durationMs = Date.now() - startTime;
        logCall({ functionName, action, status: 'success', durationMs, attempt, timestamp: new Date().toISOString() });
        recordSuccess(circuitKey);
        return { data: result.data, error: null, attempts, durationMs };
      }
    } catch (err: unknown) {
      const error = err as Error;
      const isTimeout = error.name === 'AbortError';
      lastError = isTimeout ? `Timeout after ${options.timeoutMs || 15000}ms` : error.message;

      if (isTimeout || attempt < maxRetries) {
        const delay = backoffDelay(attempt);
        if (isTimeout) {
          console.warn(`[EdgeRequestManager] ⏱️ Timeout ${attempt}/${maxRetries} for ${circuitKey}, retrying in ${delay}ms`);
        } else {
          console.warn(`[EdgeRequestManager] ⚠️ Error ${attempt}/${maxRetries} for ${circuitKey}: ${lastError}, retrying in ${delay}ms`);
        }
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  const durationMs = Date.now() - startTime;
  recordFailure(circuitKey);
  logCall({ functionName, action, status: 'error', durationMs, attempt: attempts, error: lastError || 'Max retries exceeded', timestamp: new Date().toISOString() });
  console.error(`[EdgeRequestManager] ✗ ${circuitKey} failed after ${attempts} attempts: ${lastError}`);
  return { data: null, error: lastError || `Failed after ${attempts} attempts`, attempts, durationMs };
}

// ── Batch executor with concurrency ─────────────────────────

export async function runBatched<T>(
  items: T[],
  handler: (item: T, index: number) => Promise<void>,
  options?: { batchSize?: number; label?: string }
): Promise<{ processed: number; errors: number; errorDetails: string[] }> {
  const batchSize = options?.batchSize || 5;
  const label = options?.label || 'batch';
  let processed = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  console.log(`[EdgeRequestManager] 📦 Running ${label}: ${items.length} items in batches of ${batchSize}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIdx) => handler(item, i + batchIdx))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        processed++;
      } else {
        errors++;
        errorDetails.push(result.reason?.toString() || 'Unknown error');
      }
    }

    console.log(`[EdgeRequestManager] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}: ${processed} done, ${errors} errors`);
  }

  return { processed, errors, errorDetails };
}
