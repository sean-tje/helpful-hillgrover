// Browser-side stand-in for the parts of 'firebase/firestore' the app uses. Instead of
// talking to Firestore directly (which needs the database open to the internet), every
// read and write goes through the app's own server at /api/store. Live updates are
// replaced by polling, plus an immediate refresh after this browser saves something.

const POLL_INTERVAL_MS = 10_000;

export const db = { kind: 'server-store' } as const;
type Db = typeof db;

export interface CollectionRef {
  collection: string;
}

export interface DocRef {
  collection: string;
  id: string;
}

export interface DocSnapshot {
  id: string;
  data: () => any;
}

export interface QuerySnapshot {
  empty: boolean;
  docs: DocSnapshot[];
  forEach: (callback: (doc: DocSnapshot) => void) => void;
}

type Op =
  | { type: 'set'; collection: string; id: string; data: object; merge?: boolean }
  | { type: 'update'; collection: string; id: string; data: object }
  | { type: 'delete'; collection: string; id: string };

export const collection = (_db: Db, name: string): CollectionRef => ({ collection: name });

export const doc = (_db: Db, collectionName: string, id: string): DocRef => ({ collection: collectionName, id });

const toSnapshot = (docs: { id: string; data: any }[]): QuerySnapshot => {
  const snapshots = docs.map(d => ({ id: d.id, data: () => d.data }));
  return {
    empty: snapshots.length === 0,
    docs: snapshots,
    forEach: callback => snapshots.forEach(callback),
  };
};

const fetchCollection = async (name: string) => {
  const res = await fetch(`/api/store/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`Could not load ${name} (${res.status})`);
  const body = await res.json();
  return body.docs as { id: string; data: any }[];
};

export const getDocs = async (ref: CollectionRef): Promise<QuerySnapshot> => toSnapshot(await fetchCollection(ref.collection));

// Listeners to refresh straight away when this browser writes to a collection
const changeListeners = new Map<string, Set<() => void>>();

const commit = async (ops: Op[]) => {
  if (ops.length === 0) return;
  const res = await fetch('/api/store/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Save failed (${res.status})`);
  }
  new Set(ops.map(op => op.collection)).forEach(name => changeListeners.get(name)?.forEach(refresh => refresh()));
};

export const setDoc = (ref: DocRef, data: object, options?: { merge?: boolean }) =>
  commit([{ type: 'set', collection: ref.collection, id: ref.id, data, merge: !!options?.merge }]);

export const updateDoc = (ref: DocRef, data: object) =>
  commit([{ type: 'update', collection: ref.collection, id: ref.id, data }]);

export const deleteDoc = (ref: DocRef) =>
  commit([{ type: 'delete', collection: ref.collection, id: ref.id }]);

export const writeBatch = (_db: Db) => {
  const ops: Op[] = [];
  const batch = {
    set: (ref: DocRef, data: object, options?: { merge?: boolean }) => {
      ops.push({ type: 'set', collection: ref.collection, id: ref.id, data, merge: !!options?.merge });
      return batch;
    },
    update: (ref: DocRef, data: object) => {
      ops.push({ type: 'update', collection: ref.collection, id: ref.id, data });
      return batch;
    },
    delete: (ref: DocRef) => {
      ops.push({ type: 'delete', collection: ref.collection, id: ref.id });
      return batch;
    },
    commit: () => commit(ops),
  };
  return batch;
};

// Calls back with the collection now and whenever it changes; returns an unsubscribe function
export const onSnapshot = (ref: CollectionRef, callback: (snapshot: QuerySnapshot) => void) => {
  let stopped = false;
  let lastJson = '';

  const refresh = async () => {
    if (stopped) return;
    try {
      const docs = await fetchCollection(ref.collection);
      const json = JSON.stringify(docs);
      if (!stopped && json !== lastJson) {
        lastJson = json;
        callback(toSnapshot(docs));
      }
    } catch (err) {
      console.warn(`Live refresh of ${ref.collection} failed:`, err);
    }
  };

  const listeners = changeListeners.get(ref.collection) || new Set();
  listeners.add(refresh);
  changeListeners.set(ref.collection, listeners);

  refresh();
  const timer = setInterval(() => {
    if (!document.hidden) refresh();
  }, POLL_INTERVAL_MS);

  return () => {
    stopped = true;
    clearInterval(timer);
    listeners.delete(refresh);
  };
};
