import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export function CountUp({ value, suffix = '', delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  
  useEffect(() => {
    if (!inView) return;
    let startTs = 0;
    const duration = 2000;
    const id = setTimeout(() => {
      const tick = (ts: number) => {
        if (!startTs) startTs = ts;
        const prog = Math.min((ts - startTs) / duration, 1);
        const eased = prog === 1 ? 1 : 1 - Math.pow(2, -10 * prog); // ease-out-expo
        setDisplay(Math.round(eased * value));
        if (prog < 1) requestAnimationFrame(tick);
        else setDone(true);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(id);
  }, [inView, value, delay]);
  
  return (
    <span ref={ref} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums', transition: 'text-shadow 0.8s ease', textShadow: done ? '0 0 48px rgba(217,173,98,0.55)' : 'none' }}>
      {display}{suffix}
    </span>
  );
}

export function RawStat({ value, delay = 0 }: { value: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, filter: 'blur(14px)', scale: 0.88, y: 8 }}
      animate={inView ? { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'inline-block' }}
    >
      {value}
    </motion.span>
  );
}
