/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  doc, setDoc, deleteDoc, updateDoc, onSnapshot,
  collection, query, where, getDocs, addDoc, limit, serverTimestamp,
} from 'firebase/firestore';
import { auth, db, requestAndSaveFCMToken } from '../lib/firebase';

export interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'composer' | 'humming_artist' | 'client';
  name?: string;
  theme?: string;
  accentColor?: string;
  photoURL?: string;
  phone?: string;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

export const useAuth = () => useContext(AuthContext);

// Role priority for picking the best doc when duplicates exist
const ROLE_PRIORITY: Record<string, number> = {
  admin: 4, composer: 3, humming_artist: 2, client: 1,
};

// ── localStorage cache helpers ────────────────────────────────────────────────
// Caches a minimal subset of userData so the app shell can render immediately
// on the next page load without waiting for Firestore.
const TS_CACHE_KEY = 'ts_ud_v1';

function readCachedUser(): UserData | null {
  try { return JSON.parse(localStorage.getItem(TS_CACHE_KEY) || 'null') as UserData | null; }
  catch { return null; }
}

function writeCachedUser(d: UserData): void {
  try {
    localStorage.setItem(TS_CACHE_KEY, JSON.stringify({
      uid: d.uid, email: d.email, role: d.role,
      name: d.name, theme: d.theme, photoURL: d.photoURL,
    }));
  } catch { /* ignore */ }
}

function clearCachedUser(): void {
  try { localStorage.removeItem(TS_CACHE_KEY); } catch { /* ignore */ }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pre-populate from cache so DataContext & theme apply before Firebase resolves
  const cachedOnMount = readCachedUser();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(cachedOnMount);
  // If cache exists, skip loading screen — Firebase auth check still runs in background
  const [loading, setLoading] = useState(!cachedOnMount);
  // Prevent lastLoginAt updateDoc from triggering an infinite snapshot loop
  const lastLoginWritten = React.useRef(false);

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => setLoading(false), 5000);
    const clearSafety = () => { if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; } };
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearSafety();

      // Block unverified email/password accounts only — Google OAuth users are always verified
      const isOAuthUser = firebaseUser?.providerData?.some(p => p.providerId !== 'password');
      if (firebaseUser && !firebaseUser.emailVerified && !isOAuthUser) {
        await signOut(auth);
        clearCachedUser();
        setUser(null); setUserData(null); setLoading(false);
        return;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        // Only show loading if no cache is available
        if (!cachedOnMount) setLoading(true);
        lastLoginWritten.current = false;
        const authUid    = firebaseUser.uid;
        const finalEmail = firebaseUser.email || '';

        // ── Find the best user document ────────────────────────────────────────
        // Strategy:
        //   1. Query ALL docs with this email (may be 0, 1, or 2 due to past duplicates)
        //   2. Pick the doc with the highest-privilege role as "canonical"
        //   3. If canonical doc is NOT the authUid doc, write a minimal bridge record
        //      to users/{authUid} with `_bridgeRole` so Firestore Rules can verify the
        //      correct role via the `user_role_overrides` collection.
        //   4. Listen to the canonical doc for real-time role/theme/settings updates.
        // ──────────────────────────────────────────────────────────────────────
        let canonicalUid = authUid; // default: use Firebase Auth UID

        if (finalEmail) {
          try {
            const snap = await getDocs(
              query(collection(db, 'users'), where('email', '==', finalEmail), limit(5))
            );

            if (!snap.empty) {
              // Pick the doc with the highest role privilege
              const best = snap.docs.reduce((a, b) => {
                const ra = ROLE_PRIORITY[a.data().role ?? 'client'] ?? 1;
                const rb = ROLE_PRIORITY[b.data().role ?? 'client'] ?? 1;
                return rb > ra ? b : a;
              });
              canonicalUid = best.id;

              // If canonical doc is NOT at authUid, write a role override record
              // to `user_role_overrides/{authUid}` so Firestore rules can see the
              // correct role when checking request.auth.uid.
              if (canonicalUid !== authUid) {
                const bestRole = best.data().role || 'client';
                // This write is to a different collection with permissive rules
                setDoc(
                  doc(db, 'user_role_overrides', authUid),
                  { role: bestRole, canonicalUid, email: finalEmail, updatedAt: Date.now() },
                  { merge: true }
                ).catch(() => {});

                // Try to merge canonical doc data into authUid doc and delete old
                // Only possible if the authUid doc doesn't exist yet (CREATE is allowed)
                const authDocExists = snap.docs.some(d => d.id === authUid);
                if (!authDocExists) {
                  try {
                    await setDoc(
                      doc(db, 'users', authUid),
                      { ...best.data(), uid: authUid, email: finalEmail },
                      { merge: false }
                    );
                    // Successfully created authUid doc — now it's canonical
                    canonicalUid = authUid;
                    // Try to clean up old doc (only works if admin)
                    deleteDoc(doc(db, 'users', best.id)).catch(() => {});
                  } catch {
                    // setDoc failed (rules may block) — keep canonicalUid as old doc
                  }
                }
                // If authUid doc EXISTS with wrong role, we can't update it (rules block role change).
                // Firestore rules will use `user_role_overrides` to compensate.
              }
            }
          } catch (e) {
            console.error('[AuthContext] User lookup error:', e);
          }
        }

        const userRef = doc(db, 'users', canonicalUid);
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }

        unsubscribeSnapshot = onSnapshot(userRef, async (userSnap) => {
          try {
            if (userSnap.exists()) {
              const data = userSnap.data() as UserData;

              // Generate referral code if missing
              if (!data.referralCode && data.role === 'client') {
                const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                data.referralCode = newCode;
                updateDoc(doc(db, 'users', canonicalUid), { referralCode: newCode }).catch(() => {});
              }

              // Sync theme to DOM
              if (data.theme === 'dark') {
                document.documentElement.classList.add('dark');
                document.body.style.backgroundColor = 'var(--bg-color)';
              } else if (data.theme === 'light') {
                document.documentElement.classList.remove('dark');
                document.body.style.backgroundColor = 'var(--bg-color)';
              }
              if (data.accentColor) {
                document.documentElement.style.setProperty('--accent-blue', data.accentColor);
              }

              setUserData({ ...data, uid: canonicalUid });
              writeCachedUser({ ...data, uid: canonicalUid });

              // Track last login time — only once per session to avoid snapshot loop
              if (!lastLoginWritten.current) {
                lastLoginWritten.current = true;
                updateDoc(doc(db, 'users', canonicalUid), { lastLoginAt: serverTimestamp() }).catch(() => {});
              }

              // Keep role_override in sync if role changed
              if (canonicalUid !== authUid) {
                setDoc(
                  doc(db, 'user_role_overrides', authUid),
                  { role: data.role, canonicalUid, email: finalEmail, updatedAt: Date.now() },
                  { merge: true }
                ).catch(() => {});
              }

              // Leads tracking
              if (data.role !== 'admin' && finalEmail) {
                const leadKey = `ts_lead_${finalEmail}`;
                if (!sessionStorage.getItem(leadKey)) {
                  sessionStorage.setItem(leadKey, '1');
                  getDocs(query(collection(db, 'leads'), where('email', '==', finalEmail), limit(1)))
                    .then(s => {
                      if (s.empty) addDoc(collection(db, 'leads'), {
                        name: firebaseUser.displayName || finalEmail.split('@')[0] || 'User',
                        email: finalEmail,
                        source: 'website_login',
                        createdAt: new Date().toISOString(),
                      });
                    }).catch(() => {});
                }
              }

              // FCM token
              const fcmKey = `ts_fcm_${canonicalUid}`;
              if (!sessionStorage.getItem(fcmKey)) {
                sessionStorage.setItem(fcmKey, '1');
                requestAndSaveFCMToken(canonicalUid).catch(() => {});
              }
            } else {
              // Brand-new user
              const newUser: UserData = {
                uid:      canonicalUid,
                email:    finalEmail,
                role:     'client',
                name:     firebaseUser.displayName || finalEmail.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || '',
                referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
              };
              try { await setDoc(userRef, { ...newUser, createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() }); } catch { /* non-critical */ }
              setUserData(newUser);
            }
          } catch (e) {
            console.error('[AuthContext] Snapshot processing error:', e);
          } finally {
            setLoading(false);
          }
        }, (err) => {
          console.error('[AuthContext] Snapshot error — fallback:', err);
          setUserData({
            uid: canonicalUid, email: finalEmail, role: 'client',
            name: firebaseUser.displayName || finalEmail.split('@')[0] || 'User',
          });
          setLoading(false);
        });

      } else {
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        clearCachedUser();
        setUserData(null);
        setLoading(false);
      }
    });

    return () => { clearSafety(); unsubscribeAuth(); if (unsubscribeSnapshot) unsubscribeSnapshot(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
