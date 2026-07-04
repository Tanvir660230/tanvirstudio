# Tanvir Studio

Professional audio & video production studio website — built with React 18, TypeScript, Vite, and Firebase.

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite
- **Styling** — Inline styles + scoped `<style>` blocks (no CSS framework)
- **Animation** — Framer Motion (page transitions, micro-interactions)
- **Backend / DB** — Firebase Firestore (real-time listeners via `onSnapshot`)
- **Auth** — Firebase Authentication
- **Routing** — React Router v6
- **Icons** — Lucide React

## Features

- Public marketing site (Home, Services, Portfolio, About, Contact, Booking, Blog, FAQ, Case Studies)
- Protected studio dashboard (Work, Finance, Clients, Calendar, Notes, Reminders, CMS, Settings)
- Dark / light theme with system sync
- Fully responsive — mobile bottom nav, safe-area insets, iOS-safe inputs
- Keyboard shortcuts (`G`, `W`, `F`, `N`, `C`, `Ctrl+K`, `Ctrl+B`, `?`)
- SEO — per-page `<title>`, meta description, JSON-LD structured data
- Service Worker — offline fallback, network-first navigation, cache-first assets
- Form spam protection — honeypot fields, rate limiting
- Draft auto-save — contact and booking forms persist to `localStorage`
- Exit intent — desktop mouseleave / mobile 30 s time trigger

## Getting Started

```bash
npm install
npm run dev
```

### Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Copy `.env.example` to `.env` and fill in your Firebase config, BulkSMS, EmailJS, Google OAuth, and VAPID keys (see below)
3. Enable **Firestore** and **Authentication** (Email/Password)
4. Paste Firestore rules from `firestore.rules` into Firebase Console → Firestore → Rules → Publish
5. Paste Storage rules from `storage.rules` into Firebase Console → Storage → Rules → Publish

> **Note:** Firebase CLI is not authenticated on this machine. Always deploy rules via the Firebase Console, not `firebase deploy`.

## Project Structure

```
src/
├── components/       # Shared UI (PublicNav, PublicFooter, SEO, ScrollToTop, ExitIntent …)
├── contexts/         # AuthContext, SettingsContext, DataContext
├── hooks/            # useTheme, useFirestore
├── lib/              # firebase.ts
├── pages/            # One file per route
├── utils/            # emailApi, helpers
└── main.tsx
public/
└── sw.js             # Service worker (cache-first assets, offline fallback)
```

## Environment

A `.env` file is required — copy `.env.example` to `.env` and fill in the real values.
`src/lib/firebase.ts` reads Firebase config from `import.meta.env.VITE_FIREBASE_*`, and
other modules read the BulkSMS, EmailJS, Google OAuth, and FCM VAPID keys the same way.
Never commit `.env` (it's already in `.gitignore`).

## Build

```bash
npm run build       # production build → dist/
npm run preview     # preview the production build locally
```
