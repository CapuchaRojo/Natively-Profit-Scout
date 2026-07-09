import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { StatCard } from '../components/StatCard';
import {
  Building2,
  Users,
  Wrench,
  Zap,
  FileText,
  FileSearch,
  Target,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  Star,
  ChevronRight,
  Brain,
  Shield,
  ExternalLink,
  Globe,
  Briefcase,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

export default function ExecutiveSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany } = useApp();

  const company = id ? getCompany(id) : undefined;
  if (!company) {
    return (
      <EmptyState
        icon={<Building2 size={48} />}
        title="Company not found"
        description="This company doesn't exist or may have been deleted."
        action={{ label: 'Back to Dashboard', onClick: () => navigate('/') }}
      />
    );
  }

  const displayName = company.basic?.name?.replace(/^Company:\s*/i, '') || 'Unnamed Company';
  const { basic, business, painPoints, stakeholders, toolMap, opportunities, salesPlan, reconFindings, publicIntelSources, publicIntelSignals, publicIntelSummary, contacts, comments, profile, aggressiveRecon } = company;

  // ---- Derived metrics ----
  const employeeCount = aggressiveRecon?.linkedInCompany?.employeeRange
    || basic?.employeeCount
    || stakeholders.length
    || contacts.length
    || 0;

  const painPointCount = painPoints.length;
  const highPainCount = painPoints.filter(p => p.severity >= 4).length;
  const stakeholderCount = stakeholders.length;
  const toolCount = toolMap.length;
  const opportunityCount = opportunities.length;
  const highOppCount = opportunities.filter(o => o.estimatedBusinessValue === 'High').length;
  const totalRevenueImpact = opportunities.reduce((sum, o) => {
    const impact = parseInt(o.businessProblem?.match(/\$[\d,.]+[KMB]?/)?.[0]?.replace(/[$,]/g, '') || '0', 10);
    return sum + (isNaN(impact) ? 0 : impact);
  }, 0);

  const reconSourceCount = reconFindings?.discoveredUrls?.length ?? 0;
  const reconToolCount = reconFindings?.detectedTools?.length ?? 0;
  const reconOpeningCount = reconFindings?.openings?.length ?? 0;
  const hasRecon = !!(reconFindings && reconFindings.status !== 'pending');
  const publicIntelCount = publicIntelSources.length + publicIntelSignals.length;
  const profileSections = profile?.sections?.length ?? 0;
  const commentCount = comments.length;

  // Risk assessment
  const risks: { type: string; label: string; source: string }[] = [
    ...painPoints
      .filter(p => p.severity >= 4)
      .map(p => ({ type: 'critical-pain', label: p.name || 'Critical pain point', source: 'Pain Point Map' })),
    ...opportunities
      .filter(o => o.estimatedBusinessValue === 'High')
      .slice(0, 3)
      .map(o => ({ type: 'high-opp', label: o.title || 'High-value opportunity', source: 'Opportunity Engine' })),
  ];

  const navItems = [
    { label: 'Auto-Fill Recon', path: `/company/${id}/auto-fill-recon`, icon: <Brain size={16} />, desc: hasRecon ? `${reconSourceCount} sources, ${reconToolCount} tools` : 'Run discovery scan' },
    { label: 'Pain Points', path: `/company/${id}/pain-points`, icon: <AlertTriangle size={16} />, desc: `${painPointCount} mapped` },
    { label: 'Stakeholders', path: `/company/${id}/stakeholders`, icon: <Users size={16} />, desc: `${stakeholderCount} mapped` },
    { label: 'Tool & Workflow', path: `/company/${id}/tools`, icon: <Wrench size={16} />, desc: `${toolCount} mapped` },
    { label: 'Opportunities', path: `/company/${id}/opportunities`, icon: <Zap size={16} />, desc: `${opportunityCount} found` },
    { label: 'Profit Builder', path: `/company/${id}/plan`, icon: <FileText size={16} />, desc: salesPlan ? 'Plan ready' : 'Not started' },
    { label: 'Partner Intel', path: `/company/${id}/partner-intel`, icon: <FileSearch size={16} />, desc: 'Full briefing' },
  ];

  return (
    <div className="executive-summary-page">
      <PageHeader
        title="Executive Summary"
        subtitle={displayName}
        backTo={{ label: 'Company Profile', path: `/company/${id}` }}
      />

      {/* ---- Hero metrics row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Employees" value={employeeCount} icon={<Users size={18} />} />
        <StatCard label="Pain Points" value={painPointCount} sub={highPainCount > 0 ? `${highPainCount} critical` : undefined} icon={<AlertTriangle size={18} />} />
        <StatCard label="Stakeholders" value={stakeholderCount} icon={<Users size={18} />} />
        <StatCard label="Tools Mapped" value={toolCount} icon={<Wrench size={18} />} />
        <StatCard label="Opportunities" value={opportunityCount} sub={highOppCount > 0 ? `${highOppCount} high-value` : undefined} icon={<Zap size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- Left column: Company Overview, Recon, Pain Points, Opportunities ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Overview */}
          <section className="card">
            <div className="card-header">
              <Building2 size={18} />
              <h2>Company Overview</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted block mb-1">Industry</span>
                  <span className="font-medium">{basic?.industry || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Location</span>
                  <span className="font-medium">{basic?.location || aggressiveRecon?.linkedInCompany?.headquarters || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Website</span>
                  {basic?.website ? (
                    <a href={basic.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                      {basic.website.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 30)}
                      <ExternalLink size={12} />
                    </a>
                  ) : <span className="font-medium">—</span>}
                </div>
                <div>
                  <span className="text-muted block mb-1">Revenue</span>
                  <span className="font-medium">{basic?.revenueEstimate || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Products/Services</span>
                  <span className="font-medium line-clamp-1">{business?.productsServices || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block mb-1">Sales Model</span>
                  <span className="font-medium">{business?.salesModel || '—'}</span>
                </div>
              </div>
              {basic?.notes && (
                <p className="mt-4 text-sm text-muted leading-relaxed">{basic.notes}</p>
              )}
              {aggressiveRecon?.linkedInCompany?.description && (
                <p className="mt-3 text-sm text-muted leading-relaxed border-t border-border pt-3">
                  <span className="text-xs text-muted uppercase tracking-wide">LinkedIn</span>
                  <br />
                  {aggressiveRecon.linkedInCompany.description}
                </p>
              )}
            </div>
          </section>

          {/* Recon Summary */}
          <section className="card">
            <div className="card-header">
              <Brain size={18} />
              <h2>Recon Intelligence</h2>
              {hasRecon && <ConfidenceBadge level={reconFindings?.status === 'analyzed' ? 'High' : 'Medium'} />}
            </div>
            <div className="card-body">
              {hasRecon ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-surface rounded-lg">
                      <div className="text-xl font-bold text-primary">{reconSourceCount}</div>
                      <div className="text-xs text-muted">Sources</div>
                    </div>
                    <div className="text-center p-3 bg-surface rounded-lg">
                      <div className="text-xl font-bold text-primary">{reconToolCount}</div>
                      <div className="text-xs text-muted">Tools detected</div>
                    </div>
                    <div className="text-center p-3 bg-surface rounded-lg">
                      <div className="text-xl font-bold text-primary">{reconOpeningCount}</div>
                      <div className="text-xs text-muted">Openings</div>
                    </div>
                  </div>
                  {reconFindings!.detectedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {reconFindings!.detectedTools.slice(0, 10).map((t, i) => (
                        <span key={i} className="badge badge-sm">{t.toolName}</span>
                      ))}
                      {reconFindings!.detectedTools.length > 10 && (
                        <span className="badge badge-sm text-muted">+{reconFindings!.detectedTools.length - 10} more</span>
                      )}
                    </div>
                  )}
                  {aggressiveRecon?.summary && (
                    <p className="text-sm text-muted leading-relaxed mt-2">{aggressiveRecon.summary}</p>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <Brain size={28} className="text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted italic mb-3">
                    No recon scan has been run yet. Start with Auto-Fill Recon to discover company intelligence.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/company/${id}/auto-fill-recon`)}
                  >
                    Run Recon Scan <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Risk Alerts */}
          {risks.length > 0 && (
            <section className="card border-l-4 border-l-warning">
              <div className="card-header">
                <Shield size={18} className="text-warning" />
                <h2>Risk Alerts</h2>
                <span className="badge badge-warning">{risks.length}</span>
              </div>
              <div className="card-body space-y-2">
                {risks.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
                      <span className="text-sm">{r.label}</span>
                    </div>
                    <span className="text-xs text-muted">{r.source}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pain Points Summary */}
          <section className="card">
            <div className="card-header">
              <AlertTriangle size={18} />
              <h2>Top Pain Points</h2>
              <button className="btn-ghost btn-sm" onClick={() => navigate(`/company/${id}/pain-points`)}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="card-body">
              {painPoints.length === 0 ? (
                <p className="text-sm text-muted italic">No pain points mapped yet.</p>
              ) : (
                <div className="space-y-2">
                  {painPoints.slice(0, 5).map((p, i) => (
                    <div key={p.id || i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        p.severity >= 5 ? 'bg-red-500' :
                        p.severity >= 4 ? 'bg-orange-500' :
                        p.severity >= 3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.symptoms && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{p.symptoms}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted flex-shrink-0 capitalize">{p.department?.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Opportunities Summary */}
          <section className="card">
            <div className="card-header">
              <Zap size={18} />
              <h2>Top Opportunities</h2>
              <button className="btn-ghost btn-sm" onClick={() => navigate(`/company/${id}/opportunities`)}>
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="card-body">
              {opportunities.length === 0 ? (
                <p className="text-sm text-muted italic">No opportunities identified yet.</p>
              ) : (
                <div className="space-y-3">
                  {opportunities.slice(0, 5).map((o, i) => (
                    <div key={o.id || i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <TrendingUp size={16} className="text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{o.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${o.estimatedBusinessValue === 'High' ? 'text-primary' : 'text-muted'}`}>
                            {o.estimatedBusinessValue} value
                          </span>
                          <span className="text-xs text-muted">·</span>
                          <span className="text-xs text-muted">{o.estimatedComplexity} complexity</span>
                        </div>
                      </div>
                      <ConfidenceBadge level={o.confidence || 'Medium'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ---- Right column: Quick Nav, Intel, Stakeholders, Tools ---- */}
        <div className="space-y-6">
          {/* Quick navigation */}
          <section className="card">
            <div className="card-header">
              <Target size={18} />
              <h2>Quick Navigation</h2>
            </div>
            <div className="card-body p-0">
              {navItems.map((item, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface text-left transition-colors duration-150 border-b border-border last:border-0 cursor-pointer"
                  onClick={() => navigate(item.path)}
                >
                  <span className="text-muted">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{item.label}</span>
                    <span className="text-xs text-muted">{item.desc}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>

          {/* Company Profile Insights */}
          {profile && (
            <section className="card">
              <div className="card-header">
                <Globe size={18} />
                <h2>Profile Insights</h2>
              </div>
              <div className="card-body">
                {profile.summary && (
                  <p className="text-sm text-muted leading-relaxed mb-4">{profile.summary}</p>
                )}
                <div className="space-y-2">
                  {profile.aiReadiness && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">AI Readiness</span>
                      <span className="font-medium">{profile.aiReadiness.level}</span>
                    </div>
                  )}
                  {profile.digitalMaturity && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Digital Maturity</span>
                      <span className="font-medium">{profile.digitalMaturity.level}</span>
                    </div>
                  )}
                  {profile.budgetLikelihood && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Budget Likelihood</span>
                      <span className="font-medium">{profile.budgetLikelihood.level}</span>
                    </div>
                  )}
                  {profile.salesDifficulty && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Sales Difficulty</span>
                      <span className="font-medium">{profile.salesDifficulty.level}</span>
                    </div>
                  )}
                </div>
                {profile.bestConversationAngle && (
                  <div className="mt-4 p-3 bg-surface rounded-lg">
                    <Lightbulb size={14} className="text-primary inline mr-1" />
                    <span className="text-xs text-muted">{profile.bestConversationAngle}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Key Stakeholders */}
          <section className="card">
            <div className="card-header">
              <Users size={18} />
              <h2>Key Stakeholders</h2>
            </div>
            <div className="card-body">
              {stakeholders.length === 0 ? (
                <p className="text-sm text-muted italic">No stakeholders mapped yet.</p>
              ) : (
                <div className="space-y-2">
                  {stakeholders.slice(0, 5).map((s, i) => (
                    <div key={s.id || i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {initials(s.name || s.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name || s.role}</p>
                        <p className="text-xs text-muted truncate">{s.role || s.department || '—'}</p>
                      </div>
                      <ConfidenceBadge level={s.confidence} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tool Stack */}
          <section className="card">
            <div className="card-header">
              <Wrench size={18} />
              <h2>Tool Stack</h2>
            </div>
            <div className="card-body">
              {toolMap.length === 0 && reconFindings?.detectedTools.length === 0 ? (
                <p className="text-sm text-muted italic">No tools mapped yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {toolMap.slice(0, 8).map((t, i) => (
                    <span key={t.id || i} className="badge badge-sm">{t.name}</span>
                  ))}
                  {reconFindings?.detectedTools.slice(0, 8).map((t, i) => (
                    <span key={`rec-${i}`} className="badge badge-sm badge-outline">{t.toolName}</span>
                  ))}
                  {toolMap.length > 8 && (
                    <span className="badge badge-sm text-muted">+{toolMap.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Public Intel */}
          <section className="card">
            <div className="card-header">
              <Globe size={18} />
              <h2>Public Intel</h2>
            </div>
            <div className="card-body">
              {publicIntelCount === 0 ? (
                <p className="text-sm text-muted italic">No public intel gathered yet.</p>
              ) : (
                <>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted">Sources scanned</span>
                    <span className="font-medium">{publicIntelSources.length}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted">Signals found</span>
                    <span className="font-medium">{publicIntelSignals.length}</span>
                  </div>
                  {publicIntelSummary?.topSignals && publicIntelSummary.topSignals.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs text-muted uppercase tracking-wide">Top Signals</span>
                      <ul className="mt-1 space-y-1">
                        {publicIntelSummary.topSignals.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-sm text-muted flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Profit Builder */}
          <section className="card">
            <div className="card-header">
              <FileText size={18} />
              <h2>Profit Builder</h2>
            </div>
            <div className="card-body">
              {salesPlan ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Recommended Solution</span>
                    <span className="font-medium truncate ml-2 max-w-[140px]">{salesPlan.select.recommendedSolution}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Budget Range</span>
                    <span className="font-medium capitalize">{salesPlan.price.budgetRange}</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm w-full mt-2"
                    onClick={() => navigate(`/company/${id}/plan`)}
                  >
                    View Plan <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-muted italic mb-3">No plan created yet.</p>
                  <button
                    className="btn btn-primary btn-sm w-full"
                    onClick={() => navigate(`/company/${id}/plan`)}
                  >
                    <FileText size={14} />
                    Build Plan
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Partner Intel Brief CTA */}
          <section className="card">
            <div className="card-header">
              <FileSearch size={18} />
              <h2>Partner Intel Brief</h2>
            </div>
            <div className="card-body text-center">
              <Star size={32} className="text-primary mx-auto mb-2" />
              <p className="text-sm text-muted mb-4">
                Full partner-fit analysis with scoring, demo angles, and validation plan.
              </p>
              <button
                className="btn btn-primary btn-sm w-full"
                onClick={() => navigate(`/company/${id}/partner-intel`)}
              >
                <FileSearch size={14} />
                Open Partner Intel Brief
              </button>
            </div>
          </section>

          {/* Comments & Notes */}
          {comments.length > 0 && (
            <section className="card">
              <div className="card-header">
                <MessageSquare size={18} />
                <h2>Recent Notes</h2>
              </div>
              <div className="card-body">
                <div className="space-y-2">
                  {comments.slice(0, 3).map((c, i) => (
                    <div key={c.id || i} className="py-2 border-b border-border last:border-0">
                      <p className="text-sm line-clamp-2">{c.body}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted">{c.author || '—'}</span>
                        <span className="text-xs text-muted">{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}