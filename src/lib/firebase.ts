import { initializeApp, getApps, getApp }          from "firebase/app";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider }            from "firebase/auth";
import { getStorage }                             from "firebase/storage";
import { getAnalytics }                           from "firebase/analytics";
import { getFunctions, httpsCallable }            from "firebase/functions";
import { getMessaging, isSupported, getToken, onMessage } from "firebase/messaging";
import { getRemoteConfig, fetchAndActivate }      from "firebase/remote-config";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// HMR-safe: reuse existing app instance on hot-reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persistence only in production — HMR in dev causes Firestore internal assertion
// errors (ca9/b815) when the module reloads while watch streams are active.
export const db = (() => {
  if (import.meta.env.DEV) {
    return getFirestore(app);
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
})();

// Auto-reload on Firestore internal assertion errors (can't recover without reload)
if (typeof window !== 'undefined') {
  const firestoreReload = (msg: string) => {
    if (msg.includes('FIRESTORE') && msg.includes('INTERNAL ASSERTION FAILED')) {
      window.location.reload();
    }
  };
  window.addEventListener('unhandledrejection', (e) => firestoreReload(e.reason?.message ?? ''));
  window.addEventListener('error', (e) => firestoreReload(e.message ?? ''));
}
export const auth        = getAuth(app);
export const storage     = getStorage(app);
export const functions   = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics   = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Remote Config — fetch defaults + remote overrides, refresh every hour
export const remoteConfig = typeof window !== 'undefined' ? (() => {
  const rc = getRemoteConfig(app);
  rc.settings.minimumFetchIntervalMillis = 3_600_000;
  rc.defaultConfig = {
    booking_enabled:    true,
    maintenance_mode:   false,
    max_order_value:    500000,
  };
  fetchAndActivate(rc).catch(() => {});
  return rc;
})() : null;

// ─── Firebase Cloud Messaging ─────────────────────────────────────────────────
export let messaging: ReturnType<typeof getMessaging> | null = null;

// Resolved once messaging is initialised (or confirmed unsupported).
// Consumers can await this before calling onForegroundMessage.
export const messagingReady: Promise<void> =
  typeof window !== 'undefined'
    ? isSupported().then((supported) => {
        if (supported) messaging = getMessaging(app);
      })
    : Promise.resolve();

/**
 * Request notification permission, get FCM token, and save it to the user's
 * Firestore document so Cloud Functions can send targeted push notifications.
 *
 * Call this once after the user logs in (e.g. in AuthContext or App).
 */
export async function requestAndSaveFCMToken(uid: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const msgInstance = messaging || getMessaging(app);
    const vapidKey    = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

    const token = await getToken(msgInstance, { vapidKey });
    if (!token) return null;

    // Persist to Firestore so Cloud Functions can target this device
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });

    return token;
  } catch (err) {
    console.warn('[FCM] requestAndSaveFCMToken failed:', err);
    return null;
  }
}

/**
 * Subscribe to foreground FCM messages. Returns the unsubscribe function.
 * Call this after login; clean up on logout.
 */
export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
): () => void {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

// ─── Notification helpers ─────────────────────────────────────────────────────
const NOTIF_TTL_DAYS  = 30;
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// localStorage-backed dedup: works across tabs (unlike in-memory Map).
// Key = `notif_dedup|${recipientId}|${title}`, value = timestamp string.
function _dedupCheck(key: string): boolean {
  try {
    const raw = localStorage.getItem(`notif_dedup|${key}`);
    if (raw && Date.now() - Number(raw) < DEDUP_WINDOW_MS) return true;
    localStorage.setItem(`notif_dedup|${key}`, String(Date.now()));
    return false;
  } catch {
    return false;
  }
}

export const sendNotification = async (
  recipientId: string,
  title: string,
  message: string,
  type: string = 'info',
): Promise<void> => {
  if (!recipientId) return;
  try {
    const dedupKey = `${recipientId}|${title}`;
    if (_dedupCheck(dedupKey)) return;

    const expiresAt = Timestamp.fromMillis(Date.now() + NOTIF_TTL_DAYS * 86400 * 1000);
    await addDoc(collection(db, 'notifications'), {
      recipientId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      expiresAt,
    });
  } catch (e) {
    console.warn('[sendNotification] non-critical write failed:', e);
  }
};

// ─── Callable wrappers (convenience) ─────────────────────────────────────────
export const cloudSendEmail        = httpsCallable(functions, 'sendEmail');
export const cloudSendSMS          = httpsCallable(functions, 'sendSMS');
export const cloudSendPushNotif    = httpsCallable(functions, 'sendPushNotification');
export const cloudValidateCoupon   = httpsCallable(functions, 'validateCoupon');
export const cloudValidateFile     = httpsCallable(functions, 'validateFileUpload');
export const cloudSubmitContact    = httpsCallable(functions, 'submitPublicContactForm');
