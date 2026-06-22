import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { EmptyState, EmptyStateIcon, EmptyStateTitle } from '../components/EmptyState';

export default function ToolWorkflowMapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCompany } = useApp();
  const company = getCompany(id || '');
  const [view, setView] = useState<'tools' | 'repurpose' | 'public-tools' | 'workflows'>('tools');

  if (!company) {
    return (
      <div>
        <PageHeader title="Tool & Workflow Map" />
        <EmptyState><EmptyStateIcon icon="🔍" /><EmptyStateTitle>Company not found</EmptyStateTitle></EmptyState>
      </div>
    );
  }

  const publicTools = (company as any).detectedTools || [];
  const workflows = (company as any).inferredWorkflows || [];

  return (
    <div>
      <PageHeader
        title="Tool & Workflow Map"
        subtitle={`${company.basic.name} — ${company.toolMap.length} tools identified`}
        actions={
          <div className="flex" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/company/${company.id}`)}>← Company Profile</button>
            <button className="btn btn-primary" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>🔍 Auto-Fill from Recon</button>
          </div>
        }
      />

      <div className="tabs">
        <div className={`tab ${view === 'tools' ? 'active' : ''}`} onClick={() => setView('tools')}>🔧 Tool Inventory</div>
        <div className={`tab ${view === 'repurpose' ? 'active' : ''}`} onClick={() => setView('repurpose')}>♻️ Highlander Repurpose</div>
        <div className={`tab ${view === 'public-tools' ? 'active' : ''}`} onClick={() => setView('public-tools')}>📡 Detected Public Tools</div>
        <div className={`tab ${view === 'workflows' ? 'active' : ''}`} onClick={() => setView('workflows')}>⚙️ Inferred Workflows</div>
      </div>

      {view === 'tools' && (
        <div>
          <p className="section-subtitle">Current tools, their associated pain, and Natively build opportunities.</p>
          {company.toolMap.length > 0 ? (
            <div className="cards-grid">
              {company.toolMap.map(tool => (
                <div key={tool.id} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{tool.name}</h3>
                      <ConfidenceBadge level={tool.confidence} size="sm" />
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div className="mb-2"><span className="text-muted">Function:</span> {tool.function}</div>
                      <div className="mb-2"><span className="text-muted">Dept:</span> {tool.department}</div>
                      <div className="mb-2"><span className="text-muted">Pain:</span> {tool.currentPain}</div>
                      <div className="mb-2"><span className="text-muted">Better workflow:</span> {tool.betterWorkflow}</div>
                      <div><span className="text-muted">Natively idea:</span> {tool.possibleNativelyBuild}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              <EmptyStateIcon icon="🔧" />
              <EmptyStateTitle>No tools inventoried</EmptyStateTitle>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>🔍 Auto-Fill from Recon</button>
            </EmptyState>
          )}
        </div>
      )}

      {view === 'repurpose' && (
        <div>
          <p className="section-subtitle">For each tool: can it be replicated, automated, simplified, or enhanced with a Natives build?</p>
          {company.highladerRepurpose.length > 0 ? (
            <div className="card">
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a3a5c' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Tool</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Replicate</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Automate</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Simplify</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Enhance</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>V1 Idea</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.highladerRepurpose.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #2a3a5c' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.toolName}</td>
                        <td style={{ padding: '10px 12px' }}>{r.canBeReplicated ? '✅' : '❌'}</td>
                        <td style={{ padding: '10px 12px' }}>{r.canBeAutomated ? '✅' : '❌'}</td>
                        <td style={{ padding: '10px 12px' }}>{r.canBeSimplified ? '✅' : '❌'}</td>
                        <td style={{ padding: '10px 12px' }}>{r.canBeEnhanced ? '✅' : '❌'}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', maxWidth: 200 }}>{r.v1ReplacementIdea}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState>
              <EmptyStateIcon icon="♻️" />
              <EmptyStateTitle>No repurpose analysis</EmptyStateTitle>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>🔍 Auto-Fill from Recon</button>
            </EmptyState>
          )}
        </div>
      )}

      {view === 'public-tools' && (
        <div>
          <p className="section-subtitle">Tools detected via public website scan. Run Auto-Fill Recon to populate.</p>
          {publicTools.length > 0 ? (
            <div className="cards-grid">
              {publicTools.map((tool: any, i: number) => (
                <div key={i} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{tool.toolName || tool.name}</h3>
                      <div className="flex" style={{ gap: 4 }}>
                        <span className={`badge ${(tool.confidence || 'Medium') === 'High' ? 'badge-green' : (tool.confidence || 'Medium') === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {tool.confidence || 'Medium'}
                        </span>
                        <span className={`badge ${tool.detectionMethod === 'Detected' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 10 }}>
                          {tool.detectionMethod || 'Inferred'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div className="mb-2"><span className="text-muted">Category:</span> {tool.category || 'Tool'}</div>
                      <div className="mb-2"><span className="text-muted">Dept:</span> {tool.likelyDepartment || 'Unknown'}</div>
                      <div className="mb-2"><span className="text-muted">Evidence:</span> {tool.evidence || 'From public scan'}</div>
                      <div><span className="text-muted">Opportunity:</span> {tool.nativelyOpportunity || 'Possible Natively build'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              <EmptyStateIcon icon="📡" />
              <EmptyStateTitle>No public tools detected</EmptyStateTitle>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>🔍 Run Auto-Fill Recon</button>
            </EmptyState>
          )}
        </div>
      )}

      {view === 'workflows' && (
        <div>
          <p className="section-subtitle">Workflows inferred from public website content. Run Auto-Fill Recon to populate.</p>
          {workflows.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {workflows.map((wf: any, i: number) => (
                <div key={i} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{wf.workflowName || wf.name}</h3>
                      <div className="flex" style={{ gap: 4 }}>
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>{wf.department || 'Unknown'}</span>
                        <span className={`badge ${(wf.confidence || 'Medium') === 'High' ? 'badge-green' : (wf.confidence || 'Medium') === 'Medium' ? 'badge-amber' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {wf.confidence || 'Medium'}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div className="mb-2"><span className="text-muted">Bottleneck:</span> {wf.possibleBottleneck || wf.automationOpportunity}</div>
                      <div><span className="text-muted">Automation:</span> {wf.automationOpportunity || 'Discoverable via recon'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>
              <EmptyStateIcon icon="⚙️" />
              <EmptyStateTitle>No workflows inferred</EmptyStateTitle>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/company/${company.id}/auto-fill-recon`)}>🔍 Run Auto-Fill Recon</button>
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}
