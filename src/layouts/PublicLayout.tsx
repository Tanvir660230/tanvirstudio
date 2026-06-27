import React from 'react';

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




  // theme logic might be handled globally via document classes, but if it needs to be injected into PublicLayout div:

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

