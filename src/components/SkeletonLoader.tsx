import React from 'react';


export function SkeletonLoader({ style, className = '' }: { style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={`skeleton-fast ${className}`}
      style={style}
    />
  );
}

export function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%', background: 'var(--bg-color)' }}>
      <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--border-color)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ width: 8, height: 8, background: 'var(--accent-gold)', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
