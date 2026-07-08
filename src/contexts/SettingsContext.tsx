/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { populateEmailJSSettings } from '../utils/emailApi';

interface GlobalSettings {
  currency: string;
  fontFamily?: string;
  studioName: string;
  studioLogo: string;
  studioAddress: string;
  studioEmail: string;
  studioPhone: string;
  paymentQrCode: string;
  defaultComposerComm: number;
  defaultHummingComm: number;
  monthlyGoal: number;
  // Invoicing
  invoicePrefix: string;
  invoiceNotes: string;
  invoiceTaxRate: number;
  workHoursStart: number;
  workHoursEnd: number;
  sessionDurationDefault: number;
  autoCompleteDays: number;
  // Notifications
  notifyOverdue: boolean;
  notifyUpcoming: boolean;
  notifyPayment: boolean;
  // Social
  socialWhatsapp: string;
  socialFacebook: string;
  socialYoutube: string;
  socialInstagram: string;
  // EmailJS (stored in Firestore via Settings page)
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsOrderTemplateId?: string;
  emailjsPublicKey?: string;
  // Homepage Stats
  statsProjects: number;
  statsArtists: number;
  statsViews: string;
  statsTrustLabel: string;
  // Hero
  heroBgImage: string;
  // UI
  theme?: string;
  // Expense category budget limits (monthly, per-category)
  categoryLimits?: Record<string, number>;
}

interface SettingsContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: GlobalSettings = {
  currency: '৳',
  studioName: 'Tanvir Studio',
  studioLogo: '/Logo.jpg',
  studioAddress: '',
  studioEmail: 'tanvirstudiots@gmail.com',
  studioPhone: '',
  paymentQrCode: '',
  defaultComposerComm: 15,
  defaultHummingComm: 15,
  monthlyGoal: 0,
  invoicePrefix: 'INV',
  invoiceNotes: '',
  invoiceTaxRate: 0,
  workHoursStart: 9,
  workHoursEnd: 22,
  sessionDurationDefault: 60,
  autoCompleteDays: 7,
  notifyOverdue: true,
  notifyUpcoming: true,
  notifyPayment: true,
  socialWhatsapp: '',
  socialFacebook: '',
  socialYoutube: '',
  socialInstagram: '',
  statsProjects: 999,
  statsArtists: 99,
  statsViews: '1B+',
  statsTrustLabel: '10 years of trust.',
  heroBgImage: '/hero-bg.jpg',
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  loading: true,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');

    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (!docSnap.exists()) {
        // First run — seed defaults; snapshot will fire again with the created doc
        setDoc(settingsRef, defaultSettings).catch(err =>
          console.error("Failed to initialize settings:", err)
        );
      } else {
        const data = docSnap.data() as Partial<GlobalSettings>;
        if (data.studioLogo === undefined) delete data.studioLogo;
        if (data.heroBgImage === undefined) delete data.heroBgImage;
        if (data.studioEmail === undefined) delete data.studioEmail;
        const merged = { ...defaultSettings, ...data } as GlobalSettings;
        setSettings(merged);
        if (data.emailjsServiceId || data.emailjsTemplateId) {
          populateEmailJSSettings(
            data.emailjsServiceId || '',
            data.emailjsTemplateId || '',
            data.emailjsPublicKey || '',
            data.emailjsOrderTemplateId || '',
          );
        }
      }
      setLoading(false);
    }, () => {
      // Permission denied (unauthenticated on public page) — use defaults silently
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Dynamic Favicon + Title from Firebase settings ──────────────────
  useEffect(() => {
    // Update browser tab title
    const name = settings.studioName || 'Tanvir Studio';
    document.title = `${name} — Where Creativity Speaks`;

    // Update favicon dynamically using the uploaded logo
    const logoUrl = settings.studioLogo;
    if (!logoUrl) return;

    const setFavicon = (url: string) => {
      // Remove existing favicon links
      const existing = document.querySelectorAll('link[rel*="icon"], link[rel="apple-touch-icon"]');
      existing.forEach(el => el.remove());

      const makeLink = (rel: string, type?: string, sizes?: string) => {
        const link = document.createElement('link');
        link.rel = rel;
        if (type) link.type = type;
        if (sizes) link.setAttribute('sizes', sizes);
        link.href = url;
        document.head.appendChild(link);
      };

      makeLink('icon', 'image/png', '32x32');
      makeLink('icon', 'image/png', '192x192');
      makeLink('shortcut icon');
      makeLink('apple-touch-icon', undefined, '180x180');
    };

    // Convert to canvas to create a properly sized favicon
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 192;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 192, 192);
        const dataUrl = canvas.toDataURL('image/png');
        setFavicon(dataUrl);
      } else {
        setFavicon(logoUrl); // Fallback: use raw URL
      }
    };
    img.onerror = () => setFavicon(logoUrl); // Fallback on CORS error
    img.src = logoUrl;

  }, [settings.studioLogo, settings.studioName]);


  const updateSettings = async (newSettings: Partial<GlobalSettings>) => {
    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, newSettings, { merge: true });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
