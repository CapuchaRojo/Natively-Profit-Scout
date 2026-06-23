// ============================================================
// LinkedIn Source Assistant Panel — v0.6
// Paste-text source-type detector, employee/role extraction,
// and auto-fill to Company People fields
// ============================================================

import { useState } from 'react';
import type { CompanyPeople, ConfidenceLevel, PeopleSignalSourceType } from '../../types';
import { detectSourceType, extractPeopleForAutoFill } from '../../services/linkedinSourceAssistant';
import type { PeopleFieldsAutoFill } from '../../services/linkedinSourceAssistant';

interface LinkedInSourceAssistantProps {
  companyName: string;
  onAutoFill: (peopleUpdates: Partial<CompanyPeople>) => void;
}

interface SourceTypeResult {
  sourceType: PeopleSignalSourceType;
  label: string;
  confidence: ConfidenceLevel;
  indicators: string[];
}

interface ExtractionResult {
  employees: { name: string; role?: string; department?: string }[];
  peopleFields: PeopleFieldsAutoFill;
}

export function LinkedInSourceAssistant({ companyName, onAutoFill }: LinkedInSourceAssistantProps) {
  const [pastedText, setPastedText] = useState('');
  const [detection, setDetection] = useState<SourceTypeResult | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleDetectSource = () => {
    const text = pastedText.trim();
    if (!text) return;
    setAnalyzing(true);
    setExtraction(null);
    setApplied(false);

    // Small delay to show loading state
    setTimeout(() => {
      const result = detectSourceType(text);
      setDetection(result);

      const extractionResult = extractPeopleForAutoFill(text, companyName);
      setExtraction(extractionResult);
      setAnalyzing(false);
    }, 200);
  };

  const handleClear = () => {
    setPastedText('');
    setDetection(null);
    setExtraction(null);
    setApplied(false);
  };

  const handleApplyToCompany = () => {
    if (!extraction) return;
    onAutoFill({
      leadership: extraction.peopleFields.leadership || '',
      salesTeam: extraction.peopleFields.salesTeam || '',
      technicalTeam: extraction.peopleFields.technicalTeam || '',
      operationsTeam: extraction.peopleFields.operationsTeam || '',
      supportTeam: extraction.peopleFields.supportTeam || '',
      financeAdmin: extraction.peopleFields.financeAdmin || '',
    });
    setApplied(true);
  };

  const confidenceColor = (c: ConfidenceLevel) => {
    switch (c) {
      case 'High': return '#10b981';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#64748b';
    }
  };

  return (
    <div style={{
      background: 'rgba(59, 130, 246, 0.04)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: 8,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.06)',
        padding: '10px 14px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>🔗</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
          LinkedIn Source Assistant
        </span>
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 4,
          background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          v0.6
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
          Paste text from a LinkedIn company page, employee profile, job post, careers page, or team listing.
          The assistant will auto-detect the source type, extract employees and roles, and let you auto-fill company profile fields.
        </div>

        {/* Textarea */}
        <textarea
          className="input"
          rows={4}
          value={pastedText}
          onChange={e => {
            setPastedText(e.target.value);
            if (detection || extraction) {
              setDetection(null);
              setExtraction(null);
              setApplied(false);
            }
          }}
          placeholder={`Paste LinkedIn company page text, employee profiles, job postings, or team listings here...\n\nExample: Pasted text from ${companyName}'s LinkedIn about page or team section.`}
          style={{ fontSize: 12, marginBottom: 10 }}
        />

        {/* Action buttons */}
        <div className="flex" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleDetectSource}
            disabled={!pastedText.trim() || analyzing}
          >
            {analyzing ? '🔍 Analyzing...' : '🔍 Detect Source & Extract People'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleClear}
            disabled={!pastedText && !detection}
          >
            🗑️ Clear
          </button>
        </div>

        {/* Results */}
        {analyzing && (
          <div style={{
            marginTop: 12, padding: 12, textAlign: 'center',
            fontSize: 12, color: '#94a3b8',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🔍</div>
            Analyzing text and extracting people data...
          </div>
        )}

        {!analyzing && detection && (
          <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
            {/* Source Type Detection */}
            <div style={{
              padding: 10, background: '#0f1525', borderRadius: 6,
              border: '1px solid #2a3a5c',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                  📋 Detected Source Type
                </span>
                <span className="badge" style={{
                  fontSize: 10,
                  background: `${confidenceColor(detection.confidence)}20`,
                  color: confidenceColor(detection.confidence),
                  border: `1px solid ${confidenceColor(detection.confidence)}40`,
                }}>
                  {detection.confidence}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 4 }}>
                {detection.label}
              </div>
              {detection.indicators.length > 0 && (
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
                  {detection.indicators.map((ind, i) => (
                    <div key={i}>• {ind}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Extracted Employees Count */}
            {extraction && (
              <>
                <div style={{
                  padding: 10, background: '#0f1525', borderRadius: 6,
                  border: '1px solid #2a3a5c',
                }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                      👥 Extracted People ({extraction.employees.length})
                    </span>
                  </div>

                  {extraction.employees.length > 0 ? (
                    <div style={{ maxHeight: 200, overflow: 'auto' }}>
                      {extraction.employees.map((emp, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '3px 0', fontSize: 11, color: '#e2e8f0',
                          borderBottom: i < extraction.employees.length - 1
                            ? '1px solid rgba(42,58,92,0.3)' : 'none',
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                            background: emp.department?.toLowerCase().includes('executive')
                              ? '#8b5cf6'
                              : emp.department?.toLowerCase().includes('sales')
                                ? '#3b82f6'
                                : emp.department?.toLowerCase().includes('technology')
                                  ? '#10b981'
                                  : emp.department?.toLowerCase().includes('support')
                                    ? '#f59e0b'
                                    : '#64748b',
                          }} />
                          <span style={{ fontWeight: 500 }}>{emp.name}</span>
                          {emp.role && (
                            <span style={{ color: '#64748b' }}>
                              — {emp.role}
                            </span>
                          )}
                          {emp.department && (
                            <span className="badge" style={{
                              fontSize: 8, padding: '1px 5px', marginLeft: 'auto',
                              background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                            }}>
                              {emp.department}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      No employees extracted. Try pasting more complete text from a team page or LinkedIn profile.
                    </div>
                  )}
                </div>

                {/* Auto-Fill Preview */}
                <div style={{
                  padding: 10, background: '#0f1525', borderRadius: 6,
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                    📝 Auto-Fill Preview — Company People Fields
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                    <FieldPreview
                      label="Leadership"
                      value={extraction.peopleFields.leadership}
                    />
                    <FieldPreview
                      label="Sales Team"
                      value={extraction.peopleFields.salesTeam}
                    />
                    <FieldPreview
                      label="Technical Team"
                      value={extraction.peopleFields.technicalTeam}
                    />
                    <FieldPreview
                      label="Operations"
                      value={extraction.peopleFields.operationsTeam}
                    />
                    <FieldPreview
                      label="Support"
                      value={extraction.peopleFields.supportTeam}
                    />
                    <FieldPreview
                      label="Finance/Admin"
                      value={extraction.peopleFields.financeAdmin}
                    />
                  </div>
                  <div style={{
                    fontSize: 10, color: '#64748b', marginTop: 8,
                    borderTop: '1px solid rgba(42,58,92,0.3)', paddingTop: 6,
                  }}>
                    {extraction.peopleFields.peopleNotes.length > 0
                      ? extraction.peopleFields.peopleNotes.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))
                      : 'No people data to analyze.'}
                  </div>
                </div>

                {/* Apply Button */}
                <div className="flex justify-between" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {applied
                      ? '✅ Applied to company profile'
                      : 'Creates/modifies company People fields only. Existing data is preserved (empty fields get filled).'}
                  </div>
                  <button
                    className={`btn ${applied ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={applied ? undefined : handleApplyToCompany}
                    disabled={applied || extraction.employees.length === 0}
                    style={{ cursor: applied ? 'default' : 'pointer' }}
                  >
                    {applied ? '✅ Applied!' : '📝 Auto-Fill to Company Profile'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Field Preview Sub-Component ────────────────────────────────

function FieldPreview({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: '#64748b', fontWeight: 500 }}>{label}: </span>
      {value ? (
        <span style={{ color: '#10b981' }}>
          {value.split('\n').length} entr{value.split('\n').length === 1 ? 'y' : 'ies'}
        </span>
      ) : (
        <span style={{ color: '#64748b' }}>—</span>
      )}
      {value && (
        <span style={{
          display: 'inline-block', marginLeft: 4,
          fontSize: 9, color: '#64748b', cursor: 'pointer',
        }}
          title={value.slice(0, 300)}
        >
          ℹ️
        </span>
      )}
    </div>
  );
}