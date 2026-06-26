// ============================================================
// ReconProgressBar — Visual step indicator for the recon workflow
// Shows Discover → Fetch → Analyze → People → Apply as a progress bar
// ============================================================

interface ReconProgressStep {
  key: string;
  label: string;
  icon: string;
  completed: boolean;
  active: boolean;
}

interface Props {
  currentStep: string;
  completedSteps: string[];
  onStepClick?: (step: string) => void;
}

const ALL_STEPS = [
  { key: 'discover', label: 'Discover', icon: '🔗' },
  { key: 'fetch', label: 'Fetch', icon: '📡' },
  { key: 'analyze', label: 'Analyze', icon: '🧠' },
  { key: 'people', label: 'People', icon: '👤' },
  { key: 'apply', label: 'Apply', icon: '✅' },
];

export function ReconProgressBar({ currentStep, completedSteps, onStepClick }: Props) {
  const steps: ReconProgressStep[] = ALL_STEPS.map(s => ({
    ...s,
    completed: completedSteps.includes(s.key),
    active: s.key === currentStep,
  }));

  const currentIndex = ALL_STEPS.findIndex(s => s.key === currentStep);
  const progressPct = currentIndex >= 0
    ? Math.round((currentIndex / (ALL_STEPS.length - 1)) * 100)
    : 0;

  return (
    <div style={{
      background: '#0f1525',
      border: '1px solid #2a3a5c',
      borderRadius: 8,
      padding: '14px 20px',
      marginBottom: 20,
    }}>
      {/* Progress bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginBottom: 10,
      }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} style={{
              display: 'flex',
              alignItems: 'center',
              flex: isLast ? 0 : 1,
              cursor: onStepClick ? 'pointer' : 'default',
            }}>
              {/* Step circle */}
              <div
                onClick={() => onStepClick?.(step.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 20,
                  background: step.active
                    ? 'rgba(59, 130, 246, 0.15)'
                    : step.completed
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'transparent',
                  border: step.active
                    ? '1px solid rgba(59, 130, 246, 0.3)'
                    : step.completed
                      ? '1px solid rgba(16, 185, 129, 0.2)'
                      : '1px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: step.active
                    ? '#3b82f6'
                    : step.completed
                      ? '#10b981'
                      : '#2a3a5c',
                  color: step.active || step.completed ? '#fff' : '#64748b',
                  transition: 'all 0.2s',
                }}>
                  {step.completed ? '✓' : step.icon}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: step.active ? 600 : 400,
                  color: step.active ? '#e2e8f0' : step.completed ? '#10b981' : '#64748b',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div style={{
                  flex: 1,
                  height: 2,
                  margin: '0 6px',
                  borderRadius: 1,
                  background: step.completed ? '#10b981' : '#2a3a5c',
                  minWidth: 16,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress percentage + status text */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        color: '#64748b',
      }}>
        <div>
          {currentStep === 'discover' && '🔗 Start by discovering public URLs for this company'}
          {currentStep === 'fetch' && '📡 Fetching and analyzing discovered URLs'}
          {currentStep === 'analyze' && '🧠 Review detected tools, workflows, and suggestions'}
          {currentStep === 'people' && '👤 Analyze public people signals and stakeholder hypotheses'}
          {currentStep === 'apply' && '✅ Apply all findings to the company profile and export'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{
            width: 100,
            height: 4,
            background: '#2a3a5c',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #3b82f6, #10b981)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
            {completedSteps.length}/{ALL_STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
}
