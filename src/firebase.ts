import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { env, isEnvConfigured } from './config/env';

export const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
  ...(env.firebase.measurementId ? { measurementId: env.firebase.measurementId } : {}),
};

const databaseId = env.firebase.databaseId || undefined;

export function isFirebaseConfigured(): boolean {
  return isEnvConfigured;
}

function createFirebaseApp(): FirebaseApp | null {
  if (!isEnvConfigured) return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function createFirestore(firebaseApp: FirebaseApp | null): Firestore | null {
  if (!firebaseApp) return null;

  try {
    return initializeFirestore(
      firebaseApp,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch {
    try {
      return initializeFirestore(
        firebaseApp,
        {
          localCache: memoryLocalCache(),
        },
        databaseId
      );
    } catch {
      return databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
    }
  }
}

export const app: FirebaseApp | null = createFirebaseApp();
export const db: Firestore | null = createFirestore(app);
export const auth: Auth | null = app ? getAuth(app) : null;

async function testConnection(): Promise<void> {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
