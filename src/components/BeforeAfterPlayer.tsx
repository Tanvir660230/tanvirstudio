
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Sparkles, Mic } from 'lucide-react';

interface BeforeAfterPlayerProps {
  title: string;
  artist: string;
  rawUrl?: string;
  masteredUrl?: string;
}

const STATIC_HEIGHTS = [20, 35, 60, 45, 80, 50, 30, 70, 90, 65, 40, 85, 75, 40, 55, 95, 60, 35, 70, 45, 85, 50, 25, 60, 80, 40, 55, 30, 45, 25, 40, 20];

export function BeforeAfterPlayer({ title, artist, rawUrl, masteredUrl }: BeforeAfterPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMastered, setIsMastered] = useState(true);
  const [progress, setProgress] = useState(0);

  const rawAudioRef = useRef<HTMLAudioElement | null>(null);
  const masteredAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const hasAudio = !!(rawUrl || masteredUrl);

  const animatedBars = useMemo(
    () => STATIC_HEIGHTS.map((height, index) => ({
      idleHeight: height,
      keyframes: [
        `${((index * 17) % 24) + 12}%`,
        `${((index * 29) % 55) + 40}%`,
        `${((index * 13) % 28) + 12}%`,
      ],
      duration: ((index * 7) % 5) * 0.08 + 0.34,
    })),
    []
  );

  // Build audio elements when URLs arrive
  useEffect(() => {
    const makeAudio = (url: string) => {
      const a = new Audio(url);
      a.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      return a;
    };

    if (rawUrl) rawAudioRef.current = makeAudio(rawUrl);
    if (masteredUrl) masteredAudioRef.current = makeAudio(masteredUrl);

    return () => {
      rawAudioRef.current?.pause();
      masteredAudioRef.current?.pause();
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [rawUrl, masteredUrl]);

  // When switching Raw ↔ Mastered mid-play, swap audio
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlayingRef.current) return;
    const stopping = isMastered ? rawAudioRef.current : masteredAudioRef.current;
    const starting = isMastered ? masteredAudioRef.current : rawAudioRef.current;
    stopping?.pause();
    starting?.play().catch(() => {});
    setTimeout(() => setProgress(0), 0);
  }, [isMastered]);

  // Progress ticker
  useEffect(() => {
    if (isPlaying && hasAudio) {
      progressIntervalRef.current = window.setInterval(() => {
        const audio = isMastered ? masteredAudioRef.current : rawAudioRef.current;
        if (audio && audio.duration) {
          setProgress(audio.currentTime / audio.duration);
        }
      }, 250);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, [isPlaying, isMastered, hasAudio]);

  const togglePlay = () => {
    if (!hasAudio) {
      setIsPlaying(p => !p);
      return;
    }
    const current = isMastered ? masteredAudioRef.current : rawAudioRef.current;
    if (!current) { setIsPlaying(p => !p); return; }

    if (isPlaying) {
      current.pause();
    } else {
      current.play().catch(err => console.warn('Audio play blocked:', err));
    }
    setIsPlaying(p => !p);
  };

  const switchMode = (mastered: boolean) => {
    if (mastered === isMastered) return;
    setIsMastered(mastered);
    setProgress(0);
  };

  const textColor = 'var(--text-primary)';
  const subtextColor = 'var(--text-secondary)';
  const inactiveBtnColor = 'var(--text-tertiary)';
  const panelBg = 'var(--surface-1)';
  const borderColor = 'var(--border-color)';
  const btnBg = 'var(--surface-2)';

  return (
    <div style={{
      background: panelBg,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${borderColor}`,
      borderRadius: '24px',
      padding: '32px',
      maxWidth: '600px',
      margin: '0 auto',
      boxShadow: 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', top: '-50%',
        left: isMastered ? '50%' : '-10%',
        width: '60%', height: '200%',
        background: isMastered
          ? 'radial-gradient(ellipse, rgba(217,173,98,0.15) 0%, transparent 60%)'
          : 'radial-gradient(ellipse, var(--surface-2) 0%, transparent 60%)',
        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: textColor, letterSpacing: '-0.02em' }}>{title}</h3>
            <p style={{ margin: '4px 0 0', color: subtextColor, fontSize: '15px', fontWeight: 500 }}>{artist}</p>
          </div>

          <div style={{ display: 'flex', background: btnBg, borderRadius: '30px', padding: '4px', border: `1px solid ${borderColor}` }}>
            <button
              onClick={() => switchMode(false)}
              style={{
                background: !isMastered ? 'var(--surface-1)' : 'transparent',
                color: !isMastered ? textColor : inactiveBtnColor,
                border: 'none', padding: '8px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Mic size={14} /> Raw
            </button>
            <button
              onClick={() => switchMode(true)}
              style={{
                background: isMastered ? 'var(--accent-gold-light)' : 'transparent',
                color: isMastered ? 'var(--text-primary)' : inactiveBtnColor,
                border: 'none', padding: '8px 16px', borderRadius: '20px',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Sparkles size={14} /> Mastered
            </button>
          </div>
        </div>

        {/* Visualizer */}
        <div style={{ height: '40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', marginBottom: '32px' }}>
          {animatedBars.map((bar, i) => (
            <motion.div
              key={i}
              style={{ width: '4px', background: isMastered ? 'var(--accent-gold-light)' : 'var(--text-primary)', borderRadius: '2px', opacity: 0.8 }}
              animate={{ height: isPlaying ? bar.keyframes : `${bar.idleHeight}%` }}
              transition={{ duration: isPlaying ? bar.duration : 0.5, repeat: isPlaying ? Infinity : 0, repeatType: 'reverse', ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div style={{ height: '4px', background: 'var(--surface-2)', borderRadius: '2px', marginBottom: '24px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            background: isMastered ? 'var(--accent-gold-light)' : 'var(--text-primary)',
            width: `${progress * 100}%`,
            transition: 'width 0.25s linear'
          }} />
        </div>

        {/* Play/Pause */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={togglePlay}
            style={{
              background: textColor, color: 'var(--card-bg)',
              border: 'none', width: '56px', height: '56px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '3px' }} />}
          </button>
        </div>

        {/* No audio note */}
        {!hasAudio && (
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: subtextColor, opacity: 0.7 }}>
            Sample audio not configured yet — add your tracks in the CMS to showcase your work.
          </p>
        )}
      </div>
    </div>
  );
}
