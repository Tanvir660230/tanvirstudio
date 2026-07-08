/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const HIDDEN_BTN_CONTAINER_ID = 'gis-hidden-signin-button';

// Module-level flag — reset via resetGoogleOneTap() after logout
let _initialized = false;

// Google's own rendered button, kept off-screen. Clicking it (via
// triggerGoogleSignIn) opens the real account-chooser popup driven entirely
// by Google Identity Services — no Firebase signInWithRedirect/signInWithPopup
// involved, so there's no authDomain storage hand-off to break on a
// third-party-hosted (non-Firebase-Hosting) domain like Netlify.
function getOrCreateHiddenContainer(): HTMLElement {
  let el = document.getElementById(HIDDEN_BTN_CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = HIDDEN_BTN_CONTAINER_ID;
    Object.assign(el.style, {
      position: 'fixed', top: '-9999px', left: '-9999px', opacity: '0', pointerEvents: 'none',
    });
    document.body.appendChild(el);
  }
  return el;
}

function loadGsiScript(onLoad: () => void) {
  const existing = document.querySelector(
    'script[src*="accounts.google.com/gsi"]'
  ) as HTMLScriptElement | null;
  if (existing) {
    if ((window as any).google?.accounts?.id) {
      onLoad();
    } else {
      existing.addEventListener('load', onLoad, { once: true });
    }
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  s.onload = onLoad;
  document.head.appendChild(s);
}

export function GoogleOneTap() {
  const { user, userData } = useAuth();

  // Cancel prompt as soon as auth resolves (user was already logged in)
  useEffect(() => {
    if (user || userData) {
      try { (window as any).google?.accounts?.id?.cancel(); } catch { /* noop */ }
    }
  }, [user, userData]);

  useEffect(() => {
    if (_initialized || user || userData) return;

    const init = () => {
      const g = (window as any).google?.accounts?.id;
      if (!g || !GOOGLE_CLIENT_ID) return;

      _initialized = true;
      g.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          try {
            const cred = GoogleAuthProvider.credential(resp.credential);
            // Don't navigate here — App.tsx's own redirect fires once
            // AuthContext's onAuthStateChanged has actually settled, avoiding
            // a race where we leave /login before auth state catches up.
            await signInWithCredential(auth, cred);
          } catch (err) {
            console.warn('[GoogleOneTap] credential sign-in failed:', err);
          }
        },
        auto_select: true,           // auto-show if a Gmail is already signed in
        cancel_on_tap_outside: true,
        context: 'signin',
        itp_support: true,
        use_fedcm_for_prompt: true,
      });

      const container = getOrCreateHiddenContainer();
      if (!container.childElementCount) {
        g.renderButton(container, { type: 'standard', size: 'large' });
      }

      g.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.info('[GoogleOneTap] not displayed:', notification.getNotDisplayedReason());
        }
        if (notification.isDismissedMoment()) {
          console.info('[GoogleOneTap] dismissed:', notification.getDismissedReason());
        }
      });
    };

    loadGsiScript(init);

    // No cleanup — intentionally persistent across navigations
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Call this right after logout so the next visit shows the prompt again */
export function resetGoogleOneTap() {
  _initialized = false;
  try { (window as any).google?.accounts?.id?.cancel(); } catch { /* noop */ }
}

/**
 * Programmatically opens Google's real account-chooser popup, for use by a
 * custom-styled "Continue with Google" button. Returns false if GIS hasn't
 * finished loading/initializing yet (e.g. clicked within the first instant
 * of the page mounting) so the caller can show a "try again" message.
 * Sign-in itself completes asynchronously via the callback passed to
 * google.accounts.id.initialize() above (signInWithCredential).
 */
export function triggerGoogleSignIn(): boolean {
  const btn = document.querySelector(`#${HIDDEN_BTN_CONTAINER_ID} div[role="button"]`) as HTMLElement | null;
  if (!btn) return false;
  btn.click();
  return true;
}
