import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose, PanelLeft, Sun, Moon, LogOut, Pencil,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  badge?: number;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  studioLogo: string;
  studioName: string;
  navSections: NavSection[];
  theme: string;
  onThemeToggle: () => void;
  userData: any;
  showProfilePopover: boolean;
  onProfilePopoverToggle: () => void;
  onProfilePopoverClose: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function AppSidebar({
  isOpen,
  onToggle,
  studioLogo,
  studioName,
  navSections,
  theme,
  onThemeToggle,
  userData,
  showProfilePopover,
  onProfilePopoverToggle,
  onProfilePopoverClose,
  onEditProfile,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: isOpen ? 300 : 80 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="sidebar backend-sidebar"
      style={{
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        whiteSpace: 'nowrap',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        overflowX: 'hidden',
      }}
    >
      {/* Logo + toggle */}
      <div className="logo-container shell-logo-container" style={{ paddingTop: 0, paddingRight: 0, paddingBottom: 14, paddingLeft: isOpen ? 2 : 0, display: 'flex', alignItems: 'center', justifyContent: isOpen ? 'space-between' : 'center', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              onClick={() => window.location.href = window.location.origin + '/'}
              style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-1)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={studioLogo || '/Logo.jpg'} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ marginLeft: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '168px', background: 'linear-gradient(90deg, var(--text-primary) 60%, var(--accent-gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {studioName || 'Tanvir Studio'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-gold)', marginTop: 2, letterSpacing: '0.1px', opacity: 0.85 }}>Where Creativity Speaks.</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-tertiary)', width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196,154,82,0.4)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; }}
        >
          {isOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        {navSections.map((section, si) => (
          <div key={si} style={{ marginBottom: 2 }}>
            {si > 0 && (
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(196,154,82,0.2) 30%, rgba(196,154,82,0.1) 70%, transparent)', margin: isOpen ? '8px 6px' : '10px 10px' }} />
            )}
            <AnimatePresence>
              {section.label && isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
                  style={{ padding: '10px 14px 5px', fontSize: 10, fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '1.1px', opacity: 0.7 }}
                >
                  {section.label}
                </motion.div>
              )}
            </AnimatePresence>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13,
                      padding: isOpen ? '11px 14px' : '12px',
                      justifyContent: isOpen ? 'flex-start' : 'center',
                      fontSize: 15, fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      background: 'transparent', transition: 'all 0.12s ease',
                      textDecoration: 'none', position: 'relative', borderRadius: 10,
                    }}
                  >
                    {isActive && (
                      <motion.div layoutId="active-pill" style={{ position: 'absolute', inset: 0, background: 'rgba(196, 154, 82, 0.1)', borderRadius: 10, zIndex: -1 }} />
                    )}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22 }}>
                      {React.cloneElement(item.icon as React.ReactElement<any>, {
                        size: 20,
                        strokeWidth: isActive ? 2.2 : 1.8,
                        color: isActive ? 'var(--accent-gold)' : 'currentColor',
                      })}
                    </div>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                          style={{ overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}
                        >
                          {item.label}
                          {(item.badge ?? 0) > 0 && (
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, background: 'var(--accent-gold)', color: 'var(--card-bg)', padding: '1px 6px', borderRadius: 999, lineHeight: 1.6, flexShrink: 0 }}>
                              {item.badge}
                            </span>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!isOpen && (item.badge ?? 0) > 0 && (
                      <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-gold)', border: '1.5px solid var(--sidebar-bg)' }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: theme toggle + profile */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={onThemeToggle}
          className="nav-item"
          style={{
            width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '11px', padding: '10px 14px',
            justifyContent: isOpen ? 'flex-start' : 'center',
            fontSize: '15px', color: 'var(--text-tertiary)', transition: 'all 0.12s', fontFamily: 'inherit',
          }}
        >
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(196,154,82,0.15)', paddingTop: '12px' }}>
          <motion.div style={{ background: 'transparent', borderRadius: '10px', padding: isOpen ? '6px 4px' : '4px 0px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden' }}>

            {/* Profile popover */}
            <AnimatePresence>
              {showProfilePopover && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onProfilePopoverClose} />
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    style={{ position: 'fixed', bottom: '88px', left: '12px', width: '248px', background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', zIndex: 9999 }}
                  >
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {userData?.photoURL ? (
                          <img src={userData.photoURL} alt="avatar" style={{ width: 38, height: 38, borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px' }}>
                            {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'TS'}
                          </div>
                        )}
                        <div style={{ width: 9, height: 9, background: 'var(--color-success)', borderRadius: '50%', position: 'absolute', bottom: -1, right: -1, border: '2px solid var(--card-bg)' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userData?.name || 'Studio User'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userData?.email}</div>
                      </div>
                    </div>
                    <div style={{ padding: '4px' }}>
                      <button
                        onClick={() => { onProfilePopoverClose(); onEditProfile(); }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'background 0.12s', textAlign: 'left' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Pencil size={14} color="var(--text-secondary)" />
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Edit Profile</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Avatar row */}
            <motion.div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={onProfilePopoverToggle}
              whileHover={{ opacity: 0.85 }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ position: 'relative', flexShrink: 0, paddingLeft: isOpen ? '0px' : '7px', transition: 'padding 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {userData?.photoURL ? (
                  <img src={userData.photoURL} alt="avatar" style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '13px' }}>
                    {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'TS'}
                  </div>
                )}
                <div style={{ width: 9, height: 9, background: 'var(--color-success)', borderRadius: '50%', position: 'absolute', bottom: 0, right: isOpen ? 0 : 6, border: '2px solid var(--card-bg)', transition: 'right 0.3s' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0, opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {userData?.name || 'Studio User'}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', fontWeight: '700', padding: '2px 7px', color: 'var(--accent-gold)', background: 'rgba(196,154,82,0.1)', borderRadius: 999, letterSpacing: '0.03em', textTransform: 'capitalize' }}>
                    {(userData?.role || 'user').replace('_', ' ')}
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,59,48,0.08)' }}
                onClick={(e) => { e.stopPropagation(); onProfilePopoverClose(); onLogout(); }}
                title="Sign out"
                style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', transition: 'all 0.2s', opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
              >
                <LogOut size={13} />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
}
