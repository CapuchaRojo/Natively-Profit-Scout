import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import type { Company, CompanyProfile } from '../types';

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany, updateCompany, regenerateAnalysis } = useApp();
  const company = getCompany(id || '');

  if (!company) {
    return (
      <div>
        <PageHeader title="Company Profile" subtitle="View detailed company analysis" />
        <EmptyState>
          <EmptyStateIcon icon="🔍" />
          <EmptyStateTitle>Company not found</EmptyStateTitle>
          <EmptyStateDesc>Select a company from the dashboard or sidebar to view its profile.</EmptyStateDesc>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: 16 }}>
            Back to Dashboard
          </button>
        </EmptyState>
      </div>
    );
  }

  const handleRegenerate = () => {
    regenerateAnalysis(company.id);
  };

  return (
    <div>
      <PageHeader
        title={company.basic.name}
        subtitle={`${company.basic.industry} · ${company.basic.location} · ${company.basic.employeeCount} employees`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleRegenerate}>
              🔄 Regenerate Analysis
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/company/${company.id}/pain-points`)}>
              View Pain Points →
            </button>
          </div>
        }
      />

      {/* Company Quick Info */}
      <div className="cards-grid mb-6">
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>Company</span></div>
          <div className="card-body" style={{ fontSize: 13 }}>
            <div><span className="text-muted">Website:</span> {company.basic.website}</div>
            <div><span className="text-muted">Revenue:</span> {company.basic.revenueEstimate || 'Unknown'}</div>
            <div><span className="text-muted">Model:</span> {company.business.salesModel || 'Unknown'}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>Intelligence</span></div>
          <div className="card-body" style={{ fontSize: 13 }}>
            <div><span className="text-muted">Pain Points:</span> {company.painPoints.length} identified</div>
            <div><span className="text-muted">Stakeholders:</span> {company.stakeholders.length} identified</div>
            <div><span className="text-muted">Opportunities:</span> {company.opportunities.length} identified</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>Scoring</span></div>
          <div className="card-body" style={{ fontSize: 13 }}>
            {company.profile && (
              <>
                <div><span className="text-muted">Operational:</span> {company.profile.operationalMaturity.level} <ConfidenceBadge level={company.profile.operationalMaturity.confidence} size="sm" /></div>
                <div><span className="text-muted">Digital:</span> {company.profile.digitalMaturity.level} <ConfidenceBadge level={company.profile.digitalMaturity.confidence} size="sm" /></div>
                <div><span className="text-muted">AI Readiness:</span> {company.profile.aiReadiness.level} <ConfidenceBadge level={company.profile.aiReadiness.confidence} size="sm" /></div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recon Intelligence Card */}
      {(company.aggressiveRecon || company.reconFindings) && (
        <ReconIntelCard company={company} />
      )}

      {/* Research Notes */}
      {company.basic.notes && (
        <div className="card mb-6">
          <div className="card-header">
            <span className="input-label" style={{ margin: 0 }}>Research Notes</span>
            <VerifiedBadge verified />
          </div>
          <div className="card-body" style={{ fontSize: 13, color: '#94a3b8' }}>
            {company.basic.notes}
          </div>
        </div>
      )}

      {/* Profile Sections */}
      {company.profile ? <ProfileSections profile={company.profile} /> : (
        <EmptyState>
          <EmptyStateIcon icon="📝" />
          <EmptyStateTitle>No profile generated yet</EmptyStateTitle>
          <EmptyStateDesc>Click "Regenerate Analysis" to generate a full company profile.</EmptyStateDesc>
        </EmptyState>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
        {[
          { path: `/company/${company.id}/pain-points`, label: '❌ Pain Points', color: 'red' },
          { path: `/company/${company.id}/stakeholders`, label: '👥 Stakeholders', color: 'purple' },
          { path: `/company/${company.id}/tools`, label: '🔧 Tools & Workflow', color: 'blue' },
          { path: `/company/${company.id}/opportunities`, label: '⚡ Opportunities', color: 'amber' },
          { path: `/company/${company.id}/plan`, label: '📋 Profit Plan', color: 'green' },
          { path: `/company/${company.id}/export`, label: '📤 CRM Export', color: 'blue' },
        ].map(link => (
          <button
            key={link.path}
            className="btn btn-secondary"
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#111827', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
        Last updated: {new Date(company.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function ProfileSections({ profile }: { profile: CompanyProfile }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div>
      <h2 className="section-title">Company Profile</h2>
      <p className="section-subtitle">{profile.summary}</p>

      {/* Maturity bars */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="mb-4">
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Best Conversation Angle</div>
            <div className="badge badge-blue">{profile.bestConversationAngle}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <MaturityBar label="Operational Maturity" level={profile.operationalMaturity.level} />
            <MaturityBar label="Digital Maturity" level={profile.digitalMaturity.level} />
            <MaturityBar label="AI Readiness" level={profile.aiReadiness.level} />
            <MaturityBar label="Budget Likelihood" level={profile.budgetLikelihood.level} />
          </div>
        </div>
      </div>

      {/* Profile sections */}
      {profile.sections.map(section => (
        <div key={section.title} className="card mb-4">
          <div
            className="card-header"
            onClick={() => setExpanded(expanded === section.title ? null : section.title)}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>{section.title}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ConfidenceBadge level={section.confidence} size="sm" />
              <span style={{ fontSize: 12, color: '#64748b' }}>{expanded === section.title ? '▲' : '▼'}</span>
            </div>
          </div>
          {expanded === section.title && (
            <div className="card-body" style={{ fontSize: 13, color: '#94a3b8' }}>
              <div style={{ marginBottom: 12 }}>{section.findings}</div>
              <div style={{ marginBottom: 8 }}>
                <span className="text-muted">Evidence:</span> {section.evidence || 'None'}
              </div>
              {section.missingInfo && (
                <div>
                  <span className="text-muted">Missing info:</span>{' '}
                  <span className="text-accent-amber">{section.missingInfo}</span>
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <CopyButton text={section.findings} label="Copy finding" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function MaturityBar({ label, level }: { label: string; level: string }) {
  const levels = ['Low Digital Adoption', 'Pre-AI', 'Small Business', 'Limited', 'Emerging', 'Digitally Transitioning', 'AI-Ready', 'Moderate', 'Structured', 'Digitally Advanced', 'AI-Aware', 'Significant'];
  const idx = levels.indexOf(level);
  const pct = idx >= 0 ? Math.round((idx + 1) / levels.length * 100) : 50;

  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="progress-bar" style={{ flex: 1 }}>
          <div
            className={`progress-fill ${pct >= 70 ? 'progress-fill-green' : pct >= 40 ? 'progress-fill-blue' : 'progress-fill-amber'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', minWidth: 80, textAlign: 'right' }}>{level}</span>
      </div>
    </div>
  );
}

function ReconIntelCard({ company }: { company: Company }) {
  const navigate = useNavigate();
  const ar = company.aggressiveRecon;
  const rf = company.reconFindings;

  // Helper to extract signal types
  const allSearchSignals = ar?.searchIntel?.flatMap(si => si.signals) || [];
  const allNewsSignals = ar?.newsIntel?.flatMap(ni => ni.signals) || [];
  const growthSignals = allSearchSignals.filter(s => s.type === 'funding' || s.type === 'expansion' || s.type === 'growth');
  const riskSignals = allSearchSignals.filter(s => s.type === 'layoffs' || s.type === 'restructuring');
  const partnershipSignals = allSearchSignals.filter(s => s.type === 'partnership');

  const hasReconData = !!(ar || rf?.detectedTools?.length || rf?.inferredWorkflows?.length || rf?.peopleSignals?.roleMap?.length);

  if (!hasReconData) return null;

  return (
    <div className="card mb-6" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="input-label" style={{ margin: 0 }}>
          📊 Recon Intelligence
          {ar && <span style={{ fontSize: 10, color: '#10b981', marginLeft: 8 }}>Aggressive Recon</span>}
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/company/${company.id}/recon`)}
          style={{ fontSize: 11, cursor: 'pointer' }}
        >
          Open Full Recon →
        </button>
      </div>
      <div className="card-body" style={{ display: 'grid', gap: 12 }}>
        {/* Summary Stats */}
        {ar && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
            {ar.extractedPeople.length > 0 && (
              <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(10,14,23,0.5)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.15)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>{ar.extractedPeople.length}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>People</div>
              </div>
            )}
            {ar.linkedInJobs.length > 0 && (
              <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(10,14,23,0.5)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#3b82f6' }}>{ar.linkedInJobs.length}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Jobs</div>
              </div>
            )}
            {allSearchSignals.length > 0 && (
              <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(10,14,23,0.5)', borderRadius: 6, border: '1px solid rgba(6,182,212,0.15)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#06b6d4' }}>{allSearchSignals.length}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Signals</div>
              </div>
            )}
            {allNewsSignals.length > 0 && (
              <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(10,14,23,0.5)', borderRadius: 6, border: '1px solid rgba(168,85,247,0.15)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#a855f7' }}>{allNewsSignals.length}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>News</div>
              </div>
            )}
            {ar.socialDiscoveryUrls?.length > 0 && (
              <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(10,14,23,0.5)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.15)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{ar.socialDiscoveryUrls.length}</div>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Social</div>
              </div>
            )}
          </div>
        )}

        {/* Summary text */}
        {ar?.summary && (
          <div style={{ fontSize: 12, color: '#10b981', padding: '8px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.15)' }}>
            {ar.summary}
          </div>
        )}

        {/* Extracted People (top 5) */}
        {ar?.extractedPeople?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>
              Key People ({ar.extractedPeople.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ar.extractedPeople.slice(0, 8).map((p, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {p.name}{p.role ? ` · ${p.role}` : ''}
                </span>
              ))}
              {ar.extractedPeople.length > 8 && (
                <span style={{ fontSize: 10, color: '#64748b' }}>+{ar.extractedPeople.length - 8} more</span>
              )}
            </div>
          </div>
        )}

        {/* LinkedIn Company snippet */}
        {ar?.linkedInCompany && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12 }}>
            {ar.linkedInCompany.industry && (
              <span><span style={{ color: '#64748b' }}>Industry:</span> <span style={{ color: '#e2e8f0' }}>{ar.linkedInCompany.industry}</span></span>
            )}
            {ar.linkedInCompany.employeeRange && (
              <span><span style={{ color: '#64748b' }}>Size:</span> <span style={{ color: '#e2e8f0' }}>{ar.linkedInCompany.employeeRange}</span></span>
            )}
            {ar.linkedInCompany.headquarters && (
              <span><span style={{ color: '#64748b' }}>HQ:</span> <span style={{ color: '#e2e8f0' }}>{ar.linkedInCompany.headquarters}</span></span>
            )}
          </div>
        )}

        {/* Growth indicators */}
        {ar?.linkedInCompany?.growthIndicators?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ar.linkedInCompany.growthIndicators.slice(0, 6).map((g, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Key Signals (growth, risk, partnership) */}
        {growthSignals.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>Growth Signals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {growthSignals.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#e2e8f0' }}>
                  <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, background: 'rgba(16,185,129,0.12)', color: '#10b981', marginRight: 6 }}>{s.type}</span>
                  {s.title}{s.nativelyAngle && <span style={{ color: '#10b981', marginLeft: 6 }}>→ {s.nativelyAngle}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {riskSignals.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>Risk Signals</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {riskSignals.slice(0, 3).map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#e2e8f0' }}>
                  <span style={{ padding: '1px 5px', borderRadius: 3, fontSize: 9, background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginRight: 6 }}>{s.type}</span>
                  {s.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recon findings summary (tools, workflows, people signals) */}
        {!ar && rf && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
            {rf.detectedTools?.length > 0 && (
              <span><span style={{ color: '#64748b' }}>Tools:</span> <span style={{ color: '#e2e8f0' }}>{rf.detectedTools.length}</span></span>
            )}
            {rf.inferredWorkflows?.length > 0 && (
              <span><span style={{ color: '#64748b' }}>Workflows:</span> <span style={{ color: '#e2e8f0' }}>{rf.inferredWorkflows.length}</span></span>
            )}
            {rf.peopleSignals?.roleMap?.length > 0 && (
              <span><span style={{ color: '#64748b' }}>Roles:</span> <span style={{ color: '#e2e8f0' }}>{rf.peopleSignals.roleMap.length}</span></span>
            )}
            {rf.openings?.length > 0 && (
              <span><span style={{ color: '#64748b' }}>Openings:</span> <span style={{ color: '#e2e8f0' }}>{rf.openings.length}</span></span>
            )}
            <span style={{ color: '#64748b', fontSize: 10 }}>Scanned: {new Date(rf.scanDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Social links */}
        {ar?.socialDiscoveryUrls?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ar.socialDiscoveryUrls.filter(u => u.confidence !== 'Low').slice(0, 5).map((u, i) => (
              <a key={i} href={u.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', textDecoration: 'none', cursor: 'pointer' }}
              >
                {u.platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
