interface Props {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStep({ steps, currentStep, onStepClick }: Props) {
  return (
    <div className="wizard-steps">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
            <div
              className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => onStepClick?.(stepNum)}
            >
              <div className="wizard-step-number">
                {isCompleted ? '✓' : stepNum}
              </div>
              <span className="wizard-step-label">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`wizard-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
