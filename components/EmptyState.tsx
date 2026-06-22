import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function EmptyState({ children }: Props) {
  return <div className="empty-state">{children}</div>;
}

interface EmptyStateIconProps {
  icon: string;
}

export function EmptyStateIcon({ icon }: EmptyStateIconProps) {
  return <div className="empty-state-icon">{icon}</div>;
}

interface EmptyStateTitleProps {
  children: ReactNode;
}

export function EmptyStateTitle({ children }: EmptyStateTitleProps) {
  return <div className="empty-state-title">{children}</div>;
}

interface EmptyStateDescProps {
  children: ReactNode;
}

export function EmptyStateDesc({ children }: EmptyStateDescProps) {
  return <div className="empty-state-desc">{children}</div>;
}
