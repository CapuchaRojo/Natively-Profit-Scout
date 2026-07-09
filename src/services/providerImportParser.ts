// ============================================================
// Natively Profit Scout — Provider Import Parser Service
// ============================================================
// Handles parsing .xlsm/.xlsx workbooks and transforming rows
// into Company records for the bulk provider import flow.

import * as XLSX from 'xlsx';
import type { Company, ProviderContact, AccountType, ProductLane, PipelineStatus, ProviderType } from '../types';

// ── Workbook Row Types ──────────────────────────────────────

export interface ParsedRow {
  company: string;
  name1: string;
  surname1: string;
  position1: string;
  email1: string;
  name2: string;
  surname2: string;
  position2: string;
  email2: string;
  relationshipNote: string;
  owner: string;
  phone: string;
  linkedInProfile: string;
  type: string;
  owner2: string;
  priority: string;
  status: string;
  website: string;
  contactUrl: string;
  sourceUrl: string;
  notes: string;
  lastChecked: string;
}

export interface ImportWarning {
  rowIndex: number;
  companyName: string;
  warningType: string;
  fieldValue: string;
}

export interface ImportResult {
  row: ParsedRow;
  company: Company;
  action: 'create' | 'update' | 'skip';
  warnings: ImportWarning[];
}

export interface ImportStats {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  contactsCreated: number;
  warnings: number;
}

// ── Constants ───────────────────────────────────────────────

const SOURCE_IMPORT_TAG = 'willem_provider_list_2026_06_29';
const SHEET_NAMES = ['Providers', 'providers', 'PROVIDERS'];

const LEGAL_SUFFIXES = [
  'Inc.', 'Inc', 'LLC', 'Ltd.', 'Ltd', 'Corp.', 'Corp',
  'GmbH', 'SAS', 'S.R.L.', 'B.V.', 'PLC', 'Pty Ltd',
  'Limited', 'Incorporated',
];

const PROVIDER_TYPE_MAP: Record<string, ProviderType> = {
  'chip manufacturer': 'chip_manufacturer',
  hyperscaler: 'hyperscaler',
  'neo cloud': 'neo_cloud',
  'gpu provider': 'gpu_provider',
  'data center': 'data_center',
  'cloud partner': 'cloud_partner',
  'edge compute': 'edge_compute',
  'hardware partner': 'hardware_partner',
  'infrastructure reseller': 'infrastructure_reseller',
};

const PRIORITY_MAP: Record<string, Company['priority']> = {
  'tier 1': 'high',
  'tier 2': 'medium',
  'tier 3': 'low',
};

// ── Helpers ─────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeEmptyCompany(overrides: Partial<Company> = {}): Company {
  const now = new Date().toISOString();
  return {
    id: generateId('company'),
    basic: { name: '', website: '', industry: '', location: '', employeeCount: 0, revenueEstimate: '', notes: '' },
    business: { productsServices: '', targetCustomers: '', salesModel: '', deliveryModel: '', supportModel: '', operationsModel: '' },
    people: { leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '', supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '', unknownDecisionMaker: '' },
    tools: { crm: '', websitePlatform: '', schedulingTools: '', emailTools: '', projectManagement: '', communicationTools: '', supportTools: '', billingTools: '', automationTools: '', aiTools: '', securityTools: '', unknownTools: '' },
    workloadFriction: { dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '', employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '', softwareCouldAssist: '' },
    salesContext: { approachReason: '', likelyBusinessPain: '', desiredResult: '', budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '' },
    painPoints: [],
    stakeholders: [],
    toolMap: [],
    highladerRepurpose: [],
    opportunities: [],
    publicIntelSources: [],
    publicIntelSignals: [],
    publicIntelOpenings: [],
    accountType: 'compute_provider' as AccountType,
    productLane: 'compute' as ProductLane,
    pipelineStatus: 'new' as PipelineStatus,
    owner: '',
    priority: 'unset',
    nextAction: '',
    nextActionDate: '',
    lastContactedAt: '',
    sourceCampaign: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    hubspotLifecycleStage: '',
    hubspotDealStage: '',
    comments: [],
    sourceImport: SOURCE_IMPORT_TAG,
    importedAt: now,
    contacts: [],
    verifiedStatus: 'unknown',
    isSample: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Workbook Parsing ────────────────────────────────────────

/**
 * Parse a .xlsm or .xlsx file and return an array of ParsedRow objects.
 * Looks for a sheet named "Providers" (case-insensitive) with data starting at row 6.
 */
export async function parseWorkbookFile(file: File): Promise<ParsedRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

  // Find the Providers sheet (case-insensitive)
  const sheetName = SHEET_NAMES.find((n) => workbook.SheetNames.includes(n))
    || workbook.SheetNames.find((n) => n.toLowerCase() === 'providers');

  if (!sheetName) {
    const sheetList = workbook.SheetNames.map(s => `"${s}"`).join(', ');
    const hint = workbook.SheetNames.length === 1 && workbook.SheetNames[0] !== 'Providers'
      ? `\n\nTo fix: Rename the sheet "${workbook.SheetNames[0]}" to "Providers" (capital P) in your spreadsheet app, then upload again.`
      : `\n\nTo fix: Rename one of your sheets to "Providers" (capital P) in your spreadsheet app, then upload again.`;
    throw new Error(
      `Sheet "Providers" not found.\n\nYour workbook contains these sheets: ${sheetList}${hint}\n\nExpected format: Column A = Company Name, data starts at row 6 (row 5 is the header row).`
    );
  }

  const sheet = workbook.Sheets[sheetName];
  // Get all rows as 2D array (header:1 returns arrays, not objects)
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Data starts at row 6 (0-indexed: row 5). Row 5 (index 4) is the header.
  const dataRows = rows.slice(5); // index 5 = row 6

  const parsed: ParsedRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    // Column A (index 0) must have a company name
    const companyName = String(r[0] ?? '').trim();
    if (!companyName) continue;

    parsed.push({
      company: companyName,
      name1: String(r[1] ?? '').trim(),
      surname1: String(r[2] ?? '').trim(),
      position1: String(r[3] ?? '').trim(),
      email1: String(r[4] ?? '').trim(),
      name2: String(r[5] ?? '').trim(),
      surname2: String(r[6] ?? '').trim(),
      position2: String(r[7] ?? '').trim(),
      email2: String(r[8] ?? '').trim(),
      relationshipNote: String(r[9] ?? '').trim(),
      owner: String(r[10] ?? '').trim(),
      phone: String(r[11] ?? '').trim(),
      linkedInProfile: String(r[12] ?? '').trim(),
      type: String(r[13] ?? '').trim(),
      owner2: String(r[14] ?? '').trim(),
      priority: String(r[15] ?? '').trim(),
      status: String(r[16] ?? '').trim(),
      website: String(r[17] ?? '').trim(),
      contactUrl: String(r[18] ?? '').trim(),
      sourceUrl: String(r[19] ?? '').trim(),
      notes: String(r[20] ?? '').trim(),
      lastChecked: String(r[21] ?? '').trim(),
    });
  }

  return parsed;
}

// ── Name Normalization ──────────────────────────────────────

/**
 * Normalize a company name for matching purposes.
 * - Trim and lowercase
 * - Remove common legal suffixes
 * - Remove trailing punctuation
 * - Collapse multiple spaces
 */
export function normalizeCompanyName(name: string): string {
  let n = name.trim().toLowerCase();

  // Remove legal suffixes (longer patterns first to avoid partial matches)
  for (const suffix of LEGAL_SUFFIXES) {
    const lower = suffix.toLowerCase();
    // Match suffix at end of string, preceded by a space or comma
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    n = n.replace(new RegExp(`[,\\s]+${escaped}\\s*$`, 'i'), '');
  }

  // Remove trailing punctuation (commas, periods, semicolons)
  n = n.replace(/[,.;:]+$/, '').trim();

  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ').trim();

  return n;
}

// ── Matching ────────────────────────────────────────────────

/**
 * Find an existing company whose normalized name matches the given name.
 */
export function matchExistingCompany(
  normalizedName: string,
  companies: Company[]
): Company | undefined {
  return companies.find(
    (c) => normalizeCompanyName(c.basic.name) === normalizedName
  );
}

// ── Row → Company Transformation ────────────────────────────

function mapProviderType(raw: string): ProviderType {
  const key = raw.toLowerCase().trim();
  return PROVIDER_TYPE_MAP[key] ?? 'unknown';
}

function mapPriority(raw: string): Company['priority'] {
  const key = raw.toLowerCase().trim();
  return PRIORITY_MAP[key] ?? 'unset';
}

function mapPipelineStatus(raw: string): PipelineStatus {
  if (!raw) return 'new';
  const normalized = raw
    .toLowerCase()
    .replace(/[\s/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  // Explicit mappings for known workbook values
  const known: Record<string, PipelineStatus> = {
    research: 'research',
    contacted: 'contacted',
    meeting: 'meeting',
    nda_diligence: 'nda_diligence',
    qualified_constituent: 'qualified_constituent',
    monitor: 'monitor',
    new: 'new',
    researching: 'researching',
    qualified: 'qualified',
    meeting_booked: 'meeting_booked',
    active_conversation: 'active_conversation',
    follow_up_later: 'follow_up_later',
    not_fit: 'not_fit',
    converted: 'converted',
    archived: 'archived',
  };
  return known[normalized] ?? ('new' as PipelineStatus);
}

function buildContact(
  firstName: string,
  lastName: string,
  position: string,
  email: string,
  phone: string,
  relationshipNote: string,
  isPrimary: boolean
): ProviderContact | null {
  const hasName = firstName || lastName;
  const hasEmail = !!email;
  if (!hasName && !hasEmail) return null;

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: generateId('contact'),
    firstName,
    lastName,
    fullName,
    position,
    email,
    phone,
    relationshipNote,
    isPrimary,
    source: SOURCE_IMPORT_TAG,
  };
}

function buildEvidenceUrls(row: ParsedRow): string[] {
  const urls: string[] = [];
  if (row.linkedInProfile) urls.push(row.linkedInProfile);
  if (row.contactUrl) urls.push(row.contactUrl);
  if (row.sourceUrl) urls.push(row.sourceUrl);
  return urls;
}

function buildOwner(row: ParsedRow): string {
  const owners = [row.owner, row.owner2].filter(Boolean);
  return owners.join(', ');
}

/**
 * Transform a parsed workbook row into a Company record.
 * Returns the company and whether it's a 'create' or 'update' action.
 */
export function transformRowToCompany(
  row: ParsedRow,
  existingCompany?: Company
): { company: Company; action: 'create' | 'update' } {
  const now = new Date().toISOString();

  // Build contacts from workbook columns
  const contact1 = buildContact(
    row.name1, row.surname1, row.position1, row.email1,
    row.phone, row.relationshipNote, true
  );
  const contact2 = buildContact(
    row.name2, row.surname2, row.position2, row.email2,
    '', '', false
  );

  const newContacts: ProviderContact[] = [];
  if (contact1) newContacts.push(contact1);
  if (contact2) newContacts.push(contact2);

  const evidenceUrls = buildEvidenceUrls(row);
  const owner = buildOwner(row);

  if (!existingCompany) {
    // ── CREATE: Build a full new Company ────────────────────
    const company = makeEmptyCompany({
      basic: {
        name: row.company,
        website: row.website,
        industry: '',
        location: '',
        employeeCount: 0,
        revenueEstimate: '',
        notes: '',
      },
      owner,
      pipelineStatus: mapPipelineStatus(row.status),
      priority: mapPriority(row.priority),
      lastContactedAt: row.lastChecked ? new Date(row.lastChecked).toISOString() : '',
      contacts: newContacts,
      providerProfile: {
        providerType: mapProviderType(row.type),
        gpuCapacityNotes: '',
        region: '',
        infrastructureType: '',
        onboardingStage: '',
        computeFitScore: 0,
        providerPriority: 'unset',
        willemNotes: row.notes,
        providerSource: SOURCE_IMPORT_TAG,
        providerEvidenceUrls: evidenceUrls,
      },
    });

    return { company, action: 'create' };
  }

  // ── UPDATE: Merge into existing company ──────────────────
  const updated = { ...existingCompany };

  // Fill empty fields (don't overwrite existing non-empty data)
  if (!updated.basic.website && row.website) {
    updated.basic = { ...updated.basic, website: row.website };
  }
  if (!updated.owner && owner) {
    updated.owner = owner;
  }
  if (!updated.lastContactedAt && row.lastChecked) {
    updated.lastContactedAt = new Date(row.lastChecked).toISOString();
  }

  // Overwrite pipelineStatus if currently 'new' or 'researching'
  if (updated.pipelineStatus === 'new' || updated.pipelineStatus === 'researching') {
    updated.pipelineStatus = mapPipelineStatus(row.status);
  }
  // Also overwrite if the existing status is empty
  if (!updated.pipelineStatus || updated.pipelineStatus === ('new' as PipelineStatus)) {
    updated.pipelineStatus = mapPipelineStatus(row.status);
  }

  // Always set these fields
  updated.sourceImport = SOURCE_IMPORT_TAG;
  updated.importedAt = now;

  // Always append new contacts
  updated.contacts = [...(existingCompany.contacts || []), ...newContacts];

  // Always set providerProfile fields
  const existingProfile = existingCompany.providerProfile;
  updated.providerProfile = {
    providerType: existingProfile?.providerType || mapProviderType(row.type),
    gpuCapacityNotes: existingProfile?.gpuCapacityNotes || '',
    region: existingProfile?.region || '',
    infrastructureType: existingProfile?.infrastructureType || '',
    onboardingStage: existingProfile?.onboardingStage || '',
    computeFitScore: existingProfile?.computeFitScore || 0,
    providerPriority: existingProfile?.providerPriority || 'unset',
    willemNotes: row.notes
      ? existingProfile?.willemNotes
        ? `[Import 2026-06-29]: ${row.notes}\n\n${existingProfile.willemNotes}`
        : row.notes
      : existingProfile?.willemNotes || '',
    providerSource: SOURCE_IMPORT_TAG,
    providerEvidenceUrls: [
      ...(existingProfile?.providerEvidenceUrls || []),
      ...evidenceUrls,
    ],
  };

  updated.updatedAt = now;

  return { company: updated, action: 'update' };
}

// ── Validation ──────────────────────────────────────────────

/**
 * Validate a parsed row and return warnings. Never blocks import.
 */
export function validateRow(row: ParsedRow, allRows: ParsedRow[]): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  // Use a pseudo rowIndex based on the row's position (caller should provide real index)
  // We'll use -1 as sentinel and let the caller replace it
  const idx = -1; // replaced by caller

  // Missing website: empty or no '.'
  if (!row.website || !row.website.includes('.')) {
    warnings.push({
      rowIndex: idx,
      companyName: row.company,
      warningType: 'missing_website',
      fieldValue: row.website || '(empty)',
    });
  }

  // Missing contacts: both Contact 1 and Contact 2 have no name AND no email
  const c1Empty = !row.name1 && !row.surname1 && !row.email1;
  const c2Empty = !row.name2 && !row.surname2 && !row.email2;
  if (c1Empty && c2Empty) {
    warnings.push({
      rowIndex: idx,
      companyName: row.company,
      warningType: 'missing_contacts',
      fieldValue: '(both contacts empty)',
    });
  }

  // Duplicate company: same normalized name elsewhere in workbook
  const norm = normalizeCompanyName(row.company);
  const duplicate = allRows.some(
    (r) => r !== row && normalizeCompanyName(r.company) === norm
  );
  if (duplicate) {
    warnings.push({
      rowIndex: idx,
      companyName: row.company,
      warningType: 'duplicate_company',
      fieldValue: row.company,
    });
  }

  // Invalid URLs: non-empty but doesn't start with 'http'
  const urlFields: [string, string][] = [
    ['website', row.website],
    ['linkedInProfile', row.linkedInProfile],
    ['contactUrl', row.contactUrl],
    ['sourceUrl', row.sourceUrl],
  ];
  for (const [fieldName, value] of urlFields) {
    if (value && !value.startsWith('http')) {
      warnings.push({
        rowIndex: idx,
        companyName: row.company,
        warningType: 'invalid_url',
        fieldValue: `${fieldName}: ${value}`,
      });
    }
  }

  // Invalid email: non-empty but no '@'
  const emails = [
    { field: 'email1', value: row.email1 },
    { field: 'email2', value: row.email2 },
  ];
  for (const { field, value } of emails) {
    if (value && !value.includes('@')) {
      warnings.push({
        rowIndex: idx,
        companyName: row.company,
        warningType: 'invalid_email',
        fieldValue: `${field}: ${value}`,
      });
    }
  }

  return warnings;
}

// ── Statistics ──────────────────────────────────────────────

/**
 * Compute aggregate statistics from import results.
 */
export function computeImportStats(results: ImportResult[]): ImportStats {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let contactsCreated = 0;
  let warnings = 0;

  for (const result of results) {
    switch (result.action) {
      case 'create':
        created++;
        break;
      case 'update':
        updated++;
        break;
      case 'skip':
        skipped++;
        break;
    }
    contactsCreated += result.company.contacts?.length || 0;
    warnings += result.warnings.length;
  }

  return {
    totalRows: results.length,
    created,
    updated,
    skipped,
    contactsCreated,
    warnings,
  };
}
