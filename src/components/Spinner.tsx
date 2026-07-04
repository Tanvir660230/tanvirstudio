interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 16, color = 'currentColor' }: SpinnerProps) {
  const thickness = Math.max(2, Math.round(size / 7));
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: `${thickness}px solid ${color}33`,
      borderTopColor: color,
      animation: 'spin 0.65s linear infinite',
      flexShrink: 0,
      display: 'inline-block',
    }} />
  );
}
