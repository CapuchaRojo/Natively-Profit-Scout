// ============================================================
// ChatGptJsonPaste — Paste ChatGPT JSON output and auto-parse
// into People Signals, Role Maps, Stakeholders, etc.
// ============================================================
import { useState } from 'react';
import { useToast } from '../Toast';
import type {
  RoleMapEntry, StakeholderHypothesis, HiringSignal,
  MilestoneSignal, OutreachAngle, PeopleDiscoveryQuestion,
  PeopleSignals, PeopleSignalSourceType, ConfidenceLevel,
} from '../../types';

interface ParsedPeopleData {
  sourceType?: string;
  sourceUrl?: string;
  analysis?: {
    roleMap?: any[];
    stakeholderHypotheses?: any[];
    hiringSignals?: any[];
    milestoneSignals?: any[];
    outreachAngles?: any[];
    discoveryQuestions?: any[];
  };
}

interface Props {
  onParsed: (data: PeopleSignals) => void;
  companyName?: string;
  defaultSourceUrl?: string;
}

export function ChatGptJsonPaste({ onParsed, companyName, defaultSourceUrl }: Props) {
  const { showToast } = useToast();
  const [pastedJson, setPastedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCounts, setParsedCounts] = useState<Record<string, number>>({});

  const handlePaste = () => {
    setParseError(null);
    const text = pastedJson.trim();
    if (!text) {
      setParseError('Paste some JSON first');
      return;
    }

    try {
      const parsed: ParsedPeopleData = JSON.parse(text);
      const analysis = parsed.analysis;

      if (!analysis) {
        setParseError('JSON parsed but "analysis" field is missing. Make sure you pasted the full ChatGPT output.');
        return;
      }

      const now = new Date().toISOString();
      const baseSourceUrl = parsed.sourceUrl || defaultSourceUrl || '';
      const sourceType: PeopleSignalSourceType = mapSourceType(parsed.sourceType);

      const roleMap: RoleMapEntry[] = (analysis.roleMap || []).map((r: any, i: number) => ({
        roleType: mapRoleType(r.department),
        roleTitle: r.roleTitle || 'Unknown Role',
        department: r.department || 'Unknown',
        evidence: r.evidence || '',
        confidence: normalizeConfidence(r.confidence),
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const stakeholderHypotheses: StakeholderHypothesis[] = (analysis.stakeholderHypotheses || []).map((h: any, i: number) => ({
        id: `stkh-${Date.now()}-${i}`,
        roleTitle: h.roleTitle || 'Unknown',
        department: h.department || 'Unknown',
        likelyConcern: h.likelyConcern || '',
        likelyBuyingInfluence: h.likelyBuyingInfluence || 3,
        likelyDiscoveryQuestion: h.likelyDiscoveryQuestion || '',
        confidence: normalizeConfidence(h.confidence),
        evidence: h.evidence || '',
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const hiringSignals: HiringSignal[] = (analysis.hiringSignals || []).map((h: any, i: number) => ({
        id: `hire-${Date.now()}-${i}`,
        openRole: h.openRole || '',
        department: h.department || 'Unknown',
        growingDepartment: '',
        roleGap: h.roleGap || '',
        newInitiative: '',
        repeatedNeed: '',
        toolProcessHint: '',
        evidence: h.evidence || '',
        confidence: normalizeConfidence(h.confidence || 'Medium'),
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const milestoneSignals: MilestoneSignal[] = (analysis.milestoneSignals || []).map((m: any, i: number) => ({
        id: `mile-${Date.now()}-${i}`,
        milestoneType: mapMilestoneType(m.milestoneType),
        description: m.description || '',
        evidence: m.evidence || '',
        confidence: normalizeConfidence(m.confidence || 'Medium'),
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const outreachAngles: OutreachAngle[] = (analysis.outreachAngles || []).map((o: any, i: number) => ({
        id: `outr-${Date.now()}-${i}`,
        angleText: o.angleText || '',
        targetRole: o.targetRole || 'Unknown',
        confidence: normalizeConfidence(o.confidence),
        evidence: o.evidence || '',
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const discoveryQuestions: PeopleDiscoveryQuestion[] = (analysis.discoveryQuestions || []).map((q: any, i: number) => ({
        id: `disc-${Date.now()}-${i}`,
        targetRole: q.targetRole || 'Unknown',
        question: q.question || '',
        category: mapQuestionCategory(q.targetRole),
        confidence: normalizeConfidence(q.confidence || 'Medium'),
        evidence: q.evidence || '',
        sourceType,
        sourceUrl: baseSourceUrl,
      }));

      const result: PeopleSignals = {
        roleMap,
        stakeholderHypotheses,
        hiringSignals,
        milestoneSignals,
        outreachAngles,
        discoveryQuestions,
      };

      // Count what we parsed
      const counts: Record<string, number> = {};
      if (roleMap.length > 0) counts['Role Map Entries'] = roleMap.length;
      if (stakeholderHypotheses.length > 0) counts['Stakeholder Hypotheses'] = stakeholderHypotheses.length;
      if (hiringSignals.length > 0) counts['Hiring Signals'] = hiringSignals.length;
      if (milestoneSignals.length > 0) counts['Milestone Signals'] = milestoneSignals.length;
      if (outreachAngles.length > 0) counts['Outreach Angles'] = outreachAngles.length;
      if (discoveryQuestions.length > 0) counts['Discovery Questions'] = discoveryQuestions.length;
      setParsedCounts(counts);

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      showToast(`✅ Parsed ${total} intelligence items from ChatGPT`, 'success');

      onParsed(result);
      setPastedJson('');
    } catch (err) {
      setParseError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown parse error'}`);
    }
  };

  const tryParseFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedJson(text);
        showToast('📋 Pasted from clipboard', 'info');
      }
    } catch {
      showToast('Could not read clipboard. Paste manually.', 'warning');
    }
  };

  const totalParsed = Object.values(parsedCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      background: 'rgba(139, 92, 246, 0.06)',
      border: '1px solid rgba(139, 92, 246, 0.25)',
      borderRadius: 8,
      padding: '14px 16px',
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <div>
            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
              ChatGPT People Intelligence Import
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Paste the structured JSON output from your LinkedIn Research Assistant
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={tryParseFromClipboard}
          style={{ fontSize: 11 }}
        >
          📋 Paste from Clipboard
        </button>
      </div>

      {/* Status when data is parsed */}
      {totalParsed > 0 && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 10,
          fontSize: 11,
          color: '#10b981',
        }}>
          ✅ Parsed: {Object.entries(parsedCounts).map(([k, v]) => `${v} ${k}`).join(' · ')}
        </div>
      )}

      {/* Textarea */}
      <textarea
        className="input"
        rows={5}
        value={pastedJson}
        onChange={e => { setPastedJson(e.target.value); setParseError(null); }}
        placeholder={`Paste ChatGPT JSON here...

Example:
{
  "sourceType": "linkedin_company_about",
  "sourceUrl": "https://www.linkedin.com/company/acmecorp",
  "analysis": {
    "roleMap": [...],
    "stakeholderHypotheses": [...],
    "hiringSignals": [...],
    "milestoneSignals": [...],
    "outreachAngles": [...],
    "discoveryQuestions": [...]
  }
}`}
        style={{ fontSize: 11, fontFamily: 'monospace' }}
      />

      {/* Error */}
      {parseError && (
        <div style={{
          marginTop: 6,
          fontSize: 11,
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.1)',
          padding: '6px 10px',
          borderRadius: 4,
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          {parseError}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handlePaste}
          disabled={!pastedJson.trim()}
        >
          🤖 Parse & Import
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setPastedJson('');
            setParseError(null);
            setParsedCounts({});
          }}
        >
          Clear
        </button>
      </div>

      {/* Quick reference */}
      <details style={{ marginTop: 10, fontSize: 10, color: '#64748b' }}>
        <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>
          📖 How to use with ChatGPT
        </summary>
        <div style={{ marginTop: 6, lineHeight: 1.6, padding: '6px 8px', background: '#0a0e17', borderRadius: 4 }}>
          <p><strong>1.</strong> Open the ChatGPT LinkedIn Research Assistant prompt from your docs/prompts folder</p>
          <p><strong>2.</strong> Paste public LinkedIn company text into ChatGPT</p>
          <p><strong>3.</strong> ChatGPT returns structured JSON</p>
          <p><strong>4.</strong> Copy the entire JSON output and paste it above</p>
          <p><strong>5.</strong> Click "Parse & Import" — signals auto-populate below</p>
          <p style={{ marginTop: 4, color: '#f59e0b' }}>
            ⚠️ Only paste public company information. No private profiles or login-gated content.
          </p>
        </div>
      </details>
    </div>
  );
}

// ─── Helper Mappers ─────────────────────────────────────────────

function mapSourceType(type?: string): PeopleSignalSourceType {
  switch (type) {
    case 'linkedin_company_about': return 'linkedin_company_about';
    case 'linkedin_company_post': return 'linkedin_company_post';
    case 'linkedin_job_post': return 'linkedin_job_post';
    case 'company_team_page': return 'company_team_page';
    case 'leadership_page': return 'leadership_page';
    case 'press_release': return 'press_release';
    case 'careers_page': return 'careers_page';
    default: return 'manual_role_notes';
  }
}

function normalizeConfidence(c?: string): ConfidenceLevel {
  if (!c) return 'Medium';
  const lc = c.toLowerCase();
  if (lc === 'high' || lc === 'verified') return 'High';
  if (lc === 'low') return 'Low';
  return 'Medium';
}

function mapRoleType(department?: string): RoleMapEntry['roleType'] {
  const d = (department || '').toLowerCase();
  if (d.includes('exec') || d.includes('c-suite') || d.includes('founder') || d.includes('ceo') || d.includes('cto')) return 'executive_founder';
  if (d.includes('sales') || d.includes('marketing') || d.includes('gtm') || d.includes('growth')) return 'sales_gtm';
  if (d.includes('ops') || d.includes('operation')) return 'operations';
  if (d.includes('finance') || d.includes('account') || d.includes('admin')) return 'finance_admin';
  if (d.includes('support') || d.includes('success') || d.includes('cs')) return 'support';
  if (d.includes('engineer') || d.includes('product') || d.includes('tech') || d.includes('dev')) return 'technical_product';
  if (d.includes('security') || d.includes('compliance') || d.includes('legal')) return 'security_compliance';
  return 'unknown_decision_maker_gap';
}

function mapMilestoneType(type?: string): MilestoneSignal['milestoneType'] {
  switch (type) {
    case 'funding': return 'funding';
    case 'expansion': return 'growth';
    case 'new_product': return 'new_product';
    case 'hiring_spree': return 'growth';
    case 'acquisition': return 'growth';
    case 'leadership_change': return 'growth';
    case 'partnership': return 'partnership';
    case 'launch': return 'launch';
    case 'award': return 'award';
    case 'customer_win': return 'customer_win';
    default: return 'other';
  }
}

function mapQuestionCategory(targetRole?: string): PeopleDiscoveryQuestion['category'] {
  const r = (targetRole || '').toLowerCase();
  if (r.includes('ceo') || r.includes('founder') || r.includes('exec')) return 'founder_ceo';
  if (r.includes('ops') || r.includes('operation')) return 'operations';
  if (r.includes('sales') || r.includes('market') || r.includes('gtm') || r.includes('growth')) return 'sales_gtm';
  if (r.includes('support') || r.includes('success') || r.includes('cs')) return 'support';
  if (r.includes('finance') || r.includes('account') || r.includes('admin')) return 'finance_admin';
  if (r.includes('security') || r.includes('compliance')) return 'security_compliance';
  return 'technical_product';
}
