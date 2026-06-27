import { useState, useEffect, useCallback } from 'react';
import { messagingReady, onForegroundMessage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export interface FCMNotification {
  title: string;
  body?: string;
  url?: string;
}

export function useFCMForeground() {
  const { user } = useAuth();
  const [notification, setNotification] = useState<FCMNotification | null>(null);

  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | null = null;

    messagingReady.then(() => {
      unsub = onForegroundMessage((payload) => {
        setNotification({
          title: payload.notification?.title ?? 'Tanvir Studio',
          body:  payload.notification?.body,
          url:   (payload.data as Record<string, string>)?.url,
        });
      });
    });

    return () => { unsub?.(); };
  }, [user]);

  const dismiss = useCallback(() => setNotification(null), []);

  return { notification, dismiss };
}
