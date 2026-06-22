import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import type { Stakeholder, StakeholderCategory, AccessStatus } from '../types';

const categoryLabels: Record<StakeholderCategory, string> = {
  economic_buyer: 'Economic Buyer',
  technical_buyer: 'Technical Buyer',
  daily_user: 'Daily User',
  champion: 'Champion',
  blocker: 'Blocker',
  influencer: 'Influencer',
  executive_sponsor: 'Executive Sponsor',
  procurement_admin: 'Procurement',
  unknown_but_needed: 'Unknown — Needed',
};

const categoryColors: Record<StakeholderCategory, string> = {
  economic_buyer: 'red',
  technical_buyer: 'purple',
  daily_user: 'green',
  champion: 'green',
  blocker: 'red',
  influencer: 'blue',
  executive_sponsor: 'purple',
  procurement_admin: 'amber',
  unknown_but_needed: 'assumed',
};

const accessStatusLabels: Record<AccessStatus, string> = {
  known: 'Known', suspected: 'Suspected', unknown: 'Unknown',
  contacted: 'Contacted', meeting_booked: 'Meeting Booked',
  champion: 'Champion', blocker: 'Blocker',
};

const accessStatusColors: Record<AccessStatus, string> = {
  known: 'amber', suspected: 'assumed', unknown: 'assumed',
  contacted: 'blue', meeting_booked: 'green',
  champion: 'green', blocker: 'red',
};

export default function StakeholderMapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany } = useApp();
  const company = getCompany(id || '');

  if (!company) {
    return (
      <div>
        <PageHeader title="Stakeholder Map" />
        <EmptyState><EmptyStateIcon icon="🔍" /><EmptyStateTitle>Company not found</EmptyStateTitle>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>Back</button>
        </EmptyState>
      </div>
    );
  }

  const sortedStakeholders = [...company.stakeholders].sort((a, b) => b.buyingInfluence - a.buyingInfluence);
  const needToSpeakWith = sortedStakeholders.filter(s =>
    s.accessStatus === 'unknown' || s.accessStatus === 'suspected' || s.accessStatus === 'known'
  ).slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Stakeholder Map"
        subtitle={`${company.basic.name} — ${company.stakeholders.length} stakeholders identified`}
        actions={<button className="btn btn-secondary" onClick={() => navigate(`/company/${company.id}`)}>← Company Profile</button>}
      />

      {/* Need to Speak With */}
      {needToSpeakWith.length > 0 && (
        <div className="card mb-6" style={{ borderColor: '#f59e0b' }}>
          <div className="card-header">
            <span style={{ fontWeight: 600, fontSize: 13, color: '#f59e0b' }}>⚠️ Need to Speak With</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 12 }}>
              {needToSpeakWith.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#111827', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name || s.role}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{s.role} · {s.department}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`badge badge-${categoryColors[s.category] || 'assumed'}`} style={{ fontSize: 9 }}>
                      {categoryLabels[s.category] || s.category}
                    </span>
                    <span className={`badge badge-${accessStatusColors[s.accessStatus] || 'assumed'}`} style={{ fontSize: 9 }}>
                      {accessStatusLabels[s.accessStatus] || s.accessStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All stakeholders */}
      <div className="cards-grid">
        {sortedStakeholders.map(s => (
          <StakeholderCard key={s.id} stakeholder={s} />
        ))}
      </div>

      {company.stakeholders.length === 0 && (
        <EmptyState>
          <EmptyStateIcon icon="👥" />
          <EmptyStateTitle>No stakeholders identified</EmptyStateTitle>
          <EmptyStateDesc>Add people information to generate stakeholder analysis.</EmptyStateDesc>
        </EmptyState>
      )}
    </div>
  );
}

function StakeholderCard({ stakeholder: s }: { stakeholder: Stakeholder }) {
  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{s.name || 'Unknown'}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{s.role} · {s.department}</p>
          </div>
          <span className={`badge badge-${categoryColors[s.category] || 'assumed'}`} style={{ fontSize: 9 }}>
            {categoryLabels[s.category] || s.category}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Influence:</div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: '50%',
              background: i <= s.buyingInfluence ? '#3b82f6' : '#2a3a5c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: 'white', fontWeight: 700,
            }}>
              {i}
            </div>
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <span className={`badge badge-${accessStatusColors[s.accessStatus] || 'assumed'}`} style={{ fontSize: 9 }}>
              {accessStatusLabels[s.accessStatus] || s.accessStatus}
            </span>
          </div>
          <ConfidenceBadge level={s.confidence} size="sm" />
        </div>

        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          <div style={{ marginBottom: 6 }}><span className="text-muted">Cares about:</span> {s.whatTheyCareAbout}</div>
          <div style={{ marginBottom: 6 }}><span className="text-muted">Priorities:</span> {s.likelyPriorities}</div>
          <div style={{ marginBottom: 6 }}><span className="text-muted">Objections:</span> {s.likelyObjections}</div>
          <div style={{ marginBottom: 6 }}><span className="text-muted">Talk track:</span> {s.bestTalkTrack}</div>
          <div><span className="text-muted">Best proof:</span> {s.bestProof}</div>
        </div>
      </div>
    </div>
  );
}
