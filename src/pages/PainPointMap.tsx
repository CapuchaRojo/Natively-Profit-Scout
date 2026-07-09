import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import type { PainPoint, PainDepartment } from '../types';

const departmentLabels: Record<PainDepartment, string> = {
  sales: 'Sales', marketing: 'Marketing', customer_support: 'Support',
  operations: 'Operations', admin: 'Admin', finance: 'Finance',
  hr_recruiting: 'HR/Recruiting', it_security: 'IT/Security',
  field_service: 'Field Service', leadership_reporting: 'Leadership',
};

export default function PainPointMapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany, updateCompany, setCurrentCompany } = useApp();
  const company = getCompany(id || '');

  // Ensure sidebar enables company tabs when viewing via URL
  useEffect(() => {
    if (id) setCurrentCompany(id);
  }, [id, setCurrentCompany]);
  const [expandedPain, setExpandedPain] = useState<string | null>(null);

  if (!company) {
    return (
      <div>
        <PageHeader title="Pain Point Map" />
        <EmptyState>
          <EmptyStateIcon icon="🔍" />
          <EmptyStateTitle>Company not found</EmptyStateTitle>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </EmptyState>
      </div>
    );
  }

  const sortedPains = [...company.painPoints].sort((a, b) => {
    const scoreA = a.severity + a.frequency + a.revenueImpactScore;
    const scoreB = b.severity + b.frequency + b.revenueImpactScore;
    return scoreB - scoreA;
  });
  // Check for recon data
  const recon = company.reconFindings;
  const detectedTools = recon?.detectedTools || [];
  const inferredWorkflows = recon?.inferredWorkflows || [];
  const hasReconData = detectedTools.length > 0 || inferredWorkflows.length > 0;

  const handleGenerateFromRecon = () => {
    if (!company || inferredWorkflows.length === 0) return;

    // Build a dedup set from existing pain points (by name + symptoms)
    const existingKeys = new Set(
      company.painPoints.map(p => `${p.name}|${p.symptoms}`)
    );

    const newPains: PainPoint[] = inferredWorkflows
      .filter(wf => {
        const name = wf.workflowName || wf.name;
        const evidence = (wf.possibleBottleneck || wf.evidence || '').slice(0, 200);
        return !existingKeys.has(`${name}|${evidence}`);
      })
      .map(wf => ({
        id: `pain-recon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: wf.workflowName || wf.name,
        department: (wf.department || 'operations').toLowerCase() as PainDepartment,
        symptoms: (wf.possibleBottleneck || wf.evidence || 'Recon-based pain point — validate with customer').slice(0, 200),
        likelyCost: 'Recon estimate — validate with customer',
        timeLost: 'To be quantified during discovery',
        revenueImpact: 'To be quantified during discovery',
        automationOpportunity: wf.automationOpportunity || 'Automation opportunity identified from public recon',
        suggestedSolution: wf.suggestedNativeBuilderDemo || 'Natively automation solution (recon-based)',
        confidence: wf.confidence || 'Medium',
        discoveryQuestion: wf.discoveryQuestion || 'How does this process work today?',
        severity: 3, frequency: 3, revenueImpactScore: 3, easeOfSolution: 3, decisionMakerVisibility: 3,
      }));

    if (newPains.length === 0) return;

    // Merge recon-generated pain points into company record — no regenerateAnalysis
    // since it would overwrite these new items with template-based ones
    updateCompany(company.id, {
      painPoints: [...company.painPoints, ...newPains],
    });
  };

  return (
    <div>
      <PageHeader
        title="Pain Point Map"
        subtitle={`${company.basic.name} — ${company.painPoints.length} pain points identified`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/company/${company.id}`)}>
              ← Company Profile
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/company/${company.id}/opportunities`)}>
              View Opportunities →
            </button>
          </div>
        }
      />

      {hasReconData && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#10b981' }}>
            📡 Recon data available: {detectedTools.length} tools, {inferredWorkflows.length} workflows detected
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleGenerateFromRecon}>
            ❌ Generate from Recon
          </button>
        </div>
      )}

      {company.painPoints.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon icon="✅" />
          <EmptyStateTitle>No pain points identified</EmptyStateTitle>
          <EmptyStateDesc>Add more data about this company to generate pain point analysis.</EmptyStateDesc>
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>
              🔍 Generate from Recon
            </button>
          </div>
        </EmptyState>
      ) : (
        <div>
          <div className="metrics-grid mb-6">
            <PainStatCard label="Total Pains" value={company.painPoints.length} color="blue" />
            <PainStatCard label="Avg Severity" value={(company.painPoints.reduce((s, p) => s + p.severity, 0) / company.painPoints.length).toFixed(1)} color="red" />
            <PainStatCard label="High Confidence" value={company.painPoints.filter(p => p.confidence === 'High').length} color="green" />
            <PainStatCard label="Total Opp. Score" value={`${Math.round(sortedPains.slice(0, 3).reduce((s, p) => s + p.severity + p.frequency + p.revenueImpactScore + p.easeOfSolution + p.decisionMakerVisibility, 0) / 25 * 100)}%`} color="amber" />
          </div>

          {sortedPains.map((pain, idx) => {
            const total = pain.severity + pain.frequency + pain.revenueImpactScore;
            const isExpanded = expandedPain === pain.id;
            return (
              <div key={pain.id} className="card mb-3">
                <div
                  className="card-body"
                  onClick={() => setExpandedPain(isExpanded ? null : pain.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="badge badge-blue" style={{ fontSize: 10, minWidth: 20, textAlign: 'center' }}>#{idx + 1}</span>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{pain.name}</h3>
                      <span className={`badge badge-${pain.department === 'sales' ? 'blue' : pain.department === 'customer_support' ? 'green' : pain.department === 'it_security' ? 'red' : 'amber'}`} style={{ fontSize: 10 }}>
                        {departmentLabels[pain.department] || pain.department}
                      </span>
                      <ConfidenceBadge level={pain.confidence} size="sm" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: total >= 10 ? '#10b981' : total >= 7 ? '#f59e0b' : '#ef4444' }}>
                        {total}/15
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <ScoreBar label="Severity" value={pain.severity} max={5} color="red" />
                    <ScoreBar label="Frequency" value={pain.frequency} max={5} color="amber" />
                    <ScoreBar label="Revenue Impact" value={pain.revenueImpactScore} max={5} color="green" />
                    <ScoreBar label="Ease of Solution" value={pain.easeOfSolution} max={5} color="blue" />
                    <ScoreBar label="DM Visibility" value={pain.decisionMakerVisibility} max={5} color="purple" />
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 16, borderTop: '1px solid #2a3a5c', paddingTop: 12 }}>
                      <DetailRow label="Symptoms" value={pain.symptoms} />
                      <DetailRow label="Likely Cost" value={pain.likelyCost} />
                      <DetailRow label="Time Lost" value={pain.timeLost} />
                      <DetailRow label="Revenue Impact" value={pain.revenueImpact} />
                      <DetailRow label="Automation Opportunity" value={pain.automationOpportunity} />
                      <DetailRow label="Suggested Solution" value={pain.suggestedSolution} />
                      <DetailRow label="Discovery Question" value={pain.discoveryQuestion} />
                      {pain.id.startsWith('pain-recon') && (
                        <div style={{ marginTop: 8 }}>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>
                            📡 Recon-sourced
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PainStatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6' };
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color: colorMap[color] || colorMap.blue }}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  const colorMap: Record<string, string> = { blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', purple: '#8b5cf6' };
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: colorMap[color] || colorMap.blue }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="text-muted" style={{ fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#94a3b8' }}>{value}</div>
    </div>
  );
}
