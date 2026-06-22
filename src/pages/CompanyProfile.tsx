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
