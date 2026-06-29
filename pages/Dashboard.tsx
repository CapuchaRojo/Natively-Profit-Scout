import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { CompanyCard } from '../components/CompanyCard';
import { DashboardIntelFeed } from '../components/DashboardIntelFeed';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import { scoreClientFit, scoreProviderFit } from '../services/pipelineFitScoring';
import {
  Building2,
  Target,
  Calendar,
  TrendingUp,
  Layers,
  Briefcase,
  GitMerge,
  Flag,
  Users,
  ShieldCheck,
  BarChart3,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { AccountType, ProductLane, PipelineStatus, Company, FitScore } from '../types';

// ── Helpers ──

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  client_lead: 'Client Lead',
  compute_provider: 'Compute Provider',
  partner: 'Partner',
  internal_target: 'Internal Target',
  unknown: 'Unknown',
};

const PRODUCT_LANE_LABELS: Record<ProductLane, string> = {
  builder: 'Builder',
  compute: 'Compute',
  relay: 'Relay',
  multiple: 'Multiple',
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

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  unset: '#64748b',
};

const PIPELINE_STATUS_COLORS: Record<PipelineStatus, string> = {
  new: '#64748b',
  researching: '#3b82f6',
  research: '#6366f1',
  qualified: '#8b5cf6',
  contacted: '#f59e0b',
  meeting: '#10b981',
  meeting_booked: '#06b6d4',
  active_conversation: '#10b981',
  nda_diligence: '#f97316',
  qualified_constituent: '#06b6d4',
  not_fit: '#ef4444',
  follow_up_later: '#f97316',
  monitor: '#a3a3a3',
  converted: '#22c55e',
  archived: '#6b7280',
};

function getFitScore(company: Company): FitScore {
  if (company.fitScore) return company.fitScore;
  if (company.accountType === 'compute_provider') {
    return scoreProviderFit(company);
  }
  return scoreClientFit(company);
}

function countBy<T extends string>(items: T[], values: readonly T[]): Record<T, number> {
  const counts = Object.fromEntries(values.map(v => [v, 0])) as Record<T, number>;
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}

// ── Sub-components ──

function BreakdownBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-muted truncate" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-bg-input rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs text-muted">{count}</span>
      <span className="w-10 text-right font-mono text-xs text-secondary">{pct}%</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string; size?: number }>; title: string }) {
  return (
    <h3 className="flex items-center gap-2 font-heading text-sm uppercase tracking-wider text-secondary mb-4">
      <Icon size={16} />
      {title}
    </h3>
  );
}

// ── Main Component ──

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, getDashboardMetrics } = useApp();
  const { companies } = state;
  const metrics = getDashboardMetrics();

  // ── Pipeline computations ──
  const pipelineStats = useMemo(() => {
    const accountTypes = companies.map(c => c.accountType);
    const productLanes = companies.map(c => c.productLane);
    const statuses = companies.map(c => c.pipelineStatus);
    const priorities = companies.map(c => c.priority);

    const acctTypeCounts = countBy(accountTypes, ['client_lead', 'compute_provider', 'partner', 'internal_target', 'unknown'] as const);
    const laneCounts = countBy(productLanes, ['builder', 'compute', 'relay', 'multiple', 'unknown'] as const);
    const statusCounts = countBy(statuses, ['new', 'researching', 'research', 'qualified', 'contacted', 'meeting', 'meeting_booked', 'active_conversation', 'nda_diligence', 'qualified_constituent', 'not_fit', 'follow_up_later', 'monitor', 'converted', 'archived'] as const);
    const priorityCounts = countBy(priorities, ['high', 'medium', 'low', 'unset'] as const);

    // Owner counts
    const ownerMap: Record<string, number> = {};
    for (const c of companies) {
      const owner = c.owner?.trim() || 'Unassigned';
      ownerMap[owner] = (ownerMap[owner] || 0) + 1;
    }
    const ownerEntries = Object.entries(ownerMap).sort((a, b) => b[1] - a[1]);

    // Fit scores
    const scored = companies.map(c => ({ company: c, fit: getFitScore(c) }));
    const avgFit = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.fit.total, 0) / scored.length)
      : 0;
    const topFit = [...scored].sort((a, b) => b.fit.total - a.fit.total).slice(0, 5);

    return { acctTypeCounts, laneCounts, statusCounts, priorityCounts, ownerEntries, avgFit, topFit };
  }, [companies]);

  const activePipelineStages = (['new', 'researching', 'research', 'qualified', 'contacted', 'meeting', 'meeting_booked', 'active_conversation', 'nda_diligence', 'qualified_constituent', 'monitor'] as PipelineStatus[])
    .reduce((sum, s) => sum + (pipelineStats.statusCounts[s] || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Pipeline command center — real-time account intelligence"
        actions={
          <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>
            <Plus size={16} className="inline mr-1" />
            New Analysis
          </button>
        }
      />

      {/* ── Top Metrics Row ── */}
      <div className="metrics-grid">
        <StatCard
          label="Total Accounts"
          value={companies.length}
          icon={<Building2 size={20} />}
          color="blue"
        />
        <StatCard
          label="Active Pipeline"
          value={activePipelineStages}
          icon={<Target size={20} />}
          color="green"
        />
        <StatCard
          label="Avg Fit Score"
          value={`${pipelineStats.avgFit}%`}
          icon={<BarChart3 size={20} />}
          color={pipelineStats.avgFit >= 50 ? 'green' : pipelineStats.avgFit >= 25 ? 'amber' : 'red'}
        />
        <StatCard
          label="Upcoming Follow-ups"
          value={metrics.upcomingFollowups}
          icon={<Calendar size={20} />}
          color="purple"
        />
      </div>

      {/* ── Live Intel Feed ── */}
      <DashboardIntelFeed />

      {/* ── Pipeline Breakdown Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Account Types */}
        <div className="card p-4">
          <SectionHeader icon={Briefcase} title="Account Types" />
          <div className="flex flex-col gap-2">
            {(Object.entries(pipelineStats.acctTypeCounts) as [AccountType, number][])
              .filter(([, c]) => c > 0)
              .map(([type, count]) => (
                <BreakdownBar
                  key={type}
                  label={ACCOUNT_TYPE_LABELS[type]}
                  count={count}
                  total={companies.length}
                  color="#3b82f6"
                />
              ))}
            {companies.length === 0 && (
              <p className="text-muted text-sm py-2">No accounts yet — add some in Pipeline Scout</p>
            )}
          </div>
        </div>

        {/* Product Lanes */}
        <div className="card p-4">
          <SectionHeader icon={Layers} title="Product Lanes" />
          <div className="flex flex-col gap-2">
            {(Object.entries(pipelineStats.laneCounts) as [ProductLane, number][])
              .filter(([, c]) => c > 0)
              .map(([lane, count]) => (
                <BreakdownBar
                  key={lane}
                  label={PRODUCT_LANE_LABELS[lane]}
                  count={count}
                  total={companies.length}
                  color={lane === 'builder' ? '#3b82f6' : lane === 'compute' ? '#06b6d4' : lane === 'relay' ? '#f59e0b' : '#64748b'}
                />
              ))}
            {companies.length === 0 && (
              <p className="text-muted text-sm py-2">No accounts yet</p>
            )}
          </div>
        </div>

        {/* Priority */}
        <div className="card p-4">
          <SectionHeader icon={Flag} title="Priority" />
          <div className="flex flex-col gap-2">
            {(Object.entries(pipelineStats.priorityCounts) as [string, number][])
              .filter(([, c]) => c > 0)
              .map(([priority, count]) => (
                <BreakdownBar
                  key={priority}
                  label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                  count={count}
                  total={companies.length}
                  color={PRIORITY_COLORS[priority] || '#64748b'}
                />
              ))}
            {companies.length === 0 && (
              <p className="text-muted text-sm py-2">No accounts yet</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Pipeline Status + Owner Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline Status */}
        <div className="card p-4">
          <SectionHeader icon={GitMerge} title="Pipeline Status" />
          <div className="flex flex-col gap-2">
            {(Object.entries(pipelineStats.statusCounts) as [PipelineStatus, number][])
              .filter(([, c]) => c > 0)
              .map(([status, count]) => (
                <BreakdownBar
                  key={status}
                  label={PIPELINE_STATUS_LABELS[status]}
                  count={count}
                  total={companies.length}
                  color={PIPELINE_STATUS_COLORS[status]}
                />
              ))}
            {companies.length === 0 && (
              <p className="text-muted text-sm py-2">No accounts in pipeline yet</p>
            )}
          </div>
        </div>

        {/* Owner Breakdown */}
        <div className="card p-4">
          <SectionHeader icon={Users} title="Owner Breakdown" />
          {pipelineStats.ownerEntries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pipelineStats.ownerEntries.map(([owner, count]) => (
                <BreakdownBar
                  key={owner}
                  label={owner}
                  count={count}
                  total={companies.length}
                  color="#8b5cf6"
                />
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm py-2">All accounts unassigned — assign owners in Pipeline Scout</p>
          )}
        </div>
      </div>

      {/* ── Fit Score Leaderboard ── */}
      {pipelineStats.topFit.length > 0 && (
        <div className="mb-6">
          <SectionHeader icon={TrendingUp} title="Top 5 by Fit Score" />
          <div className="card p-4">
            <div className="flex flex-col gap-1">
              {pipelineStats.topFit.map(({ company, fit }, i) => (
                <div
                  key={company.id}
                  className="flex items-center gap-4 p-3 rounded-md hover:bg-bg-input transition-colors duration-200 cursor-pointer"
                  onClick={() => navigate(`/company/${company.id}`)}
                >
                  <span className="font-mono text-xs text-muted w-6">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{company.basic.name}</p>
                    <p className="text-xs text-muted truncate">
                      {ACCOUNT_TYPE_LABELS[company.accountType]} · {PRODUCT_LANE_LABELS[company.productLane]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span
                        className={`font-mono text-lg font-bold ${fit.total >= 50 ? 'text-accent-green' : fit.total >= 25 ? 'text-accent-amber' : 'text-accent-red'}`}
                      >
                        {fit.total}%
                      </span>
                      <p className="text-[10px] text-muted uppercase tracking-wide">{fit.confidence}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmed (Converted) Accounts ── */}
      {pipelineStats.statusCounts.converted > 0 && (
        <div className="mb-6">
          <SectionHeader icon={ShieldCheck} title={`Converted (${pipelineStats.statusCounts.converted})`} />
          <div className="cards-grid">
            {companies
              .filter(c => c.pipelineStatus === 'converted')
              .map(c => <CompanyCard key={c.id} company={c} />)}
          </div>
        </div>
      )}

      {/* ── Recent Analyses ── */}
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
            <EmptyStateIcon icon={<Target size={32} />} />
            <EmptyStateTitle>No analyses yet</EmptyStateTitle>
            <EmptyStateDesc>
              Start by analyzing a new company to get sales intelligence insights.
            </EmptyStateDesc>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={() => navigate('/new-analysis')}>
                <Plus size={16} className="inline mr-1" />
                New Analysis
              </button>
            </div>
          </EmptyState>
        )}
      </div>

      {/* ── Top Recommended Targets ── */}
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
