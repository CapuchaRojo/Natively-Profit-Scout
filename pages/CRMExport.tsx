import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import { scoreClientFit, scoreProviderFit } from '../services/pipelineFitScoring';
import {
  Download,
  Copy,
  FileJson,
  FileSpreadsheet,
  Filter,
  X,
  ArrowLeft,
  Database,
  CheckCircle2,
  Building2,
  Users,
} from 'lucide-react';
import type { Company, HubspotExportRow, AccountType, PipelineStatus } from '../types';

// ── Helpers ──

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  client_lead: 'Client Lead',
  compute_provider: 'Compute Provider',
  partner: 'Partner',
  internal_target: 'Internal Target',
  unknown: 'Unknown',
};

const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  new: 'New',
  researching: 'Researching',
  research: 'Research',
  qualified: 'Qualified',
  contacted: 'Contacted',
  meeting: 'Meeting',
  meeting_booked: 'Meeting Booked',
  active_conversation: 'Active Conversation',
  nda_diligence: 'NDA / Diligence',
  qualified_constituent: 'Qualified Constituent',
  not_fit: 'Not a Fit',
  follow_up_later: 'Follow Up Later',
  monitor: 'Monitor',
  converted: 'Converted',
  archived: 'Archived',
};

function getFitScore(c: Company): number {
  if (c.fitScore) return c.fitScore.total;
  return c.accountType === 'compute_provider' ? scoreProviderFit(c).total : scoreClientFit(c).total;
}

function companyToHubspotRow(c: Company): HubspotExportRow {
  const fit = getFitScore(c);
  const evidenceUrls = (c.fitScore?.evidenceUrls || []).join('; ');
  return {
    company_name: c.basic.name,
    website: c.basic.website,
    account_type: ACCOUNT_TYPE_LABELS[c.accountType] || c.accountType,
    product_lane: c.productLane,
    pipeline_status: PIPELINE_STATUS_LABELS[c.pipelineStatus] || c.pipelineStatus,
    owner: c.owner || '',
    priority: c.priority === 'unset' ? '' : c.priority,
    fit_score: fit,
    lead_source: c.sourceCampaign || '',
    utm_source: c.utmSource || '',
    utm_medium: c.utmMedium || '',
    utm_campaign: c.utmCampaign || '',
    utm_content: c.utmContent || '',
    next_action: c.nextAction || '',
    notes: c.crmExport?.notes || c.basic.notes || '',
    evidence_urls: evidenceUrls,
  };
}

function rowsToCsv(rows: HubspotExportRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]) as (keyof HubspotExportRow)[];
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = typeof val === 'number' ? String(val) : (val || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Column definition ──

const COLUMNS: { key: keyof HubspotExportRow; label: string; width: string }[] = [
  { key: 'company_name', label: 'Company', width: 'min-w-[160px]' },
  { key: 'website', label: 'Website', width: 'min-w-[140px]' },
  { key: 'account_type', label: 'Type', width: 'min-w-[100px]' },
  { key: 'product_lane', label: 'Lane', width: 'min-w-[80px]' },
  { key: 'pipeline_status', label: 'Status', width: 'min-w-[110px]' },
  { key: 'owner', label: 'Owner', width: 'min-w-[100px]' },
  { key: 'priority', label: 'Priority', width: 'min-w-[70px]' },
  { key: 'fit_score', label: 'Fit %', width: 'w-[60px]' },
  { key: 'lead_source', label: 'Source', width: 'min-w-[100px]' },
  { key: 'next_action', label: 'Next Action', width: 'min-w-[140px]' },
  { key: 'notes', label: 'Notes', width: 'min-w-[160px]' },
];

// ── Sub-components ──

function FilterBar({
  filterStatus,
  filterType,
  filterPriority,
  onStatusChange,
  onTypeChange,
  onPriorityChange,
  onClear,
  total,
  filtered,
}: {
  filterStatus: string;
  filterType: string;
  filterPriority: string;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onClear: () => void;
  total: number;
  filtered: number;
}) {
  const hasFilters = filterStatus || filterType || filterPriority;
  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-secondary">
          <Filter size={16} />
          <span className="font-medium">Filters</span>
        </div>

        <select
          className="input w-auto"
          value={filterStatus}
          onChange={e => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          {(Object.entries(PIPELINE_STATUS_LABELS) as [PipelineStatus, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="input w-auto"
          value={filterType}
          onChange={e => onTypeChange(e.target.value)}
        >
          <option value="">All Types</option>
          {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <select
          className="input w-auto"
          value={filterPriority}
          onChange={e => onPriorityChange(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="unset">Unset</option>
        </select>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            <X size={14} />
            Clear
          </button>
        )}

        <span className="text-xs text-muted ml-auto">
          Showing <span className="text-foreground font-medium">{filtered}</span> of{' '}
          <span className="text-foreground font-medium">{total}</span> accounts
        </span>
      </div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: HubspotExportRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState>
        <EmptyStateIcon icon={<Database size={32} />} />
        <EmptyStateTitle>No rows to preview</EmptyStateTitle>
        <EmptyStateDesc>
          Add companies to the pipeline and they will appear here for export.
        </EmptyStateDesc>
      </EmptyState>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-bg-input">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`text-left p-3 font-semibold text-secondary uppercase tracking-wider whitespace-nowrap ${col.width}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border hover:bg-card-hover transition-colors duration-150"
              >
                {COLUMNS.map(col => (
                  <td key={col.key} className={`p-3 text-foreground whitespace-nowrap truncate max-w-[200px] ${col.width}`}>
                    {col.key === 'fit_score' ? (
                      <span className={`font-mono font-bold ${
                        row.fit_score >= 50 ? 'text-accent-green' :
                        row.fit_score >= 25 ? 'text-accent-amber' : 'text-accent-red'
                      }`}>
                        {row.fit_score}%
                      </span>
                    ) : col.key === 'priority' ? (
                      row.priority ? (
                        <span className={`chip chip-${
                          row.priority === 'high' ? 'red' :
                          row.priority === 'medium' ? 'amber' : 'blue'
                        }`}>
                          {row.priority}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )
                    ) : col.key === 'website' ? (
                      <a
                        href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline truncate block"
                      >
                        {row.website}
                      </a>
                    ) : (
                      <span className="truncate block" title={String(row[col.key] || '')}>
                        {String(row[col.key] || '') || <span className="text-muted">—</span>}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-border text-xs text-muted bg-bg-input">
        {rows.length} row{rows.length !== 1 ? 's' : ''} — ready for HubSpot import
      </div>
    </div>
  );
}

// ── Single-Company Export View ──

function SingleCompanyExport({ company, onBack }: { company: Company; onBack: () => void }) {
  const crm = company.crmExport;
  const recon = company.reconFindings;
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  }, []);

  const row = companyToHubspotRow(company);
  const csvRow = rowsToCsv([row]);
  const jsonRow = JSON.stringify([row], null, 2);
  // CSV row without header for appending
  const csvRowOnly = rowsToCsv([row]).split('\n').slice(1).join('\n');

  return (
    <div>
      <PageHeader
        title="CRM Export"
        subtitle={`${company.basic.name} — HubSpot-ready export`}
        actions={
          <button className="btn btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Pipeline Export
          </button>
        }
      />

      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <span className="input-label" style={{ margin: 0 }}>Export Actions</span>
            {copied && (
              <span className="text-xs text-accent-green flex items-center gap-1">
                <CheckCircle2 size={14} />
                {copied} copied
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-primary btn-sm" onClick={() => { downloadFile(csvRow, `${company.basic.name.replace(/\s+/g, '_')}_hubspot.csv`, 'text/csv'); }}>
              <Download size={14} />
              Download CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { downloadFile(jsonRow, `${company.basic.name.replace(/\s+/g, '_')}_hubspot.json`, 'application/json'); }}>
              <FileJson size={14} />
              Download JSON
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => copy('CSV', csvRow)}>
              <Copy size={14} />
              Copy CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => copy('JSON', jsonRow)}>
              <Copy size={14} />
              Copy JSON
            </button>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <span className="input-label" style={{ margin: 0 }}>HubSpot Row Preview</span>
          <div className="flex items-center gap-2">
            {crm && <ConfidenceBadge level={crm.confidence} size="sm" />}
            <span className={`badge ${crm?.prospectStatus === 'hot' ? 'badge-red' : crm?.prospectStatus === 'warm' ? 'badge-amber' : 'badge-assumed'}`}>
              {crm?.prospectStatus || 'unknown'}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
            <Field label="Company" value={row.company_name} />
            <Field label="Website" value={row.website} />
            <Field label="Type" value={row.account_type} />
            <Field label="Lane" value={row.product_lane} />
            <Field label="Status" value={row.pipeline_status} />
            <Field label="Owner" value={row.owner || 'Unassigned'} />
            <Field label="Priority" value={row.priority || 'Unset'} />
            <Field label="Fit Score" value={`${row.fit_score}%`} />
            <Field label="Source" value={row.lead_source || 'N/A'} />
            <Field label="Next Action" value={row.next_action || 'N/A'} />
          </div>
          {row.notes && (
            <div className="mt-3">
              <span className="input-label">Notes</span>
              <p className="text-sm text-secondary mt-1">{row.notes}</p>
            </div>
          )}
          {row.evidence_urls && (
            <div className="mt-3">
              <span className="input-label">Evidence URLs</span>
              <p className="text-xs text-muted mt-1 break-all">{row.evidence_urls}</p>
            </div>
          )}
          {row.utm_source && (
            <div className="mt-3">
              <span className="input-label">UTM Parameters</span>
              <div className="flex gap-2 mt-1 flex-wrap">
                {row.utm_source && <span className="chip chip-blue">source: {row.utm_source}</span>}
                {row.utm_medium && <span className="chip chip-blue">medium: {row.utm_medium}</span>}
                {row.utm_campaign && <span className="chip chip-blue">campaign: {row.utm_campaign}</span>}
                {row.utm_content && <span className="chip chip-blue">content: {row.utm_content}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV preview */}
      <div className="card">
        <div className="card-header">
          <span className="input-label" style={{ margin: 0 }}>CSV Row</span>
          <CopyButton text={csvRow} label="Copy" />
        </div>
        <div className="card-body">
          <pre className="text-xs text-muted font-mono whitespace-pre-wrap break-all m-0">{csvRow}</pre>
        </div>
      </div>
    </div>
  );
}

// ── Pipeline-Wide Export View ──

function PipelineExport() {
  const { state, getCompany } = useApp();
  const navigate = useNavigate();
  const { companies } = state;

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredRows = useMemo(() => {
    let filtered = companies;
    if (filterStatus) filtered = filtered.filter(c => c.pipelineStatus === filterStatus);
    if (filterType) filtered = filtered.filter(c => c.accountType === filterType);
    if (filterPriority) filtered = filtered.filter(c => c.priority === filterPriority);
    return filtered.map(companyToHubspotRow);
  }, [companies, filterStatus, filterType, filterPriority]);

  const csvContent = useMemo(() => rowsToCsv(filteredRows), [filteredRows]);
  const jsonContent = useMemo(() => JSON.stringify(filteredRows, null, 2), [filteredRows]);

  const clearFilters = useCallback(() => {
    setFilterStatus('');
    setFilterType('');
    setFilterPriority('');
  }, []);

  const handleCopyCsv = useCallback(async () => {
    await navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [csvContent]);

  const handleDownloadCsv = useCallback(() => {
    const ts = new Date().toISOString().split('T')[0];
    downloadFile(csvContent, `natively_pipeline_export_${ts}.csv`, 'text/csv');
  }, [csvContent]);

  const handleDownloadJson = useCallback(() => {
    const ts = new Date().toISOString().split('T')[0];
    downloadFile(jsonContent, `natively_pipeline_export_${ts}.json`, 'application/json');
  }, [jsonContent]);

  // Stats
  const activeAccounts = companies.filter(c =>
    !['archived', 'not_fit'].includes(c.pipelineStatus)
  ).length;

  return (
    <div>
      <PageHeader
        title="CRM Export"
        subtitle="Export pipeline data in HubSpot-compatible format"
      />

      {/* Summary cards */}
      <div className="metrics-grid mb-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Total Accounts</span>
            <span className="stat-card-icon"><Building2 size={18} /></span>
          </div>
          <div className="stat-card-value">{companies.length}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Active Pipeline</span>
            <span className="stat-card-icon"><Users size={18} /></span>
          </div>
          <div className="stat-card-value text-accent-green">{activeAccounts}</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="stat-card-label">Filtered Rows</span>
            <span className="stat-card-icon"><Filter size={18} /></span>
          </div>
          <div className="stat-card-value text-accent-amber">{filteredRows.length}</div>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filterStatus={filterStatus}
        filterType={filterType}
        filterPriority={filterPriority}
        onStatusChange={setFilterStatus}
        onTypeChange={setFilterType}
        onPriorityChange={setFilterPriority}
        onClear={clearFilters}
        total={companies.length}
        filtered={filteredRows.length}
      />

      {/* Export actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          className="btn btn-primary"
          onClick={handleDownloadCsv}
          disabled={filteredRows.length === 0}
        >
          <Download size={16} />
          Download CSV
        </button>
        <button
          className="btn btn-primary"
          onClick={handleDownloadJson}
          disabled={filteredRows.length === 0}
        >
          <FileJson size={16} />
          Download JSON
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleCopyCsv}
          disabled={filteredRows.length === 0}
        >
          <Copy size={16} />
          {copied ? 'Copied!' : 'Copy CSV'}
        </button>
        {copied && <CheckCircle2 size={16} className="text-accent-green" />}
      </div>

      {/* HubSpot column mapping note */}
      <div className="card p-3 mb-4 text-xs text-muted">
        <span className="text-secondary font-semibold">HubSpot Column Mapping:</span>{' '}
        company_name → Company Name · website → Website URL · account_type → Account Type ·
        product_lane → Product Lane · pipeline_status → Pipeline Stage · owner → Contact Owner ·
        priority → Priority · fit_score → Fit Score · lead_source → Lead Source ·
        utm_* → UTM Parameters · next_action → Next Activity · notes → Notes ·
        evidence_urls → Evidence URLs
      </div>

      {/* Preview table */}
      <PreviewTable rows={filteredRows} />
    </div>
  );
}

// ── Main Page Component ──

export default function CRMExportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany } = useApp();

  // If accessed via /company/:id/export, show single-company export
  if (id) {
    const company = getCompany(id);
    if (!company) {
      return (
        <div>
          <PageHeader title="CRM Export" />
          <EmptyState>
            <EmptyStateIcon icon={<Database size={32} />} />
            <EmptyStateTitle>Company not found</EmptyStateTitle>
            <EmptyStateDesc>The requested company does not exist or was deleted.</EmptyStateDesc>
          </EmptyState>
        </div>
      );
    }
    return <SingleCompanyExport company={company} onBack={() => navigate('/crm-export')} />;
  }

  // Otherwise show pipeline-wide export
  return <PipelineExport />;
}

// ── Field helper ──

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted block">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  );
}
