import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import type { OfferType } from '../types';

const offerTypeOptions: { value: OfferType; label: string }[] = [
  { value: 'ai_automation', label: 'AI Automation' },
  { value: 'agent_build', label: 'Agent Build' },
  { value: 'workflow_optimization', label: 'Workflow Optimization' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'crm_cleanup', label: 'CRM Cleanup' },
  { value: 'content_engine', label: 'Content Engine' },
  { value: 'internal_tool', label: 'Internal Tool' },
  { value: 'customer_support_bot', label: 'Customer Support Bot' },
  { value: 'sales_ops_automation', label: 'Sales Ops Automation' },
  { value: 'custom', label: 'Custom' },
];

export default function SettingsPage() {
  const { state, updateSettings } = useApp();
  const settings = state.settings;

  const toggleOfferType = (type: OfferType) => {
    const current = settings.defaultOfferTypes;
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateSettings({ defaultOfferTypes: updated });
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your preferences and defaults"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Personal Information */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>👤 Personal Information</span></div>
          <div className="card-body">
            <div className="input-group">
              <label className="input-label">Your Name</label>
              <input
                className="input"
                value={settings.userName}
                onChange={e => updateSettings({ userName: e.target.value })}
                placeholder="e.g. Jane Sales"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Company</label>
              <input
                className="input"
                value={settings.company}
                onChange={e => updateSettings({ company: e.target.value })}
                placeholder="e.g. Natively AI"
              />
            </div>
          </div>
        </div>

        {/* Export Preferences */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>📤 Export Preferences</span></div>
          <div className="card-body">
            <div className="input-group">
              <label className="input-label">Default Export Format</label>
              <select
                className="input"
                value={settings.crmExportFormat}
                onChange={e => updateSettings({ crmExportFormat: e.target.value as any })}
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="markdown">Markdown</option>
                <option value="text">Plain Text</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Default Package Name</label>
              <input
                className="input"
                value={settings.defaultPackages}
                onChange={e => updateSettings({ defaultPackages: e.target.value })}
                placeholder="e.g. Growth Package"
              />
            </div>
          </div>
        </div>

        {/* Default Offer Types */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>🏷️ Default Offer Types</span></div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Select the offer types you typically present. These will be pre-selected in new analyses.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {offerTypeOptions.map(opt => (
                <span
                  key={opt.value}
                  className={`chip ${settings.defaultOfferTypes.includes(opt.value) ? 'selected' : ''}`}
                  onClick={() => toggleOfferType(opt.value)}
                >
                  {settings.defaultOfferTypes.includes(opt.value) ? '✓ ' : ''}{opt.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scoring Weights */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>⚖️ Scoring Weights</span></div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Adjust how each factor contributes to the opportunity score.
            </p>
            <WeightSlider
              label="Pain Severity"
              value={settings.scoringWeights.painSeverity}
              onChange={v => updateSettings({ scoringWeights: { ...settings.scoringWeights, painSeverity: v } })}
            />
            <WeightSlider
              label="Frequency"
              value={settings.scoringWeights.frequency}
              onChange={v => updateSettings({ scoringWeights: { ...settings.scoringWeights, frequency: v } })}
            />
            <WeightSlider
              label="Revenue Impact"
              value={settings.scoringWeights.revenueImpact}
              onChange={v => updateSettings({ scoringWeights: { ...settings.scoringWeights, revenueImpact: v } })}
            />
            <WeightSlider
              label="Decision Maker Visibility"
              value={settings.scoringWeights.decisionMakerVisibility}
              onChange={v => updateSettings({ scoringWeights: { ...settings.scoringWeights, decisionMakerVisibility: v } })}
            />
            <WeightSlider
              label="Ease of Solution"
              value={settings.scoringWeights.easeOfSolution}
              onChange={v => updateSettings({ scoringWeights: { ...settings.scoringWeights, easeOfSolution: v } })}
            />
          </div>
        </div>

        {/* Auto-Fill Recon Settings */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>🔍 Auto-Fill Recon Settings</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Enable Backend Scanner</label>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.reconSettings.enabled}
                    onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, enabled: e.target.checked } })}
                    style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {settings.reconSettings.enabled ? 'Enabled' : 'Disabled (browser-only mode)'}
                  </span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Backend Scanner URL</label>
                <input
                  className="input"
                  value={settings.reconSettings.backendUrl}
                  onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, backendUrl: e.target.value } })}
                  placeholder="https://your-backend.com/scan"
                />
              </div>
              <div className="input-group">
                <label className="input-label">Max Pages Per Scan</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.reconSettings.maxPagesPerScan}
                  onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, maxPagesPerScan: parseInt(e.target.value) || 10 } })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Max Characters Per Page</label>
                <input
                  className="input"
                  type="number"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={settings.reconSettings.maxCharsPerPage}
                  onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, maxCharsPerPage: parseInt(e.target.value) || 25000 } })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Scan Delay (ms)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={5000}
                  step={100}
                  value={settings.reconSettings.scanDelayMs}
                  onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, scanDelayMs: parseInt(e.target.value) || 1000 } })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Default Confidence Threshold</label>
                <select
                  className="input"
                  value={settings.reconSettings.defaultConfidenceThreshold}
                  onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, defaultConfidenceThreshold: e.target.value as any } })}
                >
                  <option value="Low">Low (show everything)</option>
                  <option value="Medium">Medium (default)</option>
                  <option value="High">High (only high confidence)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Respect robots.txt</label>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={settings.reconSettings.respectRobotsTxt}
                    onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, respectRobotsTxt: e.target.checked } })}
                    style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Enabled</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, borderTop: '1px solid #2a3a5c', paddingTop: 16 }}>
              <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>Feature Toggles</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { key: 'enableUrlDiscovery', label: 'Public URL Discovery' },
                  { key: 'enableToolFingerprinting', label: 'Tool Fingerprinting' },
                  { key: 'enableWorkflowInference', label: 'Workflow Inference' },
                  { key: 'enablePeopleRoleInference', label: 'People/Role Inference' },
                ].map(f => (
                  <label key={f.key} className="flex items-center" style={{ gap: 8, cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>
                    <input
                      type="checkbox"
                      checked={(settings.reconSettings as any)[f.key]}
                      onChange={e => updateSettings({ reconSettings: { ...settings.reconSettings, [f.key]: e.target.checked } })}
                      style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Language */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>💬 Custom Sales Language</span></div>
          <div className="card-body">
            <div className="input-group">
              <label className="input-label">Discovery Questions Template</label>
              <textarea
                className="input"
                rows={4}
                value={settings.customDiscoveryQuestions}
                onChange={e => updateSettings({ customDiscoveryQuestions: e.target.value })}
                placeholder="Add custom discovery questions that will be suggested in new analyses..."
              />
            </div>
            <div className="input-group">
              <label className="input-label">Sales Language / Pitch Notes</label>
              <textarea
                className="input"
                rows={4}
                value={settings.customSalesLanguage}
                onChange={e => updateSettings({ customSalesLanguage: e.target.value })}
                placeholder="Add your preferred sales language patterns, value props, or pitch notes..."
              />
            </div>
          </div>
        </div>

        {/* Data Privacy */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>🔒 Data & Privacy</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <input
                type="checkbox"
                id="privacy"
                checked={settings.dataPrivacyConsent}
                onChange={e => updateSettings({ dataPrivacyConsent: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
              />
              <label htmlFor="privacy" style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                I consent to local storage of company analysis data
              </label>
            </div>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Data is stored locally in your browser. No data is sent to external servers in v1.
              {state.companies.length > 0 && (
                <span style={{ display: 'block', marginTop: 8 }}>
                  Currently storing <strong style={{ color: '#94a3b8' }}>{state.companies.length}</strong> companies in local storage.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* API Placeholder */}
        <div className="card">
          <div className="card-header"><span className="input-label" style={{ margin: 0 }}>🔌 API Integration (Future)</span></div>
          <div className="card-body">
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              API integrations will be available in a future version. This section is a placeholder for:
            </p>
            <ul style={{ fontSize: 12, color: '#64748b', margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>AI-powered analysis generation (GPT, Claude)</li>
              <li>CRM sync (Salesforce, HubSpot)</li>
              <li>Data enrichment (Clearbit, Apollo)</li>
              <li>Email sequence integration (Outreach, SalesLoft)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{value.toFixed(1)}x</span>
      </div>
      <input
        type="range"
        min={0}
        max={3}
        step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%', height: 6, borderRadius: 3,
          background: '#2a3a5c', accentColor: '#3b82f6',
          outline: 'none', cursor: 'pointer',
        }}
      />
    </div>
  );
}
