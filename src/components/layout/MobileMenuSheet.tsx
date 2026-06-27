import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, StickyNote, Calendar, CheckSquare,
  Pencil, LogOut, Sun, Moon,
} from 'lucide-react';

interface MobileMenuSheetProps {
  show: boolean;
  onClose: () => void;
  theme: string;
  userData: {
    name?: string;
    email?: string;
    role?: string;
    photoURL?: string;
  } | null;
  onThemeToggle: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function MobileMenuSheet({
  show,
  onClose,
  theme,
  userData,
  onThemeToggle,
  onEditProfile,
  onLogout,
}: MobileMenuSheetProps) {
  const location = useLocation();

  const navLinks = [
    { path: '/settings', label: 'Studio Settings', icon: <Settings size={20} />, color: 'var(--text-secondary)' },
    ...(userData?.role !== 'client' ? [
      { path: '/notes', label: 'Creative Notes', icon: <StickyNote size={20} />, color: 'var(--color-warning)' },
      { path: '/calendar', label: 'Studio Deadlines', icon: <Calendar size={20} />, color: 'var(--color-success)' },
      { path: '/reminders', label: 'Reminders', icon: <CheckSquare size={20} />, color: 'var(--accent-purple)' },
    ] : []),
  ];

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1501, background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', padding: '0 0 calc(80px + env(safe-area-inset-bottom)) 0', border: '1px solid var(--border-color)', borderBottom: 'none', maxHeight: 'min(88vh, calc(100vh - 80px))', overflowY: 'auto' }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 10px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border-color)' }} />
            </div>

            {/* Profile card */}
            <div style={{ margin: '0 16px 16px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="avatar" style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 18 }}>
                    {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'TS'}
                  </div>
                )}
                <div style={{ width: 12, height: 12, background: 'var(--color-success)', borderRadius: '50%', position: 'absolute', bottom: -1, right: -1, border: '2px solid var(--card-bg)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userData?.name || 'Studio User'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userData?.email}
                </div>
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 6, background: 'rgba(196,154,82,0.12)', color: 'var(--accent-gold)' }}>
                  ◉ {userData?.role || 'user'}
                </span>
              </div>
              <button
                onClick={() => { onClose(); onEditProfile(); }}
                style={{ flexShrink: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Pencil size={13} /> Edit
              </button>
            </div>

            {/* Nav links */}
            <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navLinks.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, textDecoration: 'none', background: isActive ? 'rgba(196,154,82,0.08)' : 'transparent', color: isActive ? 'var(--accent-gold)' : 'var(--text-primary)', fontWeight: 600, fontSize: 15, transition: 'background 0.15s' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${item.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    {item.label}
                    {isActive && <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-gold)' }} />}
                  </Link>
                );
              })}
            </div>

            <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 16px' }} />

            {/* Actions */}
            <div style={{ padding: '0 16px 4px' }}>
              <button
                onClick={onThemeToggle}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, textAlign: 'left' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)', flexShrink: 0 }}>
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>

              <button
                onClick={() => { onClose(); onLogout(); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontWeight: 700, fontSize: 15, textAlign: 'left' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)', flexShrink: 0 }}>
                  <LogOut size={20} />
                </div>
                Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
