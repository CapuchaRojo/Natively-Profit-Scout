// ============================================================
// Vibe Input Component — Natural Language → Company Creator
// ============================================================
// Paste raw intel, parse it, preview the extraction, vibe it in.
// ============================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToast } from '../Toast';
import { parseVibeInput, generateVibeSummary, type VibeParsedCompany, type ParsedField } from '../../services/vibeInputParser';
import type { Company, NewAnalysisData, VerifiedStatus } from '../../types';

// ============================================================
// Section definitions for preview display
// ============================================================

interface SectionGroup {
  id: string;
  label: string;
  icon: string;
  fields: { key: string; label: string; value: string }[];
}

function buildSectionGroups(parsed: VibeParsedCompany): SectionGroup[] {
  const groups: SectionGroup[] = [];

  // Company
  const companyFields = [];
  if (parsed.basic.name) companyFields.push({ key: 'name', label: 'Company Name', value: parsed.basic.name });
  if (parsed.basic.website) companyFields.push({ key: 'website', label: 'Website', value: parsed.basic.website });
  if (parsed.linkedInUrl) companyFields.push({ key: 'linkedin', label: 'LinkedIn', value: parsed.linkedInUrl });
  if (parsed.basic.industry) companyFields.push({ key: 'industry', label: 'Industry', value: parsed.basic.industry });
  if (parsed.basic.location) companyFields.push({ key: 'location', label: 'Location', value: parsed.basic.location });
  if (parsed.entityClassification) companyFields.push({ key: 'classification', label: 'Classification', value: parsed.entityClassification });
  if (parsed.relatedEntities) companyFields.push({ key: 'related', label: 'Related Entities', value: parsed.relatedEntities });
  if (parsed.basic.notes) companyFields.push({ key: 'notes', label: 'Notes', value: parsed.basic.notes });
  if (companyFields.length > 0) groups.push({ id: 'company', label: 'Company', icon: '🏢', fields: companyFields });

  // People
  const peopleFields = [];
  if (parsed.people.leadership) peopleFields.push({ key: 'leadership', label: 'Leadership / Team', value: parsed.people.leadership });
  if (parsed.executiveContacts.length > 0) {
    peopleFields.push({
      key: 'executive', label: 'Primary Contact',
      value: parsed.executiveContacts.map(c => `${c.name} — ${c.title}`).join('\n'),
    });
  }
  if (peopleFields.length > 0) groups.push({ id: 'people', label: 'People', icon: '👥', fields: peopleFields });

  // Tools
  const toolFields = [];
  if (parsed.tools.aiTools) toolFields.push({ key: 'aiTools', label: 'AI Tools', value: parsed.tools.aiTools });
  if (parsed.tools.crm) toolFields.push({ key: 'crm', label: 'CRM', value: parsed.tools.crm });
  if (toolFields.length > 0) groups.push({ id: 'tools', label: 'Tools', icon: '🛠️', fields: toolFields });

  // Sales Context
  const contextFields = [];
  if (parsed.scoutTask) contextFields.push({ key: 'scoutTask', label: 'Scout Task', value: parsed.scoutTask });
  if (parsed.evaluationCriteria.length > 0) contextFields.push({ key: 'evaluation', label: 'Evaluation Criteria', value: parsed.evaluationCriteria.join('\n') });
  if (parsed.risksAndUnknowns) contextFields.push({ key: 'risks', label: 'Risks & Unknowns', value: parsed.risksAndUnknowns });
  if (contextFields.length > 0) groups.push({ id: 'context', label: 'Intel & Context', icon: '🎯', fields: contextFields });

  // Internal
  const internalFields = [];
  if (parsed.internalContext) internalFields.push({ key: 'internalContext', label: 'Internal Context', value: parsed.internalContext });
  if (parsed.verifiedStatus !== 'unknown') internalFields.push({ key: 'verifiedStatus', label: 'Verification Status', value: parsed.verifiedStatus.replace(/_/g, ' ') });
  if (internalFields.length > 0) groups.push({ id: 'internal', label: 'Internal Notes', icon: '🔒', fields: internalFields });

  return groups;
}

// ============================================================
// Component Props
// ============================================================

interface VibeInputProps {
  onClose?: () => void;
  embedded?: boolean;
}

// ============================================================
// VibeInput Component
// ============================================================

export function VibeInput({ onClose, embedded = false }: VibeInputProps) {
  const navigate = useNavigate();
  const { createCompany } = useApp();
  const { showToast } = useToast();

  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<VibeParsedCompany | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['company']));
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Parse ──────────────────────────────────────────────────
  const handleParse = () => {
    if (!rawText.trim()) {
      showToast('Paste some intel first — I need something to work with.', 'info');
      return;
    }
    const result = parseVibeInput(rawText);
    setParsed(result);
    // Auto-expand all sections with data
    const groups = buildSectionGroups(result);
    setExpandedSections(new Set(groups.map(g => g.id)));
    showToast(`Parsed ${result.parsedFields.length} fields from your intel. Review and edit before vibing it in.`, 'success');
  };

  // ── Section toggle ────────────────────────────────────────
  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Edit field ────────────────────────────────────────────
  const startEditing = (key: string, value: string) => {
    setEditingField(key);
    setEditValue(value);
  };

  const saveEdit = (fieldKey: string, sectionId: string) => {
    if (!parsed) return;
    const updated = { ...parsed };

    // Map field key to the right property
    switch (fieldKey) {
      case 'name': updated.basic = { ...updated.basic, name: editValue }; break;
      case 'website': updated.basic = { ...updated.basic, website: editValue }; break;
      case 'linkedin': updated.linkedInUrl = editValue; break;
      case 'industry': updated.basic = { ...updated.basic, industry: editValue }; break;
      case 'location': updated.basic = { ...updated.basic, location: editValue }; break;
      case 'classification': updated.entityClassification = editValue; break;
      case 'related': updated.relatedEntities = editValue; break;
      case 'notes': updated.basic = { ...updated.basic, notes: editValue }; break;
      case 'leadership': updated.people = { ...updated.people, leadership: editValue }; break;
      case 'executive': /* handled via leadership */ break;
      case 'aiTools': updated.tools = { ...updated.tools, aiTools: editValue }; break;
      case 'crm': updated.tools = { ...updated.tools, crm: editValue }; break;
      case 'scoutTask': updated.scoutTask = editValue; break;
      case 'evaluation': updated.evaluationCriteria = editValue.split('\n').filter(Boolean); break;
      case 'risks': updated.risksAndUnknowns = editValue; break;
      case 'internalContext': updated.internalContext = editValue; break;
      case 'verifiedStatus': updated.verifiedStatus = editValue as VerifiedStatus; break;
    }

    setParsed(updated);
    setEditingField(null);
    setEditValue('');
    showToast('Field updated. Your changes are reflected above.', 'success');
  };

  // ── Vibe It! ──────────────────────────────────────────────
  const handleVibeIt = () => {
    if (!parsed || !parsed.basic.name) {
      showToast('We need at least a company name. Add one before vibing it in.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const data: NewAnalysisData = {
        basic: parsed.basic,
        business: parsed.business,
        people: parsed.people,
        tools: parsed.tools,
        workloadFriction: parsed.workloadFriction,
        salesContext: parsed.salesContext,
        offerType: 'custom',
        customOfferType: 'Vibe Import',
      };

      const company = createCompany(data);

      // Apply additional fields via update
      // (verifiedStatus is already handled in the create flow)
      showToast(`✨ ${parsed.basic.name} has been vibed into Profit Scout!`, 'success');

      // Navigate to the company profile
      setTimeout(() => {
        navigate(`/company/${company.id}`);
      }, 600);

      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to vibe company:', err);
      showToast('Something went wrong. Try again?', 'error');
      setSubmitting(false);
    }
  };

  // ── Section groups ────────────────────────────────────────
  const sectionGroups = parsed ? buildSectionGroups(parsed) : [];

  // ── Field confidence badge ─────────────────────────────────
  const confidenceBadge = (confidence: string) => {
    const colors: Record<string, string> = {
      high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[confidence] || colors.low}`}>
        {confidence}
      </span>
    );
  };

  // ── Placeholder text for the textarea ──────────────────────
  const placeholderText = `Paste your raw intel here...

Example format:
Company: Acme Corp
Website: https://acme.com
LinkedIn: https://linkedin.com/company/acme
Primary executive contact: Jane Doe
Likely LinkedIn: https://linkedin.com/in/janedoe

Known team:
- John Smith — CTO
- Sarah Jones — Head of Sales

Context from Andrea:
They're exploring AI tools and want a pilot.

Classify as: potential partner / early user

Scout task:
Evaluate fit as a Builder early user...`;

  // ── Summary line ──────────────────────────────────────────
  const summaryLine = parsed ? generateVibeSummary(parsed) : '';

  return (
    <div className={embedded ? '' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'}>
      <div className={embedded ? 'w-full' : 'w-full max-w-3xl max-h-[90vh] overflow-hidden'}>
        <div className="card flex flex-col" style={{ maxHeight: embedded ? 'none' : '85vh', padding: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#2a3a5c]">
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">Vibe Input</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste raw intel and let the parser extract structured company data
              </p>
            </div>
            {!embedded && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4" style={{ minHeight: 0 }}>
            {/* Textarea */}
            {!parsed && (
              <div>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={placeholderText}
                  rows={14}
                  className="w-full rounded-lg border border-[#2a3a5c] bg-[#0f1a2f] text-foreground p-4 text-sm font-mono resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    {rawText.length > 0
                      ? `${rawText.length} chars · ~${rawText.split(/\s+/).filter(Boolean).length} words`
                      : 'Tip: The more detail you paste, the better the extraction.'}
                  </span>
                  <button
                    onClick={handleParse}
                    disabled={!rawText.trim()}
                    className="btn btn-primary text-sm px-5 py-2"
                  >
                    🔍 Parse Intel
                  </button>
                </div>
              </div>
            )}

            {/* Parsed preview */}
            {parsed && (
              <>
                {/* Summary card */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🧠</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{parsed.basic.name || 'Unnamed Company'}</span>
                        {parsed.basic.website && (
                          <a href={parsed.basic.website.startsWith('http') ? parsed.basic.website : `https://${parsed.basic.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate max-w-[200px]">
                            {parsed.basic.website}
                          </a>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          parsed.verifiedStatus === 'public_verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          parsed.verifiedStatus === 'internal_context_pending_confirmation' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          parsed.verifiedStatus === 'inferred' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-slate-500/20 text-slate-400 border-slate-500/30'
                        }`}>
                          {parsed.verifiedStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-2">
                        {summaryLine.split('\n').slice(1).join(' · ')}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {parsed.parsedFields.length} fields extracted
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {parsed.parsedFields.filter(f => f.confidence === 'high').length} high confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parsed fields by section */}
                <div className="space-y-2">
                  {sectionGroups.map(group => (
                    <div key={group.id} className="rounded-lg border border-[#2a3a5c] overflow-hidden">
                      <button
                        onClick={() => toggleSection(group.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <span>{group.icon}</span> {group.label}
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({group.fields.length})
                          </span>
                        </span>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-muted-foreground transition-transform duration-200 ${expandedSections.has(group.id) ? 'rotate-180' : ''}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {expandedSections.has(group.id) && (
                        <div className="border-t border-[#2a3a5c] divide-y divide-[#2a3a5c]/50">
                          {group.fields.map(field => (
                            <div key={field.key} className="px-4 py-2.5">
                              {editingField === field.key ? (
                                <div className="flex gap-2">
                                  <textarea
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    rows={Math.min(editValue.split('\n').length, 6)}
                                    className="flex-1 rounded border border-primary/50 bg-[#0f1a2f] text-foreground text-xs p-2 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    autoFocus
                                  />
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => saveEdit(field.key, group.id)}
                                      className="text-[10px] px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingField(null)}
                                      className="text-[10px] px-2 py-1 rounded bg-slate-500/20 text-muted-foreground hover:bg-slate-500/30 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-3 group">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {field.label}
                                    </span>
                                    <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">
                                      {field.value.length > 200
                                        ? field.value.slice(0, 200) + '...'
                                        : field.value}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => startEditing(field.key, field.value)}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all shrink-0"
                                  >
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Raw field list */}
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-1">
                    View all {parsed.parsedFields.length} parsed fields with confidence
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {parsed.parsedFields.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        {confidenceBadge(f.confidence)}
                        <span className="text-muted-foreground">{f.section} ›</span>
                        <span className="text-foreground font-mono">{f.field}</span>
                        <span className="text-muted-foreground/60 truncate">= {f.value.slice(0, 60)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setParsed(null);
                      setRawText('');
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    ← Start Over
                  </button>
                  <button
                    onClick={() => {
                      setParsed(null);
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Edit Raw Text
                  </button>
                  <button
                    onClick={handleVibeIt}
                    disabled={submitting || !parsed.basic.name}
                    className="btn btn-primary text-sm px-6 py-2 flex items-center gap-2 ml-auto active:scale-[0.97] transition-transform duration-150"
                  >
                    {submitting ? (
                      <>⏳ Vibing it in...</>
                    ) : (
                      <>✨ Vibe It In</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Compact trigger button variant (for Dashboard / headers)
// ============================================================

interface VibeInputTriggerProps {
  className?: string;
}

export function VibeInputTrigger({ className = '' }: VibeInputTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn btn-primary flex items-center gap-2 active:scale-[0.97] transition-transform duration-150 ${className}`}
      >
        <span>✨</span>
        <span>Vibe Input</span>
      </button>
      {open && <VibeInput onClose={() => setOpen(false)} />}
    </>
  );
}
