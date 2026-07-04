import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import {
  LayoutDashboard, Briefcase, Users, Wallet, Settings,
  StickyNote, Calendar as CalendarIcon, BarChart3, CheckSquare,
  Music2, Monitor, PackageOpen, Tag,
} from 'lucide-react';
import './index.css';

import { useAuth } from './contexts/AuthContext';
import { useSettings } from './contexts/SettingsContext';
import { useData } from './contexts/DataContext';
import { compressImage, uploadAvatarToStorage } from './utils/imageUtils';
import { updateDoc, doc } from 'firebase/firestore';
import { AutoLedgerCloser } from './components/AutoLedgerCloser';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingChat } from './components/FloatingChat';
import { WhatsAppButton } from './components/WhatsAppButton';
import { CookieConsent } from './components/CookieConsent';
import { GoogleOneTap } from './components/GoogleOneTap';
import { ScrollToTop } from './components/ScrollToTop';
import { RouteProgressBar } from './components/RouteProgressBar';
import { ShortcutHelp } from './components/ShortcutHelp';
import { GlobalSearch } from './components/GlobalSearch';
import { Toast } from './components/Toast';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
import { useFCMForeground } from './hooks/useFCMForeground';
import { PublicLayout } from './layouts/PublicLayout';
import { PageSkeleton } from './components/SkeletonLoader';
import { LogoutConfirmDialog } from './components/layout/LogoutConfirmDialog';
import { ProfileEditModal } from './components/layout/ProfileEditModal';
import { KeyboardShortcutsPanel } from './components/layout/KeyboardShortcutsPanel';
import { PwaInstallBanner } from './components/layout/PwaInstallBanner';
import { AppSidebar } from './components/layout/AppSidebar';
import { AdminHeader } from './components/layout/AdminHeader';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { MobileMenuSheet } from './components/layout/MobileMenuSheet';
import { QuickCreateModals } from './components/layout/QuickCreateModals';
import type { Task, Booking } from './types';

// ── Lazy page imports ────────────────────────────────────────────────────────
const Dashboard        = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ClientPortal     = React.lazy(() => import('./pages/ClientPortal').then(m => ({ default: m.ClientPortal })));
const WorkProcess      = React.lazy(() => import('./pages/WorkProcess').then(m => ({ default: m.WorkProcess })));
const ClientManager    = React.lazy(() => import('./pages/ClientManager').then(m => ({ default: m.ClientManager })));
const Notes            = React.lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const Calendar         = React.lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const SettingsPage     = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login            = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Terms            = React.lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy          = React.lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const WebsiteCMS       = React.lazy(() => import('./pages/WebsiteCMS').then(m => ({ default: m.WebsiteCMS })));
const ServicesManager  = React.lazy(() => import('./pages/ServicesManager').then(m => ({ default: m.ServicesManager })));
const Home             = React.lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Services         = React.lazy(() => import('./pages/Services').then(m => ({ default: m.Services })));
const ServiceDetail    = React.lazy(() => import('./pages/ServiceDetail').then(m => ({ default: m.ServiceDetail })));
const About            = React.lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Portfolio        = React.lazy(() => import('./pages/Portfolio').then(m => ({ default: m.Portfolio })));
const Blog             = React.lazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const BlogPost         = React.lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPost })));
const MonthlyFinance   = React.lazy(() => import('./pages/MonthlyFinance').then(m => ({ default: m.MonthlyFinance })));
const Reminders        = React.lazy(() => import('./pages/Reminders').then(m => ({ default: m.Reminders })));
const NotificationsPage = React.lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const OrderFlow        = React.lazy(() => import('./pages/OrderFlow').then(m => ({ default: m.OrderFlow })));
const NewOrders        = React.lazy(() => import('./pages/NewOrders').then(m => ({ default: m.NewOrders })));
const Analytics        = React.lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const BookingsAdmin    = React.lazy(() => import('./pages/BookingsAdmin').then(m => ({ default: m.BookingsAdmin })));
const CouponManager    = React.lazy(() => import('./pages/CouponManager').then(m => ({ default: m.CouponManager })));
const NotFound         = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Contact          = React.lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Booking          = React.lazy(() => import('./pages/Booking').then(m => ({ default: m.Booking })));
const Calculator       = React.lazy(() => import('./pages/Calculator').then(m => ({ default: m.Calculator })));
const Offline          = React.lazy(() => import('./pages/Offline').then(m => ({ default: m.Offline })));

// ── Constants ────────────────────────────────────────────────────────────────
const DASHBOARD_PATHS = [
  '/dashboard', '/work', '/finance', '/clients', '/calendar',
  '/reminders', '/notes', '/settings', '/notifications', '/cms',
  '/new-orders', '/analytics', '/bookings-admin', '/coupons', '/services-manager',
];

const TAB_SHORT_LABELS: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/work':             'Production Suite',
  '/clients':          'Client Manager',
  '/finance':          'Finance & Ledger',
  '/calendar':         'Schedule',
  '/notes':            'Notes',
  '/reminders':        'Task Manager',
  '/settings':         'Settings',
  '/new-orders':       'New Orders',
  '/analytics':        'Analytics',
  '/bookings-admin':   'Bookings',
  '/coupons':          'Coupons',
  '/services-manager': 'Services',
  '/cms':              'Website CMS',
  '/notifications':    'Notifications',
};

export default function App() {
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, user, loading } = useAuth();
  const { settings } = useSettings();
  const { tasks, bookings } = useData();

  const { studioName } = settings;
  const theme = userData?.theme || localStorage.getItem('hs-theme') || 'light';

  // Layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // Overlays
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

  // Profile
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', bio: '' });
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Quick-create
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Misc
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [postLoginPkg, setPostLoginPkg] = useState<unknown>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const { notification: fcmNotif, dismiss: dismissFcm } = useFCMForeground();
  const gKeyRef = useRef(false);
  const gKeyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingOrdersCount = tasks.filter((t: Task) => t.publicOrder && t.status === 'pending').length;
  const pendingBookingsCount = (bookings as Booking[]).filter(b => b.status === 'pending').length;

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setShowMobileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const label = TAB_SHORT_LABELS[location.pathname];
    const name = studioName || 'Tanvir Studio';
    document.title = label ? `${label} — ${name}` : `${name} — Where Creativity Speaks`;
  }, [location.pathname, studioName]);

  useEffect(() => {
    if (user && !loading) {
      const raw = sessionStorage.getItem('pendingPackage');
      if (raw) {
        sessionStorage.removeItem('pendingPackage');
        try { setTimeout(() => setPostLoginPkg(JSON.parse(raw)), 400); } catch { /* ignore */ }
      }
    }
  }, [user, loading]);

  useEffect(() => {
    const goOffline = () => { setIsOffline(true); setShowOfflineToast(true); };
    const goOnline  = () => { setIsOffline(false); setShowOfflineToast(true); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      if (localStorage.getItem('pwaPromptDismissed') !== 'true') setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', () => { setDeferredInstallPrompt(null); setShowInstallBanner(false); });
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); navigate('/booking'); return; }
      if (inInput) return;
      if (e.key === '?') { e.preventDefault(); setShowShortcutsPanel(p => !p); return; }
      if (e.key === 'Escape') { setShowShortcutsPanel(false); return; }
      if (e.key === 'g' || e.key === 'G') {
        gKeyRef.current = true;
        if (gKeyTimer.current) clearTimeout(gKeyTimer.current);
        gKeyTimer.current = setTimeout(() => { gKeyRef.current = false; }, 1500);
        return;
      }
      if (gKeyRef.current) {
        gKeyRef.current = false;
        if (gKeyTimer.current) clearTimeout(gKeyTimer.current);
        const NAV: Record<string, string> = { h: '/dashboard', w: '/work', c: '/clients', f: '/finance', n: '/notes', r: '/reminders', s: '/settings' };
        const dest = NAV[e.key.toLowerCase()];
        if (dest) { e.preventDefault(); navigate(dest); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); if (gKeyTimer.current) clearTimeout(gKeyTimer.current); };
  }, [navigate]);

  // Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.body.style.backgroundColor = 'var(--bg-color)';
  }, [theme]);

  // Hash-scroll: retry until lazy-loaded element appears
  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' }); return; }
      if (attempts++ < 15) timer = setTimeout(scroll, 100);
    };
    timer = setTimeout(scroll, 80);
    return () => clearTimeout(timer);
  }, [location.pathname, location.hash]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleThemeToggle = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    if (userData && user) await updateDoc(doc(db, 'users', userData.uid), { theme: newTheme });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutConfirm(false);
      window.location.href = window.location.origin + '/';
    } catch { /* ignore */ }
  };

  const openProfileModal = () => {
    setProfileForm({
      name: userData?.name || '',
      phone: (userData as Record<string, string>)?.phone || '',
      bio: (userData as Record<string, string>)?.bio || '',
    });
    setProfileAvatar((userData as Record<string, string>)?.photoURL || null);
    setProfileAvatarFile(null);
    setShowProfileModal(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 400, 0.8);
      setProfileAvatar(compressed.dataUrl);
      setProfileAvatarFile(compressed.file);
    } catch {
      setProfileAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfileAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    if (!user || !userData) return;
    setProfileSaving(true);
    try {
      let photoURL: string | null = (userData as Record<string, string>)?.photoURL || null;
      if (profileAvatarFile) photoURL = await uploadAvatarToStorage(userData.uid, profileAvatarFile);
      await updateDoc(doc(db, 'users', userData.uid), {
        name: profileForm.name.trim() || userData.name,
        phone: profileForm.phone.trim(),
        bio: profileForm.bio.trim(),
        ...(photoURL ? { photoURL } : {}),
      });
      if (user.displayName !== profileForm.name || (photoURL && user.photoURL !== photoURL)) {
        await updateProfile(user, { displayName: profileForm.name.trim() || user.displayName || '', ...(photoURL ? { photoURL } : {}) });
      }
      setProfileAvatarFile(null);
      setShowProfileModal(false);
    } catch { /* ignore */ } finally { setProfileSaving(false); }
  };

  // ── Nav sections (role-based) ───────────────────────────────────────────────

  const navSections = userData?.role === 'client' ? [
    { items: [{ path: '/dashboard', label: 'Client Portal', icon: <LayoutDashboard size={16} /> }] },
  ] : [
    { items: [
      { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
      { path: '/work',      label: 'Work',       icon: <Music2 size={16} /> },
    ]},
    ...(['admin', 'composer'].includes(userData?.role || '') ? [{
      label: 'Manage',
      items: [
        { path: '/clients',   label: 'Clients',  icon: <Users size={16} /> },
        { path: '/calendar',  label: 'Schedule', icon: <CalendarIcon size={16} /> },
        { path: '/reminders', label: 'Tasks',    icon: <CheckSquare size={16} /> },
        { path: '/notes',     label: 'Notes',    icon: <StickyNote size={16} /> },
      ],
    }] : []),
    ...(userData?.role === 'admin' ? [{
      label: 'Business',
      items: [
        { path: '/finance',          label: 'Finance',   icon: <Wallet size={16} /> },
        { path: '/new-orders',       label: 'Orders',    icon: <PackageOpen size={16} />, badge: pendingOrdersCount },
        { path: '/analytics',        label: 'Analytics', icon: <BarChart3 size={16} /> },
        { path: '/bookings-admin',   label: 'Bookings',  icon: <CalendarIcon size={16} />, badge: pendingBookingsCount },
        { path: '/coupons',          label: 'Coupons',   icon: <Tag size={16} /> },
        { path: '/services-manager', label: 'Services',  icon: <Briefcase size={16} /> },
        { path: '/cms',              label: 'Website',   icon: <Monitor size={16} /> },
      ],
    }] : []),
    { items: [{ path: '/settings', label: 'Settings', icon: <Settings size={16} /> }] },
  ];

  const navItems = navSections.flatMap(s => s.items);

  // ── Routing logic ──────────────────────────────────────────────────────────

  const isPublicRoute = !DASHBOARD_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (isPublicRoute) {
    if (!loading && user && location.pathname === '/login') return <Navigate to="/dashboard" replace />;
    return (
      <PublicLayout>
        <ScrollToTop />
        <React.Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 14, scale: 0.995 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }} exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }} style={{ touchAction: 'pan-y' }}>
              <Routes location={location}>
                <Route path="/login"                element={<Login onLogin={() => navigate('/dashboard')} />} />
                <Route path="/terms"                element={<ErrorBoundary><Terms /></ErrorBoundary>} />
                <Route path="/privacy"              element={<ErrorBoundary><Privacy /></ErrorBoundary>} />
                <Route path="/services"             element={<ErrorBoundary><Services /></ErrorBoundary>} />
                <Route path="/services/:cat"        element={<ErrorBoundary><Services /></ErrorBoundary>} />
                <Route path="/services/:cat/:slug"  element={<ErrorBoundary><ServiceDetail /></ErrorBoundary>} />
                <Route path="/about"                element={<ErrorBoundary><About /></ErrorBoundary>} />
                <Route path="/portfolio"            element={<ErrorBoundary><Portfolio /></ErrorBoundary>} />
                <Route path="/blog"                 element={<ErrorBoundary><Blog /></ErrorBoundary>} />
                <Route path="/blog/:id"             element={<ErrorBoundary><BlogPost /></ErrorBoundary>} />
                <Route path="/contact"              element={<ErrorBoundary><Contact /></ErrorBoundary>} />
                <Route path="/booking"              element={<ErrorBoundary><Booking /></ErrorBoundary>} />
                <Route path="/calculator"           element={<ErrorBoundary><Calculator /></ErrorBoundary>} />
                <Route path="/offline"              element={<ErrorBoundary><Offline /></ErrorBoundary>} />
                <Route path="/"                     element={<ErrorBoundary><Home /></ErrorBoundary>} />
                <Route path="*"                     element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </React.Suspense>
        <CookieConsent />
        <GoogleOneTap />
        <WhatsAppButton />
        <FloatingChat />
      </PublicLayout>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
          Loading Workspace…
        </motion.div>
      </div>
    );
  }

  if (!user && !userData) return <Navigate to="/login" replace />;

  return (
    <div className={`app-container backend-shell ${theme === 'dark' ? 'dark' : ''} ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <RouteProgressBar />
      <GlobalSearch />
      <ShortcutHelp />
      <AutoLedgerCloser />

      {showOfflineToast && (
        <Toast
          type={isOffline ? 'warning' : 'success'}
          message={isOffline ? 'You are offline — changes will sync when reconnected.' : 'Back online!'}
          onClose={() => setShowOfflineToast(false)}
        />
      )}
      {fcmNotif && (
        <Toast
          type="info"
          message={fcmNotif.body ? `${fcmNotif.title} — ${fcmNotif.body}` : fcmNotif.title}
          onClose={dismissFcm}
        />
      )}

      <div className="dot-grid" />
      <div className="ambient-glow" />

      {/* Sidebar (desktop only) */}
      {!isMobile && (
        <AppSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(p => !p)}
          studioLogo={settings.studioLogo}
          studioName={settings.studioName}
          navSections={navSections}
          theme={theme}
          onThemeToggle={handleThemeToggle}
          userData={userData}
          showProfilePopover={showProfilePopover}
          onProfilePopoverToggle={() => setShowProfilePopover(p => !p)}
          onProfilePopoverClose={() => setShowProfilePopover(false)}
          onEditProfile={openProfileModal}
          onLogout={() => setShowLogoutConfirm(true)}
        />
      )}

      {/* Header */}
      <AdminHeader
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
        theme={theme}
        searchRef={searchRef}
        onNewProject={() => setShowNewProjectModal(true)}
        onNewInvoice={() => setShowInvoiceModal(true)}
        onNewClient={() => setShowAddClientModal(true)}
      />

      {/* Main content */}
      <motion.main
        className="main-content backend-main-content"
        animate={{ marginLeft: isMobile ? 0 : (isSidebarOpen ? 300 : 80), width: isMobile ? '100%' : `calc(100% - ${isSidebarOpen ? 300 : 80}px)` }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        style={{ touchAction: 'pan-y', overflowY: 'visible' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: isMobile ? 6 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? -4 : 0 }}
            transition={{ duration: isMobile ? 0.1 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ minHeight: '100%', touchAction: 'pan-y' }}
          >
            <ErrorBoundary>
              <React.Suspense fallback={<PageSkeleton />}>
                <div className="admin-page-wrapper" style={{ width: '100%', paddingTop: isMobile ? 0 : 4, paddingBottom: isMobile ? 100 : 48, boxSizing: 'border-box' }}>
                  <Routes location={location}>
                    <Route path="/dashboard" element={<ErrorBoundary>{userData?.role === 'client' ? <ClientPortal /> : <Dashboard />}</ErrorBoundary>} />
                    <Route path="/work" element={<ErrorBoundary><WorkProcess /></ErrorBoundary>} />
                    {userData?.role === 'admin' && (
                      <Route path="/finance" element={<ErrorBoundary><MonthlyFinance /></ErrorBoundary>} />
                    )}
                    {userData?.role !== 'client' && (
                      <>
                        <Route path="/clients"   element={<ErrorBoundary><ClientManager /></ErrorBoundary>} />
                        <Route path="/calendar"  element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
                        <Route path="/reminders" element={<ErrorBoundary><Reminders /></ErrorBoundary>} />
                        <Route path="/notes"     element={<ErrorBoundary><Notes /></ErrorBoundary>} />
                      </>
                    )}
                    <Route path="/settings"         element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                    <Route path="/notifications"    element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
                    <Route path="/terms"            element={<ErrorBoundary><Terms /></ErrorBoundary>} />
                    <Route path="/privacy"          element={<ErrorBoundary><Privacy /></ErrorBoundary>} />
                    <Route path="/services-manager" element={<ErrorBoundary><ServicesManager /></ErrorBoundary>} />
                    <Route path="/cms"              element={<ErrorBoundary><WebsiteCMS /></ErrorBoundary>} />
                    {userData?.role === 'admin' && (
                      <>
                        <Route path="/new-orders"     element={<ErrorBoundary><NewOrders /></ErrorBoundary>} />
                        <Route path="/analytics"      element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
                        <Route path="/bookings-admin" element={<ErrorBoundary><BookingsAdmin /></ErrorBoundary>} />
                        <Route path="/coupons"        element={<ErrorBoundary><CouponManager /></ErrorBoundary>} />
                      </>
                    )}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </React.Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </motion.main>

      {/* Mobile tab bar */}
      {isMobile && (
        <MobileTabBar
          navItems={navItems}
          tabShortLabels={TAB_SHORT_LABELS}
          userRole={userData?.role}
          onMoreClick={() => setShowMobileMenu(true)}
        />
      )}

      {/* Mobile more sheet */}
      <MobileMenuSheet
        show={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        theme={theme}
        userData={userData}
        onThemeToggle={handleThemeToggle}
        onEditProfile={() => { setShowMobileMenu(false); openProfileModal(); }}
        onLogout={() => { setShowMobileMenu(false); setShowLogoutConfirm(true); }}
      />

      {/* Dialogs & panels */}
      <LogoutConfirmDialog show={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} />

      <ProfileEditModal
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        profileAvatar={profileAvatar}
        userData={userData}
        avatarInputRef={avatarInputRef}
        handleAvatarChange={handleAvatarChange}
        handleProfileSave={handleProfileSave}
        profileSaving={profileSaving}
      />

      <KeyboardShortcutsPanel show={showShortcutsPanel} onClose={() => setShowShortcutsPanel(false)} />

      <PwaInstallBanner
        show={showInstallBanner}
        onClose={() => setShowInstallBanner(false)}
        deferredInstallPrompt={deferredInstallPrompt}
        setDeferredInstallPrompt={setDeferredInstallPrompt}
      />

      <GlobalAudioPlayer />

      {/* Post-login package flow */}
      {postLoginPkg && (
        <React.Suspense fallback={null}>
          <OrderFlow pkg={postLoginPkg} postLogin onClose={() => setPostLoginPkg(null)} />
        </React.Suspense>
      )}

      {/* Quick-create modals */}
      <QuickCreateModals
        showNewProject={showNewProjectModal}
        showInvoice={showInvoiceModal}
        showAddClient={showAddClientModal}
        onCloseNewProject={() => setShowNewProjectModal(false)}
        onCloseInvoice={() => setShowInvoiceModal(false)}
        onCloseAddClient={() => setShowAddClientModal(false)}
      />
    </div>
  );
}
