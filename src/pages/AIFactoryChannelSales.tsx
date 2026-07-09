// ============================================================
// AI Factory Channel Sales — Pipeline Scout Segment (v2.0)
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import { useToast } from '../components/Toast';
import {
  Factory, Building2, AlertTriangle, CheckCircle, Target, Users, ChevronDown, ChevronUp,
  ExternalLink, Clock, Plus, X,
} from 'lucide-react';
import type {
  AIFactoryChannelSalesRecord, AIFactoryNativelyLane, AIFactoryPriority, AIFactoryStatus,
} from '../types';

const laneLabels: Record<AIFactoryNativelyLane, string> = {
  Builder: 'Builder',
  Compute: 'Compute',
  Relay: 'Relay',
  'Multi-lane': 'Multi-lane',
  'Provider / Channel': 'Provider / Channel',
};

const statusLabels: Record<AIFactoryStatus, string> = {
  Research: 'Research',
  Researching: 'Researching',
  'Contact identified': 'Contact Identified',
  'Outreach ready': 'Outreach Ready',
  Contacted: 'Contacted',
  'Meeting requested': 'Meeting Requested',
  'Meeting booked': 'Meeting Booked',
  'Partner/channel route': 'Partner/Channel Route',
  'Not a fit': 'Not a Fit',
  Monitor: 'Monitor',
};

const priorityColors: Record<AIFactoryPriority, string> = {
  'Tier 1': '#ef4444',
  'Tier 2': '#f59e0b',
  'Tier 3': '#64748b',
};

const laneColors: Record<AIFactoryNativelyLane, string> = {
  Builder: '#3b82f6',
  Compute: '#f59e0b',
  Relay: '#06b6d4',
  'Multi-lane': '#a855f7',
  'Provider / Channel': '#10b981',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AIFactoryChannelSalesPage() {
  const { state, updateAIFactoryRecord, addAIFactoryRecord } = useApp();
  const { showToast } = useToast();
  const { aiFactoryRecords } = state;

  // ── Filter state ──
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterLane, setFilterLane] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClarification, setFilterClarification] = useState<string>('all');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // ── Add form state ──
  const [newAccountName, setNewAccountName] = useState('');
  const [newLane, setNewLane] = useState<AIFactoryNativelyLane>('Multi-lane');
  const [newPriority, setNewPriority] = useState<AIFactoryPriority>('Tier 2');
  const [newStatus, setNewStatus] = useState<AIFactoryStatus>('Research');
  const [newOwner, setNewOwner] = useState('Adam');
  const [newChannelAngle, setNewChannelAngle] = useState('');
  const [newTargetDept, setNewTargetDept] = useState('');

  // ── Filters ──
  const filtered = useMemo(() => {
    return aiFactoryRecords.filter(r => {
      if (filterAccount !== 'all' && r.normalized_account_name !== filterAccount) return false;
      if (filterPriority !== 'all' && r.priority !== filterPriority) return false;
      if (filterOwner !== 'all' && r.owner !== filterOwner) return false;
      if (filterLane !== 'all' && r.natively_lane !== filterLane) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterClarification !== 'all') {
        if (filterClarification === 'needs_clarification' && !r.needs_clarification) return false;
        if (filterClarification === 'clarified' && r.needs_clarification) return false;
      }
      return true;
    });
  }, [aiFactoryRecords, filterAccount, filterPriority, filterOwner, filterLane, filterStatus, filterClarification]);

  const selectedRecord = selectedRecordId
    ? aiFactoryRecords.find(r => r.id === selectedRecordId)
    : undefined;

  // ── Stats ──
  const stats = useMemo(() => ({
    total: aiFactoryRecords.length,
    tier1: aiFactoryRecords.filter(r => r.priority === 'Tier 1').length,
    needsClarification: aiFactoryRecords.filter(r => r.needs_clarification).length,
    byLane: {
      Builder: aiFactoryRecords.filter(r => r.natively_lane === 'Builder').length,
      Compute: aiFactoryRecords.filter(r => r.natively_lane === 'Compute').length,
      Relay: aiFactoryRecords.filter(r => r.natively_lane === 'Relay').length,
      'Multi-lane': aiFactoryRecords.filter(r => r.natively_lane === 'Multi-lane').length,
      'Provider / Channel': aiFactoryRecords.filter(r => r.natively_lane === 'Provider / Channel').length,
    },
    byOwner: {
      Adam: aiFactoryRecords.filter(r => r.owner === 'Adam').length,
      Pawel: aiFactoryRecords.filter(r => r.owner === 'Pawel').length,
      Unassigned: aiFactoryRecords.filter(r => r.owner !== 'Adam' && r.owner !== 'Pawel').length,
    },
  }), [aiFactoryRecords]);

  // ── Handlers ──
  const handleStatusChange = (id: string, status: AIFactoryStatus) => {
    const record = aiFactoryRecords.find(r => r.id === id);
    if (!record) return;

    // Validation: block outreach-past-ready when needs_clarification
    const outreachStates: AIFactoryStatus[] = ['Contact identified', 'Outreach ready', 'Contacted', 'Meeting requested', 'Meeting booked'];
    if (record.needs_clarification && outreachStates.includes(status) && !outreachStates.includes(record.status)) {
      showToast('Cannot advance — record needs clarification first', 'error');
      return;
    }

    updateAIFactoryRecord(id, { status, last_checked: new Date().toISOString() });
    showToast(`Status updated to ${statusLabels[status]}`, 'success');
  };

  const handleUpdateField = (id: string, field: keyof AIFactoryChannelSalesRecord, value: any) => {
    updateAIFactoryRecord(id, { [field]: value, last_checked: new Date().toISOString() } as any);
  };

  const handleAddRecord = () => {
    if (!newAccountName.trim()) {
      showToast('Account name is required', 'error');
      return;
    }
    const now = new Date().toISOString();
    const id = `ai-factory-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: AIFactoryChannelSalesRecord = {
      id,
      account_name: newAccountName.trim(),
      normalized_account_name: newAccountName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      segment: 'AI Factory Channel Sales',
      source: 'manual_entry',
      source_import: 'ai_factory_channel_sales_2026_07',
      channel_angle: newChannelAngle,
      gpu_ecosystem_relevance: '',
      builder_default_developer_tool_angle: '',
      compute_relay_relevance: '',
      known_warm_connections: '',
      target_department: newTargetDept,
      buyer_role_hypothesis: '',
      natively_lane: newLane,
      priority: newPriority,
      owner: newOwner,
      technical_validator: 'Pawel',
      status: newStatus,
      next_action: 'Research partner ecosystem, warm connections, target departments, and channel-sales angle before outreach.',
      notes: '',
      needs_clarification: false,
      clarification_note: '',
      created_at: now,
      updated_at: now,
      last_checked: now,
    };
    addAIFactoryRecord(record);
    showToast(`✅ ${newAccountName} added to AI Factory Channel Sales`, 'success');
    setShowAddForm(false);
    setNewAccountName('');
    setNewChannelAngle('');
    setNewTargetDept('');
  };

  // ── Quick filter buttons ──
  const QuickFilterBtn = ({ label, value, current, onClick }: { label: string; value: string; current: string; onClick: (v: string) => void }) => (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => onClick(current === value ? 'all' : value)}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        background: current === value ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: current === value ? '#3b82f6' : '#64748b',
        border: `1px solid ${current === value ? 'rgba(59,130,246,0.3)' : '#2a3a5c'}`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="AI Factory Channel Sales"
        subtitle="Channel-sales targets for Pawel's AI Factory narrative"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Account</>}
            </button>
          </div>
        }
      />

      {/* Safe Discovery notice */}
      <div className="card mb-4" style={{ borderColor: '#f59e0b', padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Do NOT auto-outreach:</span>{' '}
        No contacts are invented. No warm connections are auto-filled. Do not move past "Outreach ready" unless real contacts are manually verified.
        All records are research-prep only until Adam & Pawel review.
      </div>

      {/* Stats */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
            <div className="stat-card" style={{ padding: 8 }}>
              <div className="stat-card-label">Total</div>
              <div className="stat-card-value" style={{ fontSize: 18, color: '#e2e8f0' }}>{stats.total}</div>
            </div>
            <div className="stat-card" style={{ padding: 8, borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className="stat-card-label">Tier 1</div>
              <div className="stat-card-value" style={{ fontSize: 18, color: '#ef4444' }}>{stats.tier1}</div>
            </div>
            <div className="stat-card" style={{ padding: 8, borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="stat-card-label">Needs Clarification</div>
              <div className="stat-card-value" style={{ fontSize: 18, color: '#f59e0b' }}>{stats.needsClarification}</div>
            </div>
            <div className="stat-card" style={{ padding: 8 }}>
              <div className="stat-card-label">By Lane</div>
              <div className="stat-card-value" style={{ fontSize: 12, color: '#94a3b8' }}>
                {Object.entries(stats.byLane).filter(([_, c]) => c > 0).map(([lane, count]) => (
                  <span key={lane} style={{ marginRight: 6 }}>{lane}: {count}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '10px 14px' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Quick:</span>
            <QuickFilterBtn label="NVIDIA" value="nvidia" current={filterAccount} onClick={setFilterAccount} />
            <QuickFilterBtn label="Dell" value="dell" current={filterAccount} onClick={setFilterAccount} />
            <QuickFilterBtn label="HP / HPE" value="hp" current={filterAccount} onClick={setFilterAccount} />
            <span style={{ width: 1, height: 16, background: '#2a3a5c', margin: '0 4px' }} />
            <QuickFilterBtn label="Tier 1" value="Tier 1" current={filterPriority} onClick={setFilterPriority} />
            <QuickFilterBtn label="Needs Clarification" value="needs_clarification" current={filterClarification} onClick={setFilterClarification} />
            <QuickFilterBtn label="Owner: Adam" value="Adam" current={filterOwner} onClick={setFilterOwner} />
            <span style={{ width: 1, height: 16, background: '#2a3a5c', margin: '0 4px' }} />
            <QuickFilterBtn label="Lane: Builder" value="Builder" current={filterLane} onClick={setFilterLane} />
            <QuickFilterBtn label="Lane: Compute" value="Compute" current={filterLane} onClick={setFilterLane} />
            <QuickFilterBtn label="Lane: Relay" value="Relay" current={filterLane} onClick={setFilterLane} />
            <span style={{ width: 1, height: 16, background: '#2a3a5c', margin: '0 4px' }} />
            <QuickFilterBtn label="Status: Research" value="Research" current={filterStatus} onClick={setFilterStatus} />
            <QuickFilterBtn label="Status: Outreach Ready" value="Outreach ready" current={filterStatus} onClick={setFilterStatus} />
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card mb-4" style={{ borderColor: '#a855f7' }}>
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}><Plus size={14} /> New AI Factory Channel Account</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Account Name *</label>
                <input className="input" value={newAccountName} onChange={e => setNewAccountName(e.target.value)}
                  placeholder="e.g. NVIDIA, Dell, HPE" />
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Owner</label>
                <select className="input" value={newOwner} onChange={e => setNewOwner(e.target.value)}>
                  <option value="Adam">Adam</option>
                  <option value="Pawel">Pawel</option>
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Natively Lane</label>
                <select className="input" value={newLane} onChange={e => setNewLane(e.target.value as AIFactoryNativelyLane)}>
                  {Object.entries(laneLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Priority</label>
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as AIFactoryPriority)}>
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                </select>
              </div>
              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Status</label>
                <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value as AIFactoryStatus)}>
                  {Object.entries(statusLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Initial Channel Angle (optional)</label>
              <textarea className="input" rows={2} value={newChannelAngle}
                onChange={e => setNewChannelAngle(e.target.value)}
                placeholder="How to position NativelyAI for this partner..." />
            </div>
            <div className="input-group">
              <label className="input-label">Target Department (optional)</label>
              <input className="input" value={newTargetDept}
                onChange={e => setNewTargetDept(e.target.value)}
                placeholder="e.g. Developer Relations, AI Platform, Partner Ecosystem" />
            </div>
            <button className="btn btn-primary" onClick={handleAddRecord} disabled={!newAccountName.trim()}>
              <Plus size={14} /> Add to AI Factory Channel Sales
            </button>
          </div>
        </div>
      )}

      {/* Records Grid */}
      {filtered.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon><Factory size={32} /></EmptyStateIcon>
          <EmptyStateTitle>No AI Factory records found</EmptyStateTitle>
          <EmptyStateDesc>
            {aiFactoryRecords.length === 0
              ? 'Add your first AI Factory channel-sales account using the Add Account button.'
              : 'No records match the current filters.'}
          </EmptyStateDesc>
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
            {filtered.map(record => (
              <div
                key={record.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedRecordId === record.id ? '#a855f7' : undefined,
                  transition: 'border-color 0.15s',
                }}
                onClick={() => setSelectedRecordId(selectedRecordId === record.id ? null : record.id)}
              >
                <div className="card-body" style={{ padding: '12px 14px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{record.account_name}</span>
                        {record.needs_clarification && (
                          <span style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 3,
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                            border: '1px solid rgba(245,158,11,0.3)',
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>
                            <AlertTriangle size={9} /> Needs Clarification
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 600,
                      background: `${priorityColors[record.priority]}15`,
                      color: priorityColors[record.priority],
                      border: `1px solid ${priorityColors[record.priority]}30`,
                    }}>
                      {record.priority}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontSize: 11 }}>
                    <span style={{
                      color: laneColors[record.natively_lane],
                      padding: '1px 6px', borderRadius: 3,
                      background: `${laneColors[record.natively_lane]}10`,
                    }}>
                      {record.natively_lane}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      <Users size={11} style={{ display: 'inline', marginRight: 3 }} />
                      {record.owner}
                    </span>
                    <span style={{ color: '#64748b' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                      {timeAgo(record.updated_at)}
                    </span>
                  </div>

                  {/* Status */}
                  <div style={{ marginBottom: 6 }}>
                    <select
                      className="input"
                      style={{ fontSize: 11, width: '100%', padding: '3px 6px' }}
                      value={record.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); handleStatusChange(record.id, e.target.value as AIFactoryStatus); }}
                    >
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Channel angle preview */}
                  {record.channel_angle && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, lineHeight: 1.4 }}>
                      {record.channel_angle.length > 120
                        ? record.channel_angle.slice(0, 120) + '...'
                        : record.channel_angle}
                    </div>
                  )}

                  {/* Next action preview */}
                  {record.next_action && (
                    <div style={{
                      fontSize: 10, padding: '4px 6px',
                      background: 'rgba(16,185,129,0.06)', borderRadius: 3,
                      color: '#10b981', lineHeight: 1.3,
                    }}>
                      {record.next_action.length > 100
                        ? record.next_action.slice(0, 100) + '...'
                        : record.next_action}
                    </div>
                  )}

                  {/* Target department */}
                  {record.target_department && (
                    <div style={{ fontSize: 9, color: '#3b82f6', marginTop: 4 }}>
                      <Building2 size={9} style={{ display: 'inline', marginRight: 3 }} />
                      {record.target_department.slice(0, 80)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedRecord && (
            <div style={{
              flex: '0 0 380px', position: 'sticky', top: 12,
              alignSelf: 'flex-start', maxHeight: 'calc(100vh - 100px)', overflow: 'auto',
            }}>
              <div className="card">
                <div className="card-header">
                  <span className="input-label" style={{ margin: 0 }}>
                    {selectedRecord.account_name}
                    {selectedRecord.needs_clarification && (
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                        marginLeft: 6, border: '1px solid rgba(245,158,11,0.3)',
                      }}>
                        <AlertTriangle size={9} /> Needs Clarification
                      </span>
                    )}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRecordId(null)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="card-body" style={{ padding: '12px 14px', fontSize: 12 }}>
                  {/* Status + Owner controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontSize: 10 }}>Status</label>
                      <select className="input" style={{ fontSize: 11 }}
                        value={selectedRecord.status}
                        onChange={e => handleStatusChange(selectedRecord.id, e.target.value as AIFactoryStatus)}>
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontSize: 10 }}>Owner</label>
                      <select className="input" style={{ fontSize: 11 }}
                        value={selectedRecord.owner}
                        onChange={e => handleUpdateField(selectedRecord.id, 'owner', e.target.value)}>
                        <option value="Adam">Adam</option>
                        <option value="Pawel">Pawel</option>
                      </select>
                    </div>
                  </div>

                  {/* Clarification section */}
                  {selectedRecord.needs_clarification && (
                    <div style={{
                      padding: 10, background: 'rgba(245,158,11,0.05)',
                      borderRadius: 4, marginBottom: 12,
                      border: '1px solid rgba(245,158,11,0.2)',
                    }}>
                      <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>
                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Needs Clarification
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                        {selectedRecord.clarification_note}
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: '#10b981' }}
                        onClick={() => handleUpdateField(selectedRecord.id, 'needs_clarification', false)}>
                        <CheckCircle size={10} /> Mark as Clarified
                      </button>
                    </div>
                  )}

                  {/* Channel Angle */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Channel Angle</label>
                    <textarea className="input" rows={3} style={{ fontSize: 11 }}
                      value={selectedRecord.channel_angle}
                      onChange={e => handleUpdateField(selectedRecord.id, 'channel_angle', e.target.value)} />
                  </div>

                  {/* GPU Ecosystem Relevance */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>GPU Ecosystem Relevance</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.gpu_ecosystem_relevance}
                      onChange={e => handleUpdateField(selectedRecord.id, 'gpu_ecosystem_relevance', e.target.value)} />
                  </div>

                  {/* Builder as Default Developer Tool Angle */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Builder as Default Developer Tool Angle</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.builder_default_developer_tool_angle}
                      onChange={e => handleUpdateField(selectedRecord.id, 'builder_default_developer_tool_angle', e.target.value)} />
                  </div>

                  {/* Compute/Relay Relevance */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Compute / Relay Relevance</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.compute_relay_relevance}
                      onChange={e => handleUpdateField(selectedRecord.id, 'compute_relay_relevance', e.target.value)} />
                  </div>

                  {/* Known Warm Connections */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Known Warm Connections</label>
                    <textarea className="input" rows={1} style={{ fontSize: 11 }}
                      value={selectedRecord.known_warm_connections}
                      onChange={e => handleUpdateField(selectedRecord.id, 'known_warm_connections', e.target.value)}
                      placeholder="Leave blank unless a verified team connection exists." />
                  </div>

                  {/* Target Department */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Target Department</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.target_department}
                      onChange={e => handleUpdateField(selectedRecord.id, 'target_department', e.target.value)} />
                  </div>

                  {/* Buyer Role Hypothesis */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Buyer Role Hypothesis</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.buyer_role_hypothesis}
                      onChange={e => handleUpdateField(selectedRecord.id, 'buyer_role_hypothesis', e.target.value)} />
                  </div>

                  {/* Lane + Priority */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontSize: 10 }}>Natively Lane</label>
                      <select className="input" style={{ fontSize: 11 }}
                        value={selectedRecord.natively_lane}
                        onChange={e => handleUpdateField(selectedRecord.id, 'natively_lane', e.target.value)}>
                        {Object.entries(laneLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                      </select>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label" style={{ fontSize: 10 }}>Priority</label>
                      <select className="input" style={{ fontSize: 11 }}
                        value={selectedRecord.priority}
                        onChange={e => handleUpdateField(selectedRecord.id, 'priority', e.target.value)}>
                        <option value="Tier 1">Tier 1</option>
                        <option value="Tier 2">Tier 2</option>
                        <option value="Tier 3">Tier 3</option>
                      </select>
                    </div>
                  </div>

                  {/* Next Action */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Next Action</label>
                    <textarea className="input" rows={2} style={{ fontSize: 11 }}
                      value={selectedRecord.next_action}
                      onChange={e => handleUpdateField(selectedRecord.id, 'next_action', e.target.value)} />
                  </div>

                  {/* Notes */}
                  <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                    <label className="input-label" style={{ fontSize: 10 }}>Notes</label>
                    <textarea className="input" rows={3} style={{ fontSize: 11 }}
                      value={selectedRecord.notes}
                      onChange={e => handleUpdateField(selectedRecord.id, 'notes', e.target.value)} />
                  </div>

                  {/* Clarification Note */}
                  {selectedRecord.needs_clarification && (
                    <div className="input-group" style={{ margin: 0, marginBottom: 8 }}>
                      <label className="input-label" style={{ fontSize: 10 }}>Clarification Note</label>
                      <textarea className="input" rows={2} style={{ fontSize: 11, color: '#f59e0b' }}
                        value={selectedRecord.clarification_note}
                        onChange={e => handleUpdateField(selectedRecord.id, 'clarification_note', e.target.value)} />
                    </div>
                  )}

                  {/* Technical Validator */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 10, color: '#64748b' }}>
                    <span>Technical Validator: <strong style={{ color: '#94a3b8' }}>{selectedRecord.technical_validator}</strong></span>
                    <span>Last Checked: <strong style={{ color: '#94a3b8' }}>{new Date(selectedRecord.last_checked).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}