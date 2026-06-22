import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { CompanyCard } from '../components/CompanyCard';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getDashboardMetrics, state } = useApp();
  const metrics = getDashboardMetrics();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your sales intelligence command center"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>
            ➕ New Analysis
          </button>
        }
      />

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <StatCard
          label="Total Companies"
          value={metrics.totalCompanies}
          icon="📊"
          color="blue"
        />
        <StatCard
          label="Hot Prospects"
          value={metrics.hotProspects}
          icon="🔥"
          color="red"
          onClick={() => navigate('/')}
        />
        <StatCard
          label="Warm Prospects"
          value={metrics.warmProspects}
          icon="🌡️"
          color="amber"
        />
        <StatCard
          label="Cold / Unknown"
          value={metrics.coldUnknown}
          icon="🧊"
          color="blue"
        />
        <StatCard
          label="Avg Opportunity Score"
          value={`${metrics.averageOpportunityScore}%`}
          icon="🎯"
          color={metrics.averageOpportunityScore >= 60 ? 'green' : metrics.averageOpportunityScore >= 30 ? 'amber' : 'red'}
        />
        <StatCard
          label="Upcoming Follow-ups"
          value={metrics.upcomingFollowups}
          icon="📅"
          color="purple"
        />
      </div>

      {/* Recent Analyses */}
      <div className="mb-6">
        <h2 className="section-title">Recent Analyses</h2>
        {metrics.recentAnalyses.length > 0 ? (
          <div className="cards-grid">
            {metrics.recentAnalyses.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <EmptyState>
            <EmptyStateIcon icon="📋" />
            <EmptyStateTitle>No analyses yet</EmptyStateTitle>
            <EmptyStateDesc>
              Start by analyzing a new company to get sales intelligence insights.
            </EmptyStateDesc>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>
                ➕ New Analysis
              </button>
            </div>
          </EmptyState>
        )}
      </div>

      {/* Top Recommended Targets */}
      {metrics.topTargets.length > 0 && (
        <div>
          <h2 className="section-title">Top Recommended Targets</h2>
          <p className="section-subtitle">
            Companies with highest opportunity scores — sorted by overall fit
          </p>
          <div className="cards-grid">
            {metrics.topTargets.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
