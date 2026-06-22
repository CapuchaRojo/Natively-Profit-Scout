import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon?: string;
  trend?: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
}

const colorClasses: Record<string, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
};

export function StatCard({ label, value, icon, trend, color = 'blue', onClick }: Props) {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="stat-card-label">{label}</span>
        {icon && <span style={{ fontSize: 20, opacity: 0.4 }}>{icon}</span>}
      </div>
      <div
        className="stat-card-value"
        style={{ color: colorClasses[color] || colorClasses.blue }}
      >
        {value}
      </div>
      {trend && <div className="stat-card-trend">{trend}</div>}
    </div>
  );
}
