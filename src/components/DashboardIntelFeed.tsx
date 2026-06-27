import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Radar,
  UserCheck,
  Briefcase,
  Newspaper,
  ChevronRight,
  Clock,
  Search,
} from 'lucide-react';
import type { Company } from '../types';

// ── Types ──

interface IntelFeedItem {
  companyId: string;
  companyName: string;
  website: string;
  pipelineStatus: string;
  priority: string;
  scannedAt: string;
  peopleCount: number;
  jobCount: number;
  searchSignalCount: number;
  newsSignalCount: number;
  topSignal: string;
}

interface IntelFeedAggregate {
  items: IntelFeedItem[];
  totalCompaniesWithRecon: number;
  totalPeopleExtracted: number;
  totalJobsFound: number;
  totalSearchSignals: number;
  totalNewsSignals: number;
  freshestScan: string | null;
}

// ── Helpers ──

function extractFeedItems(companies: Company[]): IntelFeedAggregate {
  const items: IntelFeedItem[] = [];

  for (const c of companies) {
    const recon = c.aggressiveRecon;
    if (!recon) continue;

    const peopleCount = recon.extractedPeople?.length || 0;
    const jobCount = recon.linkedInJobs?.length || 0;
    const searchSignalCount = recon.searchIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0;
    const newsSignalCount = recon.newsIntel?.reduce((sum, q) => sum + (q.signals?.length || 0), 0) || 0;

    // Find the most impactful signal summary
    let topSignal = '';
    if (peopleCount > 0 && recon.extractedPeople[0]?.role) {
      topSignal = `${recon.extractedPeople[0].name} (${recon.extractedPeople[0].role})`;
    } else if (recon.summary) {
      topSignal = recon.summary.slice(0, 80);
    } else if (jobCount > 0 && recon.linkedInJobs[0]?.title) {
      topSignal = `Hiring: ${recon.linkedInJobs[0].title}`;
    } else if (searchSignalCount > 0 && recon.searchIntel?.[0]?.signals?.[0]?.title) {
      topSignal = recon.searchIntel[0].signals[0].title.slice(0, 80);
    }

    items.push({
      companyId: c.id,
      companyName: c.basic.name,
      website: c.basic.website,
      pipelineStatus: c.pipelineStatus,
      priority: c.priority,
      scannedAt: recon.scannedAt,
      peopleCount,
      jobCount,
      searchSignalCount,
      newsSignalCount,
      topSignal,
    });
  }

  items.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());

  const totalPeopleExtracted = items.reduce((sum, i) => sum + i.peopleCount, 0);
  const totalJobsFound = items.reduce((sum, i) => sum + i.jobCount, 0);
  const totalSearchSignals = items.reduce((sum, i) => sum + i.searchSignalCount, 0);
  const totalNewsSignals = items.reduce((sum, i) => sum + i.newsSignalCount, 0);

  return {
    items,
    totalCompaniesWithRecon: items.length,
    totalPeopleExtracted,
    totalJobsFound,
    totalSearchSignals,
    totalNewsSignals,
    freshestScan: items[0]?.scannedAt || null,
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Sub-components ──

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-input border border-border">
      <span className="font-mono text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-secondary">{label}</span>
    </div>
  );
}

function IntelRow({
  item,
  onClick,
}: {
  item: IntelFeedItem;
  onClick: (id: string) => void;
}) {
  const priorityColor =
    item.priority === 'high' ? 'var(--color-accent-red)'
    : item.priority === 'medium' ? 'var(--color-accent-amber)'
    : item.priority === 'low' ? 'var(--color-accent)'
    : 'var(--color-muted)';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-input transition-colors duration-200 cursor-pointer border border-transparent hover:border-border"
      onClick={() => onClick(item.companyId)}
    >
      {/* Priority dot */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: priorityColor }}
        title={`Priority: ${item.priority}`}
      />

      {/* Company info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{item.companyName}</p>
          {item.priority === 'high' && (
            <span className="text-[10px] font-mono uppercase text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded">
              Hot
            </span>
          )}
        </div>
        <p className="text-xs text-muted truncate mt-0.5">{item.topSignal || 'No signal summary'}</p>
      </div>

      {/* Signal badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.peopleCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-green" title={`${item.peopleCount} people extracted`}>
            <UserCheck size={12} />
            {item.peopleCount}
          </span>
        )}
        {item.jobCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-cyan" title={`${item.jobCount} jobs found`}>
            <Briefcase size={12} />
            {item.jobCount}
          </span>
        )}
        {item.searchSignalCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent" title={`${item.searchSignalCount} search signals`}>
            <Search size={12} />
            {item.searchSignalCount}
          </span>
        )}
        {item.newsSignalCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-accent-amber" title={`${item.newsSignalCount} news signals`}>
            <Newspaper size={12} />
            {item.newsSignalCount}
          </span>
        )}
      </div>

      {/* Time */}
      <span className="text-xs text-muted font-mono flex-shrink-0 w-14 text-right" title={formatDate(item.scannedAt)}>
        {timeAgo(item.scannedAt)}
      </span>

      <ChevronRight size={14} className="text-muted flex-shrink-0" />
    </div>
  );
}

// ── Main Component ──

export function DashboardIntelFeed() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { companies } = state;

  const aggregate = useMemo(() => extractFeedItems(companies), [companies]);

  if (aggregate.totalCompaniesWithRecon === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-accent" />
          <h2 className="text-sm font-heading uppercase tracking-wider text-secondary">
            Intel Feed
          </h2>
          {aggregate.freshestScan && (
            <span className="flex items-center gap-1 text-[11px] text-muted font-mono">
              <Clock size={11} />
              Latest: {timeAgo(aggregate.freshestScan)}
            </span>
          )}
        </div>
        <span className="text-xs text-muted font-mono">
          {aggregate.totalCompaniesWithRecon} account{aggregate.totalCompaniesWithRecon !== 1 ? 's' : ''} with recon
        </span>
      </div>

      {/* Stats pills row */}
      <div className="flex flex-wrap gap-3 mb-4">
        <StatPill
          label="People Found"
          value={aggregate.totalPeopleExtracted}
          color="oklch(0.72 0.15 150)"
        />
        <StatPill
          label="Jobs Detected"
          value={aggregate.totalJobsFound}
          color="oklch(0.72 0.14 195)"
        />
        <StatPill
          label="Search Signals"
          value={aggregate.totalSearchSignals}
          color="oklch(0.62 0.19 242.75)"
        />
        <StatPill
          label="News Items"
          value={aggregate.totalNewsSignals}
          color="oklch(0.78 0.15 80)"
        />
      </div>

      {/* Feed list */}
      <div className="card p-1">
        {aggregate.items.slice(0, 8).map(item => (
          <IntelRow
            key={item.companyId}
            item={item}
            onClick={(id) => navigate(`/company/${id}`)}
          />
        ))}
        {aggregate.items.length > 8 && (
          <div className="text-center py-2">
            <button
              className="text-xs text-accent hover:text-accent-cyan transition-colors duration-200 cursor-pointer"
              onClick={() => navigate('/pipeline-scout')}
            >
              +{aggregate.items.length - 8} more accounts with recon — view in Pipeline Scout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}