import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { CopyButton } from '../components/CopyButton';
import { EmptyState, EmptyStateIcon, EmptyStateTitle, EmptyStateDesc } from '../components/EmptyState';

export default function OpportunityEnginePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany, regenerateAnalysis } = useApp();
  const company = getCompany(id || '');

  if (!company) {
    return (
      <div>
        <PageHeader title="Opportunity Engine" />
        <EmptyState><EmptyStateIcon icon="🔍" /><EmptyStateTitle>Company not found</EmptyStateTitle></EmptyState>
      </div>
    );
  }
  const recon = company.reconFindings;
  const detectedTools = recon?.detectedTools || [];
  const inferredWorkflows = recon?.inferredWorkflows || [];
  const openings = recon?.openings || [];
  const hasReconData = openings.length > 0 || inferredWorkflows.length > 0;
  const handleGenerateFromRecon = () => {
    if (!company) return;
    const newOpps = inferredWorkflows.map((wf: any, i: number) => ({
      id: `opp-recon-${Date.now()}-${i}`,
      title: wf.workflowName || `Workflow: ${wf.name}`,
      businessProblem: wf.possibleBottleneck || 'Recon-based opportunity',
      whoFeelsPain: `${wf.department || 'Relevant'} department`,
      whoPaysForFix: 'Company leadership',
      proposedSolution: wf.suggestedNativeBuilderDemo || 'Natively automation solution',
      nativelyBuildIdea: wf.automationOpportunity || 'Automation opportunity',
      requiredFeatures: 'To be determined during discovery',
      estimatedComplexity: 'Medium' as const,
      estimatedBusinessValue: 'Medium' as const,
      suggestedDemoAngle: `Recon-based: ${wf.workflowName || wf.name}`,
      suggestedBuildPrompt: wf.automationOpportunity || 'Build an automation solution',
      discoveryQuestions: wf.discoveryQuestion || 'How does this process work today?',
      proofNeeded: 'Recon-based discovery — validate with customer',
      closeStrategy: 'Recon-driven — start with discovery question',
      opportunityType: 'custom' as const,
    }));
    // Apply directly to the company
    if (company) {
      regenerateAnalysis(company.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Opportunity Engine"
        subtitle={`${company.basic.name} — ${company.opportunities.length} opportunities found`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/company/${company.id}`)}>← Company Profile</button>
            <button className="btn btn-primary" onClick={() => navigate(`/company/${company.id}/plan`)}>Build Sales Plan →</button>
          </div>
        }
      />

      {hasReconData && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#f59e0b' }}>
            🎯 Recon data available: {openings.length} openings, {inferredWorkflows.length} workflows detected
          </span>
          <button className="btn btn-primary btn-sm" onClick={handleGenerateFromRecon}>
            ⚡ Generate from Public Recon
          </button>
        </div>
      )}

      {company.opportunities.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon icon="⚡" />
          <EmptyStateTitle>No opportunities generated</EmptyStateTitle>
          <EmptyStateDesc>Ensure pain points are identified to generate opportunities. Or run Auto-Fill Recon to discover openings.</EmptyStateDesc>
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>
              🔍 Run Auto-Fill Recon
            </button>
          </div>
        </EmptyState>
      ) : (
        <div className="cards-grid">
          {company.opportunities.map((opp, idx) => {
            const isReconSourced = opp.id.startsWith('opp-recon');
            const valueColor = opp.estimatedBusinessValue === 'High' ? '#10b981' : opp.estimatedBusinessValue === 'Medium' ? '#f59e0b' : '#64748b';
            const complexColor = opp.estimatedComplexity === 'Low' ? '#10b981' : opp.estimatedComplexity === 'Medium' ? '#f59e0b' : '#ef4444';

            return (
              <div key={opp.id} className="card" style={{ borderLeft: `3px solid ${valueColor}` }}>
                <div className="card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span className="badge badge-blue" style={{ fontSize: 9 }}>#{idx + 1}</span>
                        {isReconSourced && (
                          <span className="badge badge-purple" style={{ fontSize: 9 }}>📡 Recon</span>
                        )}
                        <span className={`badge ${opp.estimatedBusinessValue === 'High' ? 'badge-green' : opp.estimatedBusinessValue === 'Medium' ? 'badge-amber' : 'badge-assumed'}`} style={{ fontSize: 9 }}>
                          {opp.estimatedBusinessValue} Value
                        </span>
                        <span className={`badge ${opp.estimatedComplexity === 'Low' ? 'badge-green' : opp.estimatedComplexity === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 9 }}>
                          {opp.estimatedComplexity} Complexity
                        </span>
                      </div>
                      <h3 style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 600 }}>{opp.title}</h3>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    <div className="mb-2"><span className="text-muted">Problem:</span> {opp.businessProblem}</div>
                    <div className="mb-2"><span className="text-muted">Who feels it:</span> {opp.whoFeelsPain}</div>
                    <div className="mb-2"><span className="text-muted">Who pays:</span> {opp.whoPaysForFix}</div>
                    <div className="mb-2"><span className="text-muted">Solution:</span> {opp.proposedSolution}</div>
                    <div className="mb-2"><span className="text-muted">Build idea:</span> {opp.nativelyBuildIdea}</div>

                    <div className="card" style={{ marginTop: 12, padding: 12, background: '#0f1525' }}>
                      <div className="mb-2"><span className="text-muted">📺 Demo angle:</span> {opp.suggestedDemoAngle}</div>
                      <div className="mb-2"><span className="text-muted">🔧 Build prompt:</span> {opp.suggestedBuildPrompt}</div>
                      <div className="mb-2"><span className="text-muted">❓ Discovery Qs:</span> {opp.discoveryQuestions}</div>
                      <div className="mb-2"><span className="text-muted">📋 Proof needed:</span> {opp.proofNeeded}</div>
                      <div><span className="text-muted">🎯 Close strategy:</span> {opp.closeStrategy}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <CopyButton text={`${opp.title}: ${opp.proposedSolution}\n\nDemo: ${opp.suggestedDemoAngle}\nBuild: ${opp.suggestedBuildPrompt}\nClose: ${opp.closeStrategy}`} label="Copy brief" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
