// Server-side database access. Browsers never talk to Firestore directly; they go
// through the /api/store endpoints in server.ts, which use this module.
//
// With FIREBASE_SERVICE_ACCOUNT set (the JSON of a Firebase service account key), the
// server uses the Firebase Admin SDK, which works even when firestore.rules deny all
// client access. Without it, the server falls back to the regular web SDK, which only
// works while the rules are still open (handy for local development).
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as webFirestore from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

export type StoreOp =
  | { type: 'set'; collection: string; id: string; data: Record<string, unknown>; merge?: boolean }
  | { type: 'update'; collection: string; id: string; data: Record<string, unknown> }
  | { type: 'delete'; collection: string; id: string };

export interface StoreDoc {
  id: string;
  data: Record<string, unknown>;
}

interface Store {
  mode: 'admin' | 'web';
  list(collection: string): Promise<StoreDoc[]>;
  commit(ops: StoreOp[]): Promise<void>;
}

const createAdminStore = (serviceAccountJson: string): Store => {
  const app = getApps()[0] || initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  const db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  return {
    mode: 'admin',
    async list(collection) {
      const snapshot = await db.collection(collection).get();
      return snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    },
    async commit(ops) {
      const batch = db.batch();
      for (const op of ops) {
        const ref = db.collection(op.collection).doc(op.id);
        if (op.type === 'set') batch.set(ref, op.data, { merge: !!op.merge });
        else if (op.type === 'update') batch.update(ref, op.data);
        else batch.delete(ref);
      }
      await batch.commit();
    },
  };
};

const createWebStore = async (): Promise<Store> => {
  const { db } = await import('./src/lib/firebase');
  const { collection, doc, getDocs, writeBatch } = webFirestore;

  return {
    mode: 'web',
    async list(name) {
      const snapshot = await getDocs(collection(db, name));
      return snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    },
    async commit(ops) {
      const batch = writeBatch(db);
      for (const op of ops) {
        const ref = doc(db, op.collection, op.id);
        if (op.type === 'set') batch.set(ref, op.data, { merge: !!op.merge });
        else if (op.type === 'update') batch.update(ref, op.data);
        else batch.delete(ref);
      }
      await batch.commit();
    },
  };
};

let storePromise: Promise<Store> | null = null;

export const getStore = (): Promise<Store> => {
  if (!storePromise) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    storePromise = serviceAccount ? Promise.resolve(createAdminStore(serviceAccount)) : createWebStore();
    storePromise.then(store => {
      console.log(
        store.mode === 'admin'
          ? 'Database: using Firebase Admin (secure mode).'
          : 'Database: FIREBASE_SERVICE_ACCOUNT not set, using open web access (development mode).'
      );
    });
  }
  return storePromise;
};
