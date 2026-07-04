
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');

  useEffect(() => {
    setTimeout(() => {
      setPhase('running');
      setProgress(15);
    }, 0);

    const t1 = setTimeout(() => setProgress(50),  80);
    const t2 = setTimeout(() => setProgress(78),  220);
    const t3 = setTimeout(() => setProgress(92),  420);
    const t4 = setTimeout(() => { setProgress(100); setPhase('done'); }, 550);
    const t5 = setTimeout(() => { setPhase('idle'); setProgress(0); }, 820);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [location.pathname]);

  if (phase === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9999,
        height: 3, pointerEvents: 'none',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #b8892a, #d9ad62, #f0d080)',
        boxShadow: 'none',
        borderRadius: '0 2px 2px 0',
        transition: 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
        opacity: phase === 'done' ? 0 : 1,
        transitionProperty: 'width, opacity',
        transitionDuration: phase === 'done' ? '0.22s, 0.25s' : '0.22s, 0s',
        transitionDelay: phase === 'done' ? '0s, 0.1s' : '0s',
      }}
    >
      {/* Glow dot at the tip */}
      <div style={{
        position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
        width: 8, height: 8, borderRadius: '50%',
        background: '#f0d080',
        boxShadow: 'none',
      }} />
    </div>
  );
}
