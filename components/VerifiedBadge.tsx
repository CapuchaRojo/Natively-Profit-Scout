interface Props {
  verified?: boolean;
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ verified = false, size = 'md' }: Props) {
  return (
    <span
      className={`badge ${verified ? 'badge-verified' : 'badge-assumed'}`}
      style={size === 'sm' ? { fontSize: '10px', padding: '1px 6px' } : undefined}
    >
      {verified ? '✓ Verified' : '◇ Assumed'}
    </span>
  );
}
