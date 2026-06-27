/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { DataProvider } from './contexts/DataContext'
import { AudioPlayerProvider } from './contexts/AudioPlayerContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'

class RootErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[RootBoundary]', error, info.componentStack); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui', color: 'var(--text-primary)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 100, background: 'var(--accent-gold-light)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
      </div>
    );
    return this.props.children;
  }
}

// Silence console logs in production; sanitize errors to strip sensitive data
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  const _origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    const sanitized = args.map(a => {
      if (typeof a === 'string') {
        return a
          .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
          .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
          .replace(/\/users\/[^/\s]+/g, '/users/[uid]')
          .replace(/\/tasks\/[^/\s]+/g, '/tasks/[id]')
          .replace(/\/clients\/[^/\s]+/g, '/clients/[id]');
      }
      return a;
    });
    _origError(...sanitized);
  };
}

// Register PWA service worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[SW]', err));
  });
}

// Apply OS dark mode preference on first visit (if no stored preference)
if (!localStorage.getItem('hs-theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    localStorage.setItem('hs-theme', 'dark');
    document.documentElement.classList.add('dark');
  }
}

// Prevent mouse wheel from changing number input values
document.addEventListener('wheel', (e) => {
  const el = document.activeElement as HTMLInputElement;
  if (el && el.tagName === 'INPUT' && el.type === 'number') {
    el.blur();
  }
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <HelmetProvider>
        <AuthProvider>
          <SettingsProvider>
            <DataProvider>
              <AudioPlayerProvider>
                <LanguageProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </LanguageProvider>
              </AudioPlayerProvider>
            </DataProvider>
          </SettingsProvider>
        </AuthProvider>
      </HelmetProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
)
