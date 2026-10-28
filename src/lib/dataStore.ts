// Browser-side stand-in for the parts of 'firebase/firestore' the app uses. Instead of
// talking to Firestore directly (which needs the database open to the internet), every
// read and write goes through the app's own server at /api/store. Live updates are
// replaced by one small "what changed?" check every few seconds, plus an immediate
// refresh after this browser saves something.

const POLL_INTERVAL_MS = 5_000;

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
  return (await res.json()) as { docs: { id: string; data: any }[]; version: string };
};

export const getDocs = async (ref: CollectionRef): Promise<QuerySnapshot> => toSnapshot((await fetchCollection(ref.collection)).docs);

// --- Live updates: one shared poller for every subscribed collection ---
type Listener = (snapshot: QuerySnapshot) => void;
const listeners = new Map<string, Set<Listener>>();
const knownVersions = new Map<string, string>();
const latestSnapshots = new Map<string, QuerySnapshot>();
let pollTimer: ReturnType<typeof setInterval> | null = null;

const refreshCollection = async (name: string) => {
  try {
    const { docs, version } = await fetchCollection(name);
    if (knownVersions.get(name) === version) return;
    knownVersions.set(name, version);
    const snapshot = toSnapshot(docs);
    latestSnapshots.set(name, snapshot);
    listeners.get(name)?.forEach(listener => listener(snapshot));
  } catch (err) {
    console.warn(`Live refresh of ${name} failed:`, err);
  }
};

const checkForChanges = async () => {
  const names = [...listeners.keys()];
  if (names.length === 0 || document.hidden) return;
  try {
    const res = await fetch(`/api/store-versions?collections=${names.map(encodeURIComponent).join(',')}`);
    if (!res.ok) return;
    const { versions } = (await res.json()) as { versions: Record<string, string> };
    await Promise.all(
      names.filter(name => versions[name] && versions[name] !== knownVersions.get(name)).map(refreshCollection)
    );
  } catch (err) {
    console.warn('Checking for changes failed:', err);
  }
};

const ensurePolling = () => {
  if (pollTimer) return;
  pollTimer = setInterval(checkForChanges, POLL_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForChanges();
  });
};

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
  await Promise.all([...new Set(ops.map(op => op.collection))].filter(name => listeners.has(name)).map(refreshCollection));
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
export const onSnapshot = (ref: CollectionRef, callback: Listener) => {
  const name = ref.collection;
  const isNewCollection = !listeners.has(name);
  const set = listeners.get(name) || new Set<Listener>();
  set.add(callback);
  listeners.set(name, set);
  ensurePolling();

  const latest = latestSnapshots.get(name);
  if (latest) callback(latest);
  if (isNewCollection || !latest) refreshCollection(name);

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      listeners.delete(name);
      knownVersions.delete(name);
      latestSnapshots.delete(name);
    }
  };
};
