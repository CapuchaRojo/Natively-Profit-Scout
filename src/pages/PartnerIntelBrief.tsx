// ============================================================
// Partner Intel Brief Page — v1.0
// One-page partner brief with public vs internal context markers
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { useToast } from '../components/Toast';
import { generatePartnerIntelBrief } from '../services/partnerIntelEngine';
import { PartnerIntelBrief, PartnerIntelSection } from '../types';
import {
  FileText, ExternalLink, AlertTriangle, CheckCircle, Shield,
  Target, Lightbulb, Users, Wrench, BarChart3, ArrowRight,
  AlertCircle, Info, ChevronDown, ChevronUp, Download, RefreshCw,
  Globe, Lock, Eye, Zap, TrendingUp, Building2, Briefcase
} from 'lucide-react';

// ── Source badge ─────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  switch (source) {
    case 'public':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
          <Globe className="w-3 h-3" /> Public
        </span>
      );
    case 'internal_context':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
          <Lock className="w-3 h-3" /> Internal
        </span>
      );
    case 'inferred':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
          <Eye className="w-3 h-3" /> Inferred
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/20 text-muted border border-muted/30">
          <Info className="w-3 h-3" /> Assumed
        </span>
      );
  }
}

// ── Section card ─────────────────────────────────────────────

function BriefSection({
  icon: Icon,
  label,
  section,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  section: PartnerIntelSection;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const bodyHtml = useMemo(() => {
    return section.body
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/\n/g, '<br/>');
  }, [section.body]);

  return (
    <div className="card bg-card border border-border rounded-xl overflow-hidden transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors duration-150 cursor-pointer"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-accent" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{label}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <SourceBadge source={section.source} />
              <ConfidenceBadge level={section.confidence} />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3">
          {open ? (
            <ChevronUp className="w-5 h-5 text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted" />
          )}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <div
            className="mt-3 text-sm text-secondary leading-relaxed prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
          {section.evidenceUrls.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted font-medium mb-1.5">Evidence URLs:</p>
              <div className="flex flex-wrap gap-1.5">
                {section.evidenceUrls.slice(0, 5).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent-cyan hover:text-accent transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {new URL(url).hostname}
                  </a>
                ))}
                {section.evidenceUrls.length > 5 && (
                  <span className="text-xs text-muted">+{section.evidenceUrls.length - 5} more</span>
                )}
              </div>
            </div>
          )}
          {section.internalNotes && (
            <div className="mt-3 p-2.5 rounded-lg bg-accent-amber/5 border border-accent-amber/10">
              <p className="text-xs text-accent-amber font-medium mb-1">Internal Notes:</p>
              <p className="text-xs text-secondary">{section.internalNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score gauge ──────────────────────────────────────────────

function ScoreGauge({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color =
    pct >= 80 ? 'bg-accent-green' :
    pct >= 50 ? 'bg-accent-amber' :
    pct >= 30 ? 'bg-accent-cyan' :
    'bg-muted';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-bg-input rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-lg font-bold font-mono text-foreground tabular-nums">
        {score}/{maxScore}
      </span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function PartnerIntelBriefPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { addToast } = useToast();

  const company = state.companies.find(c => c.id === id);

  const [brief, setBrief] = useState<PartnerIntelBrief | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!company) {
      addToast('Company not found', 'error');
      navigate('/');
      return;
    }
    // Auto-generate on mount
    generateBrief();
  }, [id]);

  function generateBrief() {
    if (!company) return;
    setGenerating(true);
    // Small delay for UX feedback
    setTimeout(() => {
      const result = generatePartnerIntelBrief(company);
      setBrief(result);
      setGenerating(false);
    }, 400);
  }

  function handleDownload() {
    if (!brief) return;
    const sections = [
      `# Partner Intel Brief: ${brief.companyName}`,
      `Generated: ${new Date(brief.generatedAt).toLocaleString()}`,
      `Data Freshness: ${brief.dataFreshness}`,
      '',
      ...Object.entries(brief)
        .filter(([key]) => !['companyId', 'companyName', 'generatedAt', 'dataFreshness', 'sourcesUsed', 'internalContextPasted'].includes(key))
        .map(([key, section]) => {
          if (typeof section === 'object' && section !== null && 'title' in section) {
            const s = section as PartnerIntelSection;
            return `## ${s.title}\nSource: ${s.source} | Confidence: ${s.confidence}\n\n${s.body.replace(/\*\*/g, '')}\n`;
          }
          return '';
        }),
    ].join('\n');

    const blob = new Blob([sections], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-brief-${brief.companyName.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Brief downloaded as Markdown', 'success');
  }

  // ── Empty/loading states ───────────────────────────────────

  if (!company) {
    return (
      <div className="p-6">
        <EmptyState>
          <EmptyStateIcon><AlertTriangle className="w-10 h-10 text-muted" /></EmptyStateIcon>
          <EmptyStateTitle>Company Not Found</EmptyStateTitle>
          <EmptyStateDesc>This company doesn't exist or was removed.</EmptyStateDesc>
        </EmptyState>
      </div>
    );
  }

  if (generating && !brief) {
    return (
      <div className="p-6">
        <PageHeader
          title="Partner Intel Brief"
          subtitle={`Analyzing ${company.basic.name}…`}
          backTo={`/company/${id}`}
          backLabel="Back to Profile"
        />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Generating partner brief…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="p-6">
        <PageHeader
          title="Partner Intel Brief"
          subtitle={company.basic.name}
          backTo={`/company/${id}`}
          backLabel="Back to Profile"
        />
        <EmptyState>
          <EmptyStateIcon><FileText className="w-10 h-10 text-muted" /></EmptyStateIcon>
          <EmptyStateTitle>Could Not Generate Brief</EmptyStateTitle>
          <EmptyStateDesc>Something went wrong. Try refreshing or running Auto-Fill Recon first for more data.</EmptyStateDesc>
        </EmptyState>
      </div>
    );
  }

  // ── Main content ───────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Partner Intel Brief"
        subtitle={company.basic.name}
        backTo={`/company/${id}`}
        backLabel="Back to Profile"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={generateBrief}
              disabled={generating}
              className="btn-secondary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download .md
            </button>
          </div>
        }
      />

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted" />
          <span className="text-muted">Company:</span>
          <span className="text-foreground font-medium">{brief.companyName}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-muted" />
          <span className="text-muted">Freshness:</span>
          <span className={`font-medium capitalize ${
            brief.dataFreshness === 'fresh' ? 'text-accent-green' :
            brief.dataFreshness === 'stale' ? 'text-accent-amber' :
            'text-muted'
          }`}>
            {brief.dataFreshness}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-muted" />
          <span className="text-muted">Sources:</span>
          <span className="text-foreground font-medium">{brief.sourcesUsed.length}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Lock className="w-4 h-4 text-muted" />
          <span className="text-muted">Internal context:</span>
          <span className={`font-medium ${brief.internalContextPasted ? 'text-accent-green' : 'text-muted'}`}>
            {brief.internalContextPasted ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Partner Opportunity Score — prominent */}
      <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-card to-card-hover border border-accent/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground tracking-wide">
              Partner Opportunity Score
            </h2>
            <p className="text-xs text-muted">Aggregated from all available signals</p>
          </div>
        </div>
        <ScoreGauge score={brief.partnerOpportunityScore.score} maxScore={brief.partnerOpportunityScore.maxScore} />
        <div className="mt-3 text-sm text-secondary leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: brief.partnerOpportunityScore.body
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
              .replace(/\n/g, '<br/>')
          }}
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        <BriefSection icon={Building2} label="Company Summary" section={brief.companySummary} defaultOpen />
        <BriefSection icon={Users} label="Leadership / Stakeholder Map" section={brief.leadershipMap} />
        <BriefSection icon={Briefcase} label="Related Entities / Brands" section={brief.relatedEntities} />
        <BriefSection icon={Target} label="Public Positioning" section={brief.publicPositioning} />
        <BriefSection icon={Wrench} label="Current Tool Stack / Competitor Usage" section={brief.toolStackCompetitors} />
        <BriefSection icon={BarChart3} label="Likely Workflows & Pain Points" section={brief.workflowsAndPainPoints} defaultOpen />
        <BriefSection icon={Zap} label="Fit for Native.Builder" section={brief.builderFit} />
        <BriefSection icon={Shield} label="Fit for Native.Compute / Relay" section={brief.computeRelayFit} />
        <BriefSection icon={Briefcase} label="Fit as Channel / Reseller / Consulting Partner" section={brief.channelPartnerFit} />
        <BriefSection icon={AlertTriangle} label="Risks & Unknowns" section={brief.risksAndUnknowns} defaultOpen />
        <BriefSection icon={AlertCircle} label="Likely CTO / Buyer Objections" section={brief.ctoBuyerObjections} />
        <BriefSection icon={Lightbulb} label="Recommended Demo Angle" section={brief.recommendedDemoAngle} defaultOpen />
        <BriefSection icon={CheckCircle} label="Suggested Validation Plan" section={brief.validationPlan} />
        <BriefSection icon={Target} label="Access / Credits / Pilot Recommendation" section={brief.accessCreditsRecommendation} />
        <BriefSection icon={ArrowRight} label="Recommended Next Action" section={brief.recommendedNextAction} defaultOpen />
        <BriefSection icon={Lock} label="Internal-Context Notes" section={brief.internalContextNotes} defaultOpen />
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 rounded-xl bg-card border border-border text-center">
        <p className="text-xs text-muted">
          Generated {new Date(brief.generatedAt).toLocaleString()} &middot;{' '}
          {brief.sourcesUsed.length} public sources &middot;{' '}
          {brief.internalContextPasted ? 'Includes internal context' : 'Public data only'}
        </p>
      </div>
    </div>
  );
}