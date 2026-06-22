import { useNavigate } from 'react-router-dom';
import type { Company } from '../types';
import { ConfidenceBadge } from './ConfidenceBadge';

interface Props {
  company: Company;
}

export function CompanyCard({ company }: Props) {
  const navigate = useNavigate();
  const painScore = company.painPoints.reduce((s, p) => s + p.severity, 0);
  const maxScore = company.painPoints.length * 5;
  const scorePct = maxScore > 0 ? Math.round((painScore / maxScore) * 100) : 0;

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', marginBottom: 0 }}
      onClick={() => navigate(`/company/${company.id}`)}
    >
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
              {company.basic.name}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              {company.basic.industry} · {company.basic.employeeCount} employees
            </p>
          </div>
          <div className="score-circle" style={{
            borderColor: scorePct >= 60 ? '#10b981' : scorePct >= 30 ? '#f59e0b' : '#ef4444',
            color: scorePct >= 60 ? '#10b981' : scorePct >= 30 ? '#f59e0b' : '#ef4444',
            width: 40, height: 40, fontSize: 13,
          }}>
            {scorePct}
          </div>
        </div>

        {/* Pain points preview */}
        {company.painPoints.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Key Pain Points
            </div>
            {company.painPoints.slice(0, 2).map(p => (
              <div key={p.id} style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>
                · {p.name}
              </div>
            ))}
          </div>
        )}

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {company.isSample && (
              <span className="badge badge-blue" style={{ fontSize: 9 }}>Sample</span>
            )}
            {company.crmExport?.prospectStatus && (
              <span className={`badge badge-${company.crmExport.prospectStatus === 'hot' ? 'red' : company.crmExport.prospectStatus === 'warm' ? 'amber' : 'assumed'}`} style={{ fontSize: 9 }}>
                {company.crmExport.prospectStatus}
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {company.painPoints.length} pains · {company.opportunities.length} opps
          </span>
        </div>
      </div>
    </div>
  );
}
