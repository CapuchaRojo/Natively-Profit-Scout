import type { ConfidenceLevel } from '../types';

interface Props {
  level: ConfidenceLevel;
  size?: 'sm' | 'md';
}

const config: Record<ConfidenceLevel, { className: string; label: string }> = {
  High: { className: 'badge badge-high', label: 'High' },
  Medium: { className: 'badge badge-medium', label: 'Medium' },
  Low: { className: 'badge badge-low', label: 'Low' },
};

export function ConfidenceBadge({ level, size = 'md' }: Props) {
  const c = config[level];
  return (
    <span className={c.className} style={size === 'sm' ? { fontSize: '10px', padding: '1px 6px' } : undefined}>
      {c.label}
    </span>
  );
}
