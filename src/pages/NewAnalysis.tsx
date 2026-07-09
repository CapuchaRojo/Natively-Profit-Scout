import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { WizardStep } from '../components/WizardStep';
import { useAutosave } from '../hooks/useAutosave';
import { VibeInputTrigger } from '../components/recon/VibeInput';
import type { CompanyBasic, CompanyBusiness, CompanyPeople, CompanyTools, WorkloadFriction, SalesContext, OfferType, NewAnalysisData } from '../types';

const steps = ['Company', 'Business', 'People', 'Tools', 'Friction', 'Sales Context'];

const defaultBasic: CompanyBasic = { name: '', website: '', industry: '', location: '', employeeCount: 0, revenueEstimate: '', notes: '' };
const defaultBusiness: CompanyBusiness = { productsServices: '', targetCustomers: '', salesModel: '', deliveryModel: '', supportModel: '', operationsModel: '' };
const defaultPeople: CompanyPeople = { leadership: '', salesTeam: '', technicalTeam: '', operationsTeam: '', supportTeam: '', financeAdmin: '', knownChampions: '', knownBlockers: '', unknownDecisionMaker: '' };
const defaultTools: CompanyTools = { crm: '', websitePlatform: '', schedulingTools: '', emailTools: '', projectManagement: '', communicationTools: '', supportTools: '', billingTools: '', automationTools: '', aiTools: '', securityTools: '', unknownTools: '' };
const defaultFriction: WorkloadFriction = { dailyRepeats: '', manualCopyPaste: '', delays: '', customerWait: '', employeeTimeWaste: '', missedRevenue: '', errors: '', complianceRisk: '', softwareCouldAssist: '' };
const defaultContext: SalesContext = { approachReason: '', likelyBusinessPain: '', desiredResult: '', budgetOwner: '', painFeeler: '', dealBlocker: '', dealChampion: '' };

export default function NewAnalysis() {
  const navigate = useNavigate();
  const { createCompany } = useApp();
  const [step, setStep] = useState(1);
  const [basic, setBasic] = useState<CompanyBasic>(defaultBasic);
  const [business, setBusiness] = useState<CompanyBusiness>(defaultBusiness);
  const [people, setPeople] = useState<CompanyPeople>(defaultPeople);
  const [tools, setTools] = useState<CompanyTools>(defaultTools);
  const [friction, setFriction] = useState<WorkloadFriction>(defaultFriction);
  const [context, setContext] = useState<SalesContext>(defaultContext);
  const [offerType, setOfferType] = useState<OfferType>('ai_automation');
  const [submitting, setSubmitting] = useState(false);

  // ── Autosave: persist form draft to localStorage ────────────
  const { restoredDraft, clearDraft, isSaving } = useAutosave({
    key: 'new-analysis',
    data: { basic, business, people, tools, friction, context, offerType, step },
    delayMs: 1200,
    shouldSave: (d) => !!d.basic.name || !!d.basic.website,
  });

  // Restore draft on mount if one exists
  useEffect(() => {
    if (restoredDraft) {
      setBasic(restoredDraft.basic);
      setBusiness(restoredDraft.business);
      setPeople(restoredDraft.people);
      setTools(restoredDraft.tools);
      setFriction(restoredDraft.friction);
      setContext(restoredDraft.context);
      setOfferType(restoredDraft.offerType);
      setStep(restoredDraft.step);
    }
  }, [restoredDraft]);

  const handleSubmit = () => {
    setSubmitting(true);
    try {
      const data: NewAnalysisData = { basic, business, people, tools, workloadFriction: friction, salesContext: context, offerType };
      const company = createCompany(data);
      clearDraft(); // Remove saved draft on successful submission
      navigate(`/company/${company.id}`);
    } catch (err) {
      console.error('Failed to create analysis:', err);
      setSubmitting(false);
    }
  };

  const handleField = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T, value: string | number) => {
    setter(prev => ({ ...prev, [field]: value }));
  };

  const renderInput = (label: string, value: string, onChange: (v: string) => void, opts?: { placeholder?: string; type?: string; multiline?: boolean }) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {opts?.multiline ? (
        <textarea className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder || ''} rows={3} />
      ) : (
        <input className="input" type={opts?.type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder || ''} />
      )}
    </div>
  );

  const renderNumericInput = (label: string, value: number, onChange: (v: number) => void) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input className="input" type="number" min={0} value={value || ''} onChange={e => onChange(parseInt(e.target.value) || 0)} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="New Company Analysis"
        subtitle="Complete the intake form to generate full sales intelligence"
        actions={<VibeInputTrigger />}
      />

      <WizardStep steps={steps} currentStep={step} onStepClick={s => setStep(s)} />

      <div className="card" style={{ padding: 24 }}>
        {/* Step 1: Company Basic */}
        {step === 1 && (
          <div>
            <h3 className="section-title">Company Information</h3>
            {renderInput('Company Name', basic.name, v => setBasic(p => ({ ...p, name: v })), { placeholder: 'e.g. Acme Corp' })}
            {renderInput('Website', basic.website, v => setBasic(p => ({ ...p, website: v })), { placeholder: 'e.g. acme.com' })}
            {renderInput('Industry', basic.industry, v => setBasic(p => ({ ...p, industry: v })), { placeholder: 'e.g. SaaS, Manufacturing, Healthcare' })}
            {renderInput('Location', basic.location, v => setBasic(p => ({ ...p, location: v })), { placeholder: 'e.g. San Francisco, CA' })}
            {renderNumericInput('Employee Count', basic.employeeCount, v => setBasic(p => ({ ...p, employeeCount: v })))}
            {renderInput('Revenue Estimate', basic.revenueEstimate, v => setBasic(p => ({ ...p, revenueEstimate: v })), { placeholder: 'e.g. $5-10M ARR' })}
            {renderInput('Research Notes', basic.notes, v => setBasic(p => ({ ...p, notes: v })), { multiline: true, placeholder: 'What do you already know about this company?' })}
          </div>
        )}

        {/* Step 2: Business Model */}
        {step === 2 && (
          <div>
            <h3 className="section-title">Business Model</h3>
            {renderInput('Products & Services', business.productsServices, v => setBusiness(p => ({ ...p, productsServices: v })), { multiline: true, placeholder: 'What do they sell?' })}
            {renderInput('Target Customers', business.targetCustomers, v => setBusiness(p => ({ ...p, targetCustomers: v })), { multiline: true, placeholder: 'Who do they sell to?' })}
            {renderInput('Sales Model', business.salesModel, v => setBusiness(p => ({ ...p, salesModel: v })), { placeholder: 'e.g. Inbound, Outbound, Partner-led' })}
            {renderInput('Delivery Model', business.deliveryModel, v => setBusiness(p => ({ ...p, deliveryModel: v })), { placeholder: 'e.g. SaaS, Services, Hybrid' })}
            {renderInput('Support Model', business.supportModel, v => setBusiness(p => ({ ...p, supportModel: v })), { placeholder: 'e.g. Email, Chat, Phone, Self-serve' })}
            {renderInput('Operations Model', business.operationsModel, v => setBusiness(p => ({ ...p, operationsModel: v })), { multiline: true, placeholder: 'How do they operate day-to-day?' })}
          </div>
        )}

        {/* Step 3: People */}
        {step === 3 && (
          <div>
            <h3 className="section-title">People & Organization</h3>
            {renderInput('Leadership', people.leadership, v => setPeople(p => ({ ...p, leadership: v })), { multiline: true, placeholder: 'CEO, COO, etc.' })}
            {renderInput('Sales Team', people.salesTeam, v => setPeople(p => ({ ...p, salesTeam: v })), { multiline: true, placeholder: 'Head of Sales, reps, SDRs' })}
            {renderInput('Technical Team', people.technicalTeam, v => setPeople(p => ({ ...p, technicalTeam: v })), { multiline: true, placeholder: 'CTO, engineers, IT' })}
            {renderInput('Operations Team', people.operationsTeam, v => setPeople(p => ({ ...p, operationsTeam: v })), { multiline: true, placeholder: 'Ops manager, admin' })}
            {renderInput('Support Team', people.supportTeam, v => setPeople(p => ({ ...p, supportTeam: v })), { multiline: true, placeholder: 'Support agents, CSM' })}
            {renderInput('Finance / Admin', people.financeAdmin, v => setPeople(p => ({ ...p, financeAdmin: v })), { multiline: true, placeholder: 'CFO, bookkeeper' })}
            {renderInput('Known Champions', people.knownChampions, v => setPeople(p => ({ ...p, knownChampions: v })), { multiline: true, placeholder: 'Who already wants change?' })}
            {renderInput('Known Blockers', people.knownBlockers, v => setPeople(p => ({ ...p, knownBlockers: v })), { multiline: true, placeholder: 'Who might resist?' })}
            {renderInput('Unknown Decision Makers', people.unknownDecisionMaker, v => setPeople(p => ({ ...p, unknownDecisionMaker: v })), { multiline: true, placeholder: 'Who haven\'t you identified yet?' })}
          </div>
        )}

        {/* Step 4: Tools */}
        {step === 4 && (
          <div>
            <h3 className="section-title">Tool Inventory</h3>
            <p className="section-subtitle">List the tools they use. Leave blank if unknown or not applicable.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {([
                ['crm', 'CRM System', tools.crm, v => setTools(p => ({ ...p, crm: v }))],
                ['website', 'Website Platform', tools.websitePlatform, v => setTools(p => ({ ...p, websitePlatform: v }))],
                ['scheduling', 'Scheduling', tools.schedulingTools, v => setTools(p => ({ ...p, schedulingTools: v }))],
                ['email', 'Email Tools', tools.emailTools, v => setTools(p => ({ ...p, emailTools: v }))],
                ['pm', 'Project Management', tools.projectManagement, v => setTools(p => ({ ...p, projectManagement: v }))],
                ['comm', 'Communication', tools.communicationTools, v => setTools(p => ({ ...p, communicationTools: v }))],
                ['support', 'Support Tools', tools.supportTools, v => setTools(p => ({ ...p, supportTools: v }))],
                ['billing', 'Billing', tools.billingTools, v => setTools(p => ({ ...p, billingTools: v }))],
                ['automation', 'Automation', tools.automationTools, v => setTools(p => ({ ...p, automationTools: v }))],
                ['ai', 'AI Tools', tools.aiTools, v => setTools(p => ({ ...p, aiTools: v }))],
                ['security', 'Security', tools.securityTools, v => setTools(p => ({ ...p, securityTools: v }))],
                ['unknown', 'Other Unknown Tools', tools.unknownTools, v => setTools(p => ({ ...p, unknownTools: v }))],
              ] as const).map(([key, label, value, onChange]) => (
                <div key={key} className="input-group">
                  <label className="input-label">{label}</label>
                  <input className="input" value={value} onChange={e => onChange(e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Workload Friction */}
        {step === 5 && (
          <div>
            <h3 className="section-title">Workload & Friction</h3>
            <p className="section-subtitle">Describe the operational challenges and inefficiencies you've observed.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {([
                ['dailyRepeats', 'Daily Repeats', 'What tasks are done daily that could be automated?'],
                ['manualCopyPaste', 'Manual Copy/Paste', 'Where is data manually moved between systems?'],
                ['delays', 'Delays', 'Where are the biggest bottlenecks and delays?'],
                ['customerWait', 'Customer Wait Times', 'How long do customers wait for responses?'],
                ['employeeTimeWaste', 'Employee Time Waste', 'What tasks waste the most employee time?'],
                ['missedRevenue', 'Missed Revenue', 'Where is revenue being lost due to inefficiency?'],
                ['errors', 'Errors', 'What errors occur due to manual processes?'],
                ['complianceRisk', 'Compliance Risk', 'Are there compliance or audit concerns?'],
                ['softwareCouldAssist', 'Software That Could Help', 'What could software do to help?'],
              ] as const).map(([key, label, placeholder]) => (
                <div key={key} className="input-group">
                  <label className="input-label">{label}</label>
                  <textarea
                    className="input"
                    value={friction[key]}
                    onChange={e => setFriction(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Sales Context */}
        {step === 6 && (
          <div>
            <h3 className="section-title">Sales Context & Approval</h3>
            {renderInput('Why This Approach?', context.approachReason, v => setContext(p => ({ ...p, approachReason: v })), { multiline: true, placeholder: 'Why is this company a good target?' })}
            {renderInput('Likely Business Pain', context.likelyBusinessPain, v => setContext(p => ({ ...p, likelyBusinessPain: v })), { multiline: true, placeholder: 'What pain are they likely feeling?' })}
            {renderInput('Desired Result', context.desiredResult, v => setContext(p => ({ ...p, desiredResult: v })), { multiline: true, placeholder: 'What does success look like for them?' })}
            {renderInput('Budget Owner', context.budgetOwner, v => setContext(p => ({ ...p, budgetOwner: v })), { placeholder: 'Who controls the budget?' })}
            {renderInput('Pain Feeler', context.painFeeler, v => setContext(p => ({ ...p, painFeeler: v })), { placeholder: 'Who feels the pain day-to-day?' })}
            {renderInput('Potential Blocker', context.dealBlocker, v => setContext(p => ({ ...p, dealBlocker: v })), { placeholder: 'Who might block the deal?' })}
            {renderInput('Potential Champion', context.dealChampion, v => setContext(p => ({ ...p, dealChampion: v })), { placeholder: 'Who will champion the change?' })}

            <div className="input-group">
              <label className="input-label">Offer Type</label>
              <select className="input" value={offerType} onChange={e => setOfferType(e.target.value as OfferType)}>
                <option value="ai_automation">AI Automation</option>
                <option value="agent_build">Agent Build</option>
                <option value="workflow_optimization">Workflow Optimization</option>
                <option value="cybersecurity">Cybersecurity</option>
                <option value="crm_cleanup">CRM Cleanup</option>
                <option value="content_engine">Content Engine</option>
                <option value="internal_tool">Internal Tool</option>
                <option value="customer_support_bot">Customer Support Bot</option>
                <option value="sales_ops_automation">Sales Ops Automation</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #2a3a5c' }}>
          <div>
            {step > 1 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Cancel
            </button>
{step < 6 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Analyzing...' : '✨ Generate Analysis'}
              </button>
            )}
          </div>
        </div>

        {/* Autosave indicator */}
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: isSaving ? '#64748b' : '#4a5568',
          textAlign: 'right',
          minHeight: 16,
          transition: 'color 0.2s',
        }}>
          {isSaving
            ? '⏳ Saving draft...'
            : (restoredDraft ? '✅ Draft restored — changes auto-saved' : '💾 Auto-saved')
          }
        </div>
      </div>
    </div>
  );
}
