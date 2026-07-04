import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, X, FolderPlus, ReceiptText, UserPlus, Plus } from 'lucide-react';
import { writeBatch, doc, type Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { Notification } from '../../types';

type FirestoreDate = Timestamp | string | null | undefined;

function getTimestamp(d: FirestoreDate): number {
  if (!d) return 0;
  if (typeof d === 'string') return new Date(d).getTime();
  return (d as Timestamp).toDate().getTime();
}

function HeaderGreeting({ userName }: { userName: string }) {
  const [hour, setHour] = useState(new Date().getHours());

  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
        {greeting}, <span style={{ color: 'var(--accent-gold)' }}>{userName}</span>
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
        Welcome back to your studio
      </span>
    </div>
  );
}

function HeaderClock() {
  const [now, setNow] = useState(new Date());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.4px', fontVariantNumeric: 'tabular-nums', color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>
        {timeStr}
      </span>
      <div style={{ width: 1, height: 18, flexShrink: 0, background: 'var(--border-color)', opacity: 0.8 }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {dateStr}
      </span>
    </div>
  );
}

const NAV_COMMANDS = [
  { label: 'Go to Dashboard', path: '/dashboard' },
  { label: 'Go to Production Suite', path: '/work' },
  { label: 'Go to Clients', path: '/clients' },
  { label: 'Go to Finance & Ledger', path: '/finance' },
  { label: 'Go to Notes', path: '/notes' },
  { label: 'Go to Reminders', path: '/reminders' },
  { label: 'Go to Settings', path: '/settings' },
];

export interface AdminHeaderProps {
  isSidebarOpen: boolean;
  isMobile: boolean;
  theme: string;
  onNewProject: () => void;
  onNewInvoice: () => void;
  onNewClient: () => void;
  searchRef: React.RefObject<HTMLInputElement>;
}

export function AdminHeader({
  isSidebarOpen,
  isMobile,
  theme,
  onNewProject,
  onNewInvoice,
  onNewClient,
  searchRef,
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const { userData } = useAuth();
  const { settings } = useSettings();
  const { tasks, clients, transactions, notifications: rawNotifications } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const { studioName, studioLogo } = settings;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setShowNotifications(false);
    setSearchQuery('');
    setIsSearchFocused(false);
    setShowQuickMenu(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [location.pathname]);

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  const notifications = [...rawNotifications].sort(
    (a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
  );

  const groupedNotifications = (() => {
    const seen = new Map<string, { n: Notification; count: number }>();
    const result: Array<{ n: Notification; count: number }> = [];
    for (const n of notifications) {
      if (seen.has(n.title)) {
        seen.get(n.title)!.count += 1;
      } else {
        const entry = { n, count: 1 };
        seen.set(n.title, entry);
        result.push(entry);
      }
    }
    return result;
  })();

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    await batch.commit();
  };

  const searchResults = (() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return [
      ...tasks
        .filter(t => (t.title || '').toLowerCase().includes(q) || (t.client || '').toLowerCase().includes(q))
        .slice(0, 4)
        .map(t => ({ title: t.title, subtitle: `${t.client || 'No client'} · ${(t.status || '').charAt(0).toUpperCase() + (t.status || '').slice(1)}`, type: 'Task', path: '/work' })),
      ...clients
        .filter(c => (c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q))
        .slice(0, 3)
        .map(c => ({ title: c.name, subtitle: c.company || c.email || 'Client', type: 'Client', path: '/clients' })),
      ...transactions
        .filter(tx => (tx.title || '').toLowerCase().includes(q) || (tx.description || '').toLowerCase().includes(q))
        .slice(0, 2)
        .map(tx => ({ title: tx.title, subtitle: `${tx.type === 'in' ? '+' : '-'}${tx.amount || ''}`, type: 'Finance', path: '/finance' })),
      ...NAV_COMMANDS
        .filter(c => c.label.toLowerCase().includes(q))
        .map(c => ({ title: c.label, subtitle: c.path, type: 'Navigate', path: c.path })),
    ].slice(0, 8);
  })();

  const headerWidth = isMobile ? '100%' : `calc(100% - ${isSidebarOpen ? 300 : 80}px)`;

  return (
    <>
      <motion.header
        className="main-header backend-main-header"
        animate={{ width: headerWidth }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        style={{
          position: 'fixed', top: 0, right: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', height: 60,
          background: theme === 'dark' ? 'rgba(10,10,14,0.75)' : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          boxShadow: theme === 'dark'
            ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)'
            : '0 1px 0 rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {isMobile ? (
          /* ── MOBILE ── */
          <>
            {!isSearchFocused && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, flexShrink: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <img src={studioLogo || '/Logo.jpg'} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(90deg, var(--text-primary) 60%, var(--accent-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                  {studioName || 'Tanvir Studio'}
                </span>
              </div>
            )}
            <div style={{ flex: 1, padding: '0 10px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', height: 38, gap: 8, padding: '0 12px', borderRadius: 10, border: isSearchFocused ? '1.5px solid rgba(196,154,82,0.5)' : '1.5px solid var(--border-color)', background: isSearchFocused ? (theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff') : 'var(--surface-1)', transition: 'all 0.2s ease' }}>
                <Search size={15} strokeWidth={2} color={isSearchFocused ? 'var(--accent-gold)' : 'var(--text-tertiary)'} style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="header-search-input"
                  style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'inherit' }}
                />
                {searchQuery && (
                  <div onClick={() => setSearchQuery('')} style={{ cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}>
                    <X size={13} />
                  </div>
                )}
              </div>
              <AnimatePresence>
                {isSearchFocused && searchQuery.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', maxHeight: 320, overflowY: 'auto', zIndex: 200 }}
                  >
                    {searchResults.length > 0 ? searchResults.map((res, i) => (
                      <div key={i} onMouseDown={() => { navigate(res.path); setSearchQuery(''); setIsSearchFocused(false); }} style={{ padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{res.title}</span>
                        <span style={{ fontSize: 10, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>{res.type}</span>
                      </div>
                    )) : (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>No results</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Mobile bell */}
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
              onClick={() => { setShowNotifications(p => { if (!p && unreadCount > 0) markAllRead(); return !p; }); }}
              style={{ position: 'relative', flexShrink: 0, width: 36, height: 36, marginRight: 10, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            >
              <Bell size={18} strokeWidth={1.8} />
              {unreadCount > 0 && <span style={{ top: 6, right: 6, width: 7, height: 7, background: 'var(--accent-red)', borderRadius: '50%', position: 'absolute', border: '2px solid var(--card-bg)' }} />}
            </motion.button>
          </>
        ) : (
          /* ── DESKTOP ── */
          <>
            <div style={{ flexShrink: 0, paddingLeft: 32, zIndex: 1 }}>
              <HeaderGreeting userName={userData?.name?.split(' ')[0] || 'Studio'} />
            </div>

            {/* Centered search */}
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '38%', maxWidth: 560, zIndex: 0 }}>
              <div style={{ width: '100%', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: 44, gap: 10, padding: '0 16px', borderRadius: 12, border: isSearchFocused ? '1px solid rgba(196,154,82,0.45)' : `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, background: isSearchFocused ? (theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff') : (theme === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.022)'), boxShadow: isSearchFocused ? `0 0 0 3px rgba(196,154,82,0.1), 0 4px 20px rgba(0,0,0,${theme === 'dark' ? '0.22' : '0.07'})` : (theme === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'inset 0 1px 2px rgba(0,0,0,0.04)'), transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
                  <Search size={15} strokeWidth={2} color={isSearchFocused ? 'var(--accent-gold)' : 'var(--text-tertiary)'} style={{ flexShrink: 0, opacity: isSearchFocused ? 1 : 0.5, transition: 'all 0.2s', cursor: 'pointer' }} onClick={() => searchRef.current?.focus()} />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search projects, clients, transactions..."
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="header-search-input"
                    style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 400, fontFamily: 'inherit', lineHeight: 1, letterSpacing: '0.05px' }}
                  />
                  {searchQuery ? (
                    <div onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }} style={{ cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0, opacity: 0.5 }}>
                      <X size={13} />
                    </div>
                  ) : (
                    <kbd style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', opacity: 0.55, background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', padding: '3px 7px', borderRadius: 6, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'}`, letterSpacing: '0.2px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Ctrl K</kbd>
                  )}
                </div>
                <AnimatePresence>
                  {isSearchFocused && searchQuery.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: theme === 'dark' ? 'rgba(16,16,20,0.96)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 14, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`, boxShadow: theme === 'dark' ? '0 16px 48px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)', maxHeight: 380, overflowY: 'auto', zIndex: 200 }}
                    >
                      {searchResults.length > 0 ? searchResults.map((res, i) => (
                        <div key={i} onMouseDown={() => { navigate(res.path); setSearchQuery(''); setIsSearchFocused(false); }} style={{ padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none', transition: 'background 0.12s' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{res.title}</span>
                          <span style={{ fontSize: 10, color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', padding: '2px 8px', borderRadius: 100, fontWeight: 600, letterSpacing: '0.3px' }}>{res.type}</span>
                        </div>
                      )) : (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 400 }}>No results for "{searchQuery}"</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 28, flexShrink: 0, marginLeft: 'auto', zIndex: 1 }}>
              <HeaderClock />
              <div style={{ width: 1, height: 28, background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', flexShrink: 0 }} />

              {/* Quick create */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                  onClick={() => setShowQuickMenu(p => !p)}
                  title="Quick create"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: showQuickMenu ? 'rgba(196,154,82,0.1)' : 'transparent', border: `1px solid ${showQuickMenu ? 'rgba(196,154,82,0.3)' : 'transparent'}`, color: showQuickMenu ? 'var(--accent-gold)' : 'var(--text-secondary)', transition: 'all 0.15s ease' }}
                >
                  <Plus size={18} strokeWidth={1.8} />
                </motion.button>
                <AnimatePresence>
                  {showQuickMenu && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 109 }} onClick={() => setShowQuickMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 210, background: 'var(--card-bg)', borderRadius: 14, border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 110 }}
                      >
                        {([
                          { label: 'New Project', icon: <FolderPlus size={15} />, action: onNewProject },
                          { label: 'Record Income', icon: <ReceiptText size={15} />, action: onNewInvoice },
                          { label: 'Add Client', icon: <UserPlus size={15} />, action: onNewClient },
                        ] as const).map(item => (
                          <button
                            key={item.label}
                            onClick={() => { setShowQuickMenu(false); item.action(); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.1s' }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                          >
                            <span style={{ color: 'var(--accent-gold)' }}>{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification bell */}
              <div ref={notifContainerRef} style={{ position: 'relative', zIndex: 111 }}>
                <motion.div
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                  style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: showNotifications ? 'rgba(196,154,82,0.1)' : 'transparent', border: `1px solid ${showNotifications ? 'rgba(196,154,82,0.3)' : 'transparent'}`, transition: 'all 0.15s ease', color: showNotifications ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
                  onClick={() => { setShowNotifications(p => { if (!p && unreadCount > 0) markAllRead(); return !p; }); }}
                >
                  <Bell size={18} strokeWidth={1.8} />
                  {unreadCount > 0 && <span style={{ top: 8, right: 8, width: 7, height: 7, background: 'var(--accent-red)', borderRadius: '50%', position: 'absolute', border: '2px solid var(--card-bg)' }} />}
                </motion.div>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, background: 'var(--card-bg)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', zIndex: 110, overflow: 'hidden' }}
                    >
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Notifications</span>
                          {unreadCount > 0 && <span style={{ background: 'var(--accent-red)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>{unreadCount}</span>}
                        </div>
                        {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-gold)', cursor: 'pointer' }} onClick={markAllRead}>Mark all read</span>}
                      </div>
                      <div style={{ maxHeight: 420, overflowY: 'auto' }} className="custom-scrollbar">
                        {groupedNotifications.length > 0 ? groupedNotifications.slice(0, 10).map(({ n, count }, i) => (
                          <div key={n.id} style={{ padding: '14px 20px', borderBottom: i < Math.min(groupedNotifications.length, 10) - 1 ? '1px solid var(--border-color)' : 'none', background: n.read ? 'transparent' : (theme === 'dark' ? 'rgba(196,154,82,0.06)' : 'rgba(196,154,82,0.04)'), display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0, background: n.read ? 'var(--border-color)' : 'var(--accent-gold)', boxShadow: n.read ? 'none' : '0 0 8px rgba(196,154,82,0.5)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {n.title}
                                {count > 1 && <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--accent-gold)', color: '#fff', padding: '1px 6px', borderRadius: 999 }}>× {count}</span>}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                {new Date(getTimestamp(n.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                            <Bell size={36} color="var(--text-tertiary)" strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 12, display: 'inline-block' }} />
                            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 600 }}>Your studio is quiet</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>No notifications yet</div>
                          </div>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border-color)', padding: '10px 20px' }}>
                          <Link to="/notifications" onClick={() => setShowNotifications(false)} style={{ display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent-gold)', textDecoration: 'none', opacity: 0.9 }}>
                            View all {notifications.length} notification{notifications.length !== 1 ? 's' : ''} →
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
      </motion.header>

      {/* Mobile notification sheet (fixed, renders outside header flow) */}
      <AnimatePresence>
        {isMobile && showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1401, background: 'var(--card-bg)', borderRadius: '16px 16px 0 0', maxHeight: '75vh', overflowY: 'auto', border: '1px solid var(--border-color)', borderBottom: 'none', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--border-color)' }} />
              </div>
              <div style={{ padding: '10px 16px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bell size={17} color="var(--accent-gold)" />
                  <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Notifications</span>
                  {unreadCount > 0 && <span style={{ background: 'var(--color-danger)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10 }}>{unreadCount}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: 'rgba(196,154,82,0.1)', border: 'none', color: 'var(--accent-gold)', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}>
                      Clear All
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '8px 0' }}>
                {notifications.length > 0 ? notifications.map((n, i) => (
                  <div key={n.id} style={{ padding: '14px 20px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border-color)' : 'none', background: n.read ? 'transparent' : 'rgba(196,154,82,0.04)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: n.read ? 'transparent' : 'var(--accent-gold)', boxShadow: n.read ? 'none' : '0 0 8px rgba(196,154,82,0.5)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {new Date(getTimestamp(n.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <Bell size={36} color="var(--text-tertiary)" strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 12, display: 'inline-block' }} />
                    <div style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 600 }}>Your studio is quiet</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>No notifications yet</div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
