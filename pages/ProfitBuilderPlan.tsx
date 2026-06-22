import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';

type TabType = 'ride' | 'select' | 'price' | 'recon-ride';

export default function ProfitBuilderPlanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany } = useApp();
  const company = getCompany(id || '');
  const [tab, setTab] = useState<TabType>('ride');

  if (!company) {
    return (
      <div>
        <PageHeader title="Profit Builder Plan" />
        <EmptyState><EmptyStateIcon icon="🔍" /><EmptyStateTitle>Company not found</EmptyStateTitle></EmptyState>
      </div>
    );
  }

  const plan = company.salesPlan;
  const openings = (company as any).reconOpenings || [];
  const detectedTools = (company as any).detectedTools || [];
  const inferredWorkflows = (company as any).inferredWorkflows || [];
  const hasReconData = openings.length > 0 || detectedTools.length > 0;

  if (!plan) {
    return (
      <div>
        <PageHeader title="Profit Builder Plan" subtitle={`${company.basic.name}`} />
        <EmptyState>
          <EmptyStateIcon icon="📋" />
          <EmptyStateTitle>No sales plan generated</EmptyStateTitle>
          <EmptyStateDesc>Regenerate the analysis to create a RIDE → SELECT → PRICE plan.</EmptyStateDesc>
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Natively Profit Builder Plan"
        subtitle={`${company.basic.name} — RIDE → SELECT → PRICE methodology`}
        actions={<button className="btn btn-secondary" onClick={() => navigate(`/company/${company.id}`)}>← Company Profile</button>}
      />

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#111827', borderRadius: 8, overflow: 'hidden', border: '1px solid #2a3a5c' }}>
        {[
          { key: 'ride' as TabType, label: 'RIDE', desc: 'Demo Prep', color: '#3b82f6' },
          { key: 'select' as TabType, label: 'SELECT', desc: 'Solution Fit', color: '#10b981' },
          { key: 'price' as TabType, label: 'PRICE', desc: 'Close Deal', color: '#f59e0b' },
          ...(hasReconData ? [{ key: 'recon-ride' as TabType, label: '📡 RECON', desc: 'Recon-Based Demo', color: '#8b5cf6' }] : []),
        ].map(t => (
          <div
            key={t.key}
            style={{
              flex: 1, padding: '16px 20px', cursor: 'pointer',
              background: tab === t.key ? t.color + '22' : 'transparent',
              borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              transition: 'all 0.2s',
            }}
            onClick={() => setTab(t.key)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: tab === t.key ? t.color : '#94a3b8' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{t.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {tab === 'ride' && <RideContent plan={plan.ride} />}
          {tab === 'select' && <SelectContent plan={plan.select} />}
          {tab === 'price' && <PriceContent plan={plan.price} />}
          {tab === 'recon-ride' && <ReconRideContent openings={openings} detectedTools={detectedTools} workflows={inferredWorkflows} companyName={company.basic.name} />}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const tabs: TabType[] = ['ride', 'select', 'price', 'recon-ride'];
            const idx = tabs.indexOf(tab);
            setTab(tabs[Math.max(0, idx - 1)]);
          }}
          disabled={tab === 'ride'}
        >
          ← Previous
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            const tabs: TabType[] = ['ride', 'select', 'price', 'recon-ride'];
            const idx = tabs.indexOf(tab);
            setTab(tabs[Math.min(tabs.length - 1, idx + 1)]);
          }}
          disabled={tab === (hasReconData ? 'recon-ride' : 'price')}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function SectionBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="input-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function RideContent({ plan }: { plan: import('../types').RidePlan }) {
  return (
    <div>
      <h3 className="section-title" style={{ color: '#3b82f6' }}>🎯 RIDE — Demo Preparation</h3>
      <SectionBlock label="Demo Concept" value={plan.demoConcept} />
      <SectionBlock label="Build Prompt" value={plan.buildPrompt} />
      <SectionBlock label="What to Show First" value={plan.whatToShowFirst} />
      <SectionBlock label="Questions During Demo" value={plan.whatToAskDuringDemo} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #10b981' }}>
          <div className="input-label" style={{ color: '#10b981' }}>✅ Positive Signals</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{plan.positiveSignals}</div>
        </div>
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #ef4444' }}>
          <div className="input-label" style={{ color: '#ef4444' }}>⚠️ Negative Signals</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{plan.negativeSignals}</div>
        </div>
      </div>
      <SectionBlock label="How to Redirect" value={plan.howToRedirect} />
      <SectionBlock label="Objections to Prep For" value={plan.objections} />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton text={`RIDE PLAN — ${plan.demoConcept}\n\nBuild: ${plan.buildPrompt}\nShow: ${plan.whatToShowFirst}\nAsk: ${plan.whatToAskDuringDemo}\n\nPositives: ${plan.positiveSignals}\nNegatives: ${plan.negativeSignals}`} label="Copy RIDE plan" />
      </div>
    </div>
  );
}

function SelectContent({ plan }: { plan: import('../types').SelectPlan }) {
  return (
    <div>
      <h3 className="section-title" style={{ color: '#10b981' }}>🔍 SELECT — Solution Selection</h3>
      <SectionBlock label="Recommended Solution" value={plan.recommendedSolution} />
      <SectionBlock label="Secondary Option" value={plan.secondaryOption} />
      <SectionBlock label="Expansion Path" value={plan.expansionPath} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #10b981' }}>
          <div className="input-label" style={{ color: '#10b981' }}>Must-Have Features</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{plan.mustHaveFeatures}</div>
        </div>
        <div className="card" style={{ padding: 16, borderLeft: '3px solid #f59e0b' }}>
          <div className="input-label" style={{ color: '#f59e0b' }}>Nice-to-Have Features</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{plan.niceToHaveFeatures}</div>
        </div>
      </div>
      <SectionBlock label="Future Upsell Path" value={plan.futureUpsell} />
      <SectionBlock label="Decision Criteria" value={plan.decisionCriteria} />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton text={`SELECT PLAN\n\nPrimary: ${plan.recommendedSolution}\nSecondary: ${plan.secondaryOption}\nMust-haves: ${plan.mustHaveFeatures}\nDecision criteria: ${plan.decisionCriteria}`} label="Copy SELECT plan" />
      </div>
    </div>
  );
}

function PriceContent({ plan }: { plan: import('../types').PricePlan }) {
  return (
    <div>
      <h3 className="section-title" style={{ color: '#f59e0b' }}>💰 PRICE — Close the Deal</h3>
      <SectionBlock label="Opening Value Statement" value={plan.openingValueStatement} />
      <SectionBlock label="Cost of Inaction" value={plan.costOfInaction} />
      <SectionBlock label="Proposed Offer" value={plan.proposedOffer} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16, marginBottom: 16 }}>
        <PackageCard name={plan.fastProof.name} desc={plan.fastProof.description} price={plan.fastProof.price} type="Fast Proof" />
        <PackageCard name={plan.seriousBuild.name} desc={plan.seriousBuild.description} price={plan.seriousBuild.price} type="Serious Build" highlighted />
        <PackageCard name={plan.teamScale.name} desc={plan.teamScale.description} price={plan.teamScale.price} type="Team Scale" />
      </div>

      <SectionBlock label="Recommended Package" value={plan.recommendedPackage} />
      <SectionBlock label="Close Question" value={plan.closeQuestion} />
      <SectionBlock label="Objection Questions" value={plan.objectionQuestions} />
      <SectionBlock label="Language Pattern" value={plan.languagePattern} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SectionBlock label="Budget Owner" value={plan.budgetOwner} />
        <SectionBlock label="Budget Range" value={plan.budgetRange} />
        <SectionBlock label="Best Next Step" value={plan.bestNextStep} />
        <SectionBlock label="Concession Strategy" value={plan.concessionStrategy} />
      </div>
      <SectionBlock label="Follow-up Plan" value={plan.followupPlan} />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton text={`PRICE PLAN\n\nValue: ${plan.openingValueStatement}\nCost of inaction: ${plan.costOfInaction}\nRecommended: ${plan.recommendedPackage} (${plan.seriousBuild.price})\nClose: ${plan.closeQuestion}\nNext step: ${plan.bestNextStep}`} label="Copy PRICE plan" />
      </div>
    </div>
  );
}

function ReconRideContent({ openings, detectedTools, workflows, companyName }: {
  openings: any[]; detectedTools: any[]; workflows: any[]; companyName: string;
}) {
  const topOpening = openings[0];

  return (
    <div>
      <h3 className="section-title" style={{ color: '#8b5cf6' }}>📡 Recon-Based RIDE Demo</h3>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Demo strategy derived from public intelligence on {companyName}. Use discovery-first approach.
      </p>

      {topOpening ? (
        <>
          <SectionBlock
            label="🎯 Source Signal"
            value={`${topOpening.title}\nEvidence: ${topOpening.sourceEvidence || 'From public scan'}`}
          />
          <SectionBlock
            label="💡 Best Demo Idea"
            value={topOpening.suggestedNativelyDemo || 'Custom demo based on detected signals'}
          />
          <SectionBlock
            label="⏱️ First 90-Second Demo Script"
            value={`"I noticed from your public site that ${topOpening.whatThisSuggests}. I built a quick example of how we'd solve this — let me show you."`}
          />
          <SectionBlock
            label="🔧 Native.Builder Prompt to Build Demo"
            value={topOpening.suggestedBuildPrompt || 'Build an automation solution based on discovered needs'}
          />
          <SectionBlock
            label="❓ What to Ask During Demo"
            value={topOpening.discoveryQuestion}
          />
          <SectionBlock
            label="👂 What to Listen For"
            value={topOpening.riskUncertainty || 'Pain validation, budget signals, timeline'}
          />
          <SectionBlock
            label="🔄 How to Bridge to SELECT"
            value={`"If this solves that problem, we can explore a full solution. Let me show you how it fits your broader workflow."`}
          />
          <SectionBlock
            label="💰 How to Bridge to PRICE"
            value={`"For a solution like this, companies typically invest ${topOpening.confidence === 'High' ? '$3-5K' : '$1-3K'} to get started. Does that align with what you were thinking?"`}
          />

          <div style={{ borderTop: '1px solid #2a3a5c', paddingTop: 16, marginTop: 16 }}>
            <div className="section-title" style={{ fontSize: 14, marginBottom: 12, color: '#8b5cf6' }}>Additional Recon Insights</div>
            {detectedTools.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <span className="input-label" style={{ marginBottom: 4 }}>Detected Tools in Use</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {detectedTools.slice(0, 5).map((t: any, i: number) => (
                    <span key={i} className="chip chip-green" style={{ fontSize: 10 }}>
                      {t.toolName} [{t.category}]
                    </span>
                  ))}
                </div>
              </div>
            )}
            {workflows.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <span className="input-label" style={{ marginBottom: 4 }}>Potential Workflow Targets</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {workflows.slice(0, 5).map((w: any, i: number) => (
                    <span key={i} className="chip chip-amber" style={{ fontSize: 10 }}>
                      {w.workflowName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📡</div>
          <p>No recon data available. Run Auto-Fill Recon to generate a recon-based demo plan.</p>
          <button className="btn btn-primary btn-sm" onClick={() => window.location.hash = `#/company/${window.location.pathname.split('/')[2]}/auto-fill-recon`}>
            Open Auto-Fill Recon
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <CopyButton text={topOpening ? `RECON-BASED RIDE\n\nSignal: ${topOpening.title}\nDemo: ${topOpening.suggestedNativelyDemo}\nBuild: ${topOpening.suggestedBuildPrompt}\nAsk: ${topOpening.discoveryQuestion}` : 'No recon data'} label="Copy Recon RIDE" />
      </div>
    </div>
  );
}

function PackageCard({ name, desc, price, type, highlighted }: { name: string; desc: string; price: string; type: string; highlighted?: boolean }) {
  return (
    <div className="card" style={{
      padding: 16, textAlign: 'center',
      borderColor: highlighted ? '#f59e0b' : '#2a3a5c',
      boxShadow: highlighted ? '0 0 12px rgba(245, 158, 11, 0.2)' : undefined,
    }}>
      <span className="badge badge-blue" style={{ fontSize: 9, marginBottom: 8 }}>{type}</span>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{price}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{desc}</div>
      {highlighted && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 8 }}>★ RECOMMENDED</div>}
    </div>
  );
}
