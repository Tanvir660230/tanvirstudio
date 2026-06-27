import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  type QueryConstraint,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCached, setCached, invalidateCache } from '../utils/websiteCache';

function serializeConstraints(constraints: QueryConstraint[]): string {
  try { return constraints.map(c => JSON.stringify(c)).join('|'); }
  catch { return String(constraints.length); }
}

type OptimisticEntry<T> =
  | { type: 'update'; data: Partial<T> }
  | { type: 'delete' }
  | { type: 'add';    data: T };

export function useFirestore<T>(
  collectionName: string,
  constraints:  QueryConstraint[] = [],
  enabled     = true,
  pageSize    = 500,
  cacheKey?:    string,
  hideDeleted = false,
) {
  const [snapshotData, setSnapshotData] = useState<T[]>(() =>
    cacheKey ? (getCached<T[]>(cacheKey) ?? []) : []
  );
  const [optimistic, setOptimistic] = useState<Map<string, OptimisticEntry<T>>>(new Map());
  const [loading,  setLoading]  = useState(() => {
    if (!enabled) return false;
    if (cacheKey && getCached<T[]>(cacheKey) !== null) return false;
    return true;
  });
  const [error,    setError]    = useState<Error | null>(null);
  const [lastDoc,  setLastDoc]  = useState<DocumentSnapshot | null>(null);
  const [hasMore,  setHasMore]  = useState(false);
  const tempCounter = useRef(0);

  const constraintsKey = serializeConstraints(constraints);

  useEffect(() => {
    if (!enabled) {
      setSnapshotData([]);
      setLoading(false);
      setError(null);
      setLastDoc(null);
      setHasMore(false);
      return;
    }

    if (cacheKey) {
      const cached = getCached<T[]>(cacheKey);
      if (cached) { setSnapshotData(cached); setLoading(false); }
    }

    setError(null);
    const q = query(collection(db, collectionName), ...constraints, limit(pageSize));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
        setSnapshotData(docs);

        setOptimistic(prev => {
          if (prev.size === 0) return prev;
          const next = new Map(prev);
          const snapshotIds = new Set(snapshot.docs.map(d => d.id));
          for (const [id, entry] of next) {
            if (entry.type !== 'add' && snapshotIds.has(id)) next.delete(id);
            if (entry.type === 'delete' && !snapshotIds.has(id)) next.delete(id);
          }
          return next;
        });

        if (cacheKey && docs.length > 0) setCached(cacheKey, docs);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === pageSize);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          console.warn(`[useFirestore] permission-denied on "${collectionName}" — user may not have access.`);
          setSnapshotData([]);
        } else {
          console.error(`[useFirestore] Error fetching "${collectionName}":`, err);
        }
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, enabled, cacheKey]);

  // Merge snapshot + optimistic overrides, optionally hiding soft-deleted items
  const data = useMemo<T[]>(() => {
    const deletedIds  = new Set<string>();
    const updatedMap  = new Map<string, Partial<T>>();
    const tempAdds:    T[] = [];

    for (const [id, entry] of optimistic) {
      if (entry.type === 'delete') { deletedIds.add(id); continue; }
      if (entry.type === 'update') { updatedMap.set(id, entry.data); continue; }
      if (entry.type === 'add')    { tempAdds.push(entry.data); }
    }

    const result: T[] = [];
    for (const item of snapshotData) {
      const id = (item as any).id as string;
      if (deletedIds.has(id)) continue;
      if (hideDeleted && (item as any).deleted === true) continue;
      const patch = updatedMap.get(id);
      result.push(patch ? { ...item, ...patch } : item);
    }

    return [...tempAdds, ...result];
  }, [snapshotData, optimistic, hideDeleted]);

  // Append next page (cursor-based, one-shot — no realtime on extra pages)
  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore) return;
    const q = query(collection(db, collectionName), ...constraints, startAfter(lastDoc), limit(pageSize));
    const snap = await getDocs(q);
    const more = snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
    setSnapshotData(prev => [...prev, ...more]);
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, constraintsKey, lastDoc, hasMore, pageSize]);

  // Auto-injects createdAt server timestamp if caller didn't provide one.
  // Optimistic entry uses local ISO string so the UI updates immediately.
  const add = async (item: Omit<T, 'id'>) => {
    const now    = new Date().toISOString();
    const tempId = `__temp_${++tempCounter.current}`;
    const optimisticItem = { id: tempId, createdAt: now, ...item } as T;

    setOptimistic(prev => new Map(prev).set(tempId, { type: 'add', data: optimisticItem }));

    const payload: Record<string, unknown> = { ...(item as any) };
    if (!payload.createdAt) payload.createdAt = serverTimestamp();

    try {
      const ref = await addDoc(collection(db, collectionName), payload);
      setOptimistic(prev => { const next = new Map(prev); next.delete(tempId); return next; });
      if (cacheKey) invalidateCache(cacheKey);
      return ref;
    } catch (err) {
      setOptimistic(prev => { const next = new Map(prev); next.delete(tempId); return next; });
      throw err;
    }
  };

  // Auto-injects updatedAt server timestamp on every update.
  const update = async (id: string, item: Partial<T>) => {
    setOptimistic(prev => new Map(prev).set(id, { type: 'update', data: item }));
    try {
      await updateDoc(doc(db, collectionName, id), {
        ...(item as any),
        updatedAt: serverTimestamp(),
      });
      if (cacheKey) invalidateCache(cacheKey);
    } catch (err) {
      setOptimistic(prev => { const next = new Map(prev); next.delete(id); return next; });
      throw err;
    }
  };

  // Hard delete — permanently removes the document
  const remove = async (id: string) => {
    setOptimistic(prev => new Map(prev).set(id, { type: 'delete' }));
    try {
      await deleteDoc(doc(db, collectionName, id));
      if (cacheKey) invalidateCache(cacheKey);
    } catch (err) {
      setOptimistic(prev => { const next = new Map(prev); next.delete(id); return next; });
      throw err;
    }
  };

  // Soft delete — marks deleted:true so data is recoverable; use with hideDeleted:true
  const softDelete = async (id: string) => {
    setOptimistic(prev => new Map(prev).set(id, { type: 'delete' }));
    try {
      await updateDoc(doc(db, collectionName, id), {
        deleted:   true,
        deletedAt: serverTimestamp(),
      });
      if (cacheKey) invalidateCache(cacheKey);
    } catch (err) {
      setOptimistic(prev => { const next = new Map(prev); next.delete(id); return next; });
      throw err;
    }
  };

  return { data, loading, error, add, update, remove, softDelete, loadMore, hasMore };
}
