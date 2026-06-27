// ============================================================
// DataSync — Supabase <-> localStorage bidirectional persistence
// All operations are scoped to the current authenticated user.
// ============================================================
import { supabase } from './supabaseClient';
import type { Company, AppSettings } from '../types';

// ============================================================
// Helpers
// ============================================================

async function requireUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Not authenticated — cannot perform data operation');
  }
  return session.user.id;
}

// ============================================================
// Companies CRUD
// ============================================================

export interface CompanyRow {
  id: string;
  company_name: string;
  website: string;
  account_type: string;
  product_lane: string;
  pipeline_status: string;
  priority: string;
  owner: string;
  fit_score_total: number;
  data: Company;
  created_at: string;
  updated_at: string;
}

function flattenCompany(c: Company): Omit<CompanyRow, 'created_at' | 'updated_at'> {
  return {
    id: c.id,
    company_name: c.basic?.name || '',
    website: c.basic?.website || '',
    account_type: c.accountType || 'unknown',
    product_lane: c.productLane || 'unknown',
    pipeline_status: c.pipelineStatus || 'new',
    priority: c.priority || 'unset',
    owner: c.owner || '',
    fit_score_total: c.fitScore?.total ?? 0,
    data: c,
  };
}

export async function loadAllCompanies(): Promise<Company[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('companies')
    .select('data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[DataSync] Failed to load companies:', error);
    return [];
  }

  return (data || []).map((row: { data: Company }) => row.data);
}

export async function upsertCompany(company: Company): Promise<void> {
  const userId = await requireUserId();
  const row = flattenCompany(company);
  const { error } = await supabase.from('companies').upsert(
    { ...row, user_id: userId, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('[DataSync] Failed to upsert company:', error);
  }
}

export async function deleteCompanyFromDb(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('companies').delete().eq('id', id).eq('user_id', userId);
  if (error) {
    console.error('[DataSync] Failed to delete company:', error);
  }
}

export async function upsertAllCompanies(companies: Company[]): Promise<void> {
  if (companies.length === 0) return;
  const userId = await requireUserId();

  const rows = companies.map(c => ({
    ...flattenCompany(c),
    user_id: userId,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in chunks of 50 to avoid payload size issues
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('companies').upsert(chunk, {
      onConflict: 'id',
    });
    if (error) {
      console.error('[DataSync] Failed to upsert companies chunk:', error);
    }
  }
}

// ============================================================
// Settings
// ============================================================

export async function loadSettings(): Promise<AppSettings | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 'default')
    .eq('user_id', userId)
    .single();

  if (error) {
    // PGRST116 means no row found — that's OK for first run
    if (error.code !== 'PGRST116') {
      console.error('[DataSync] Failed to load settings:', error);
    }
    return null;
  }

  return (data?.data as AppSettings) || null;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('settings').upsert(
    { id: 'default', user_id: userId, data: settings, updated_at: new Date().toISOString() },
    { onConflict: 'id, user_id' }
  );

  if (error) {
    console.error('[DataSync] Failed to save settings:', error);
  }
}

// ============================================================
// Full sync helpers
// ============================================================

/**
 * Check if Supabase is reachable by doing a lightweight query.
 */
export async function isSupabaseReachable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('companies').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}