import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

import { useSettings } from '../contexts/SettingsContext';



import { RouteProgressBar } from '../components/RouteProgressBar';

import { ErrorBoundary } from '../components/ErrorBoundary';

import { PublicNav } from '../components/PublicNav';

import { PublicFooter } from '../components/PublicFooter';

import { GoogleOneTap } from '../components/GoogleOneTap';

import { FloatingChat } from '../components/FloatingChat';

import { WhatsAppButton } from '../components/WhatsAppButton';

import { ScrollToTop } from '../components/ScrollToTop';

import { CookieConsent } from '../components/CookieConsent';



export function PublicLayout({ children }: { children: React.ReactNode }) {

  const { user, userData, loading } = useAuth();

  const { settings } = useSettings();

  const location = useLocation();

  const isLoginPage = location.pathname === '/login';

  // Sync <html>.dark with the stored/OS preference — App.tsx does this for admin
  // routes on mount, but public routes never applied it, so they always rendered
  // in the light-mode CSS variables regardless of the user's saved theme.
  useEffect(() => {
    const stored = localStorage.getItem('hs-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const theme = settings?.theme || 'dark';



  return (

    <div className={`app-container public-layout ${theme === 'dark' ? 'dark' : ''}`}

      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>

      <div className="grain-overlay" />

      <RouteProgressBar />

      <ErrorBoundary>

        {!isLoginPage && <PublicNav />}

        <main id="main-content" style={{ flex: 1 }}>

          {children}

        </main>

        {!isLoginPage && <PublicFooter />}

        {!isLoginPage && !user && !loading && <GoogleOneTap />}

        {!user && <FloatingChat />}

        {!user && <WhatsAppButton />}

        <ScrollToTop />

        <CookieConsent />

      </ErrorBoundary>

    </div>

  );

}

