import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  connectFirestoreEmulator
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const useEmulator = !!process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV !== 'production';
const app = getApps().length > 0 ? getApp() : initializeApp(
  useEmulator ? { ...firebaseConfig, projectId: 'demo-aprov' } : firebaseConfig
);

// Initialize Firestore
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Emulator access is explicit and limited to local development hosts.
const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
if (emulatorHost && typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  const [host, portText] = emulatorHost.split(':');
  if (!['127.0.0.1', 'localhost'].includes(host) || !/^\d+$/.test(portText ?? '')) {
    throw new Error('Use localhost:porta para o emulador do Firestore.');
  }
  const globals = globalThis as typeof globalThis & { __aprovFirestoreEmulators?: WeakSet<object> };
  globals.__aprovFirestoreEmulators ??= new WeakSet<object>();
  if (!globals.__aprovFirestoreEmulators.has(db)) {
    connectFirestoreEmulator(db, host, Number(portText));
    globals.__aprovFirestoreEmulators.add(db);
  }
}

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// ==========================================
// ERROR HANDLING (FirestoreErrorInfo Standard)
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// CONNECTION TEST
// ==========================================
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'aprov_workspaces', 'hgesm', 'roster', 'principal'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting. Check network/config.');
    }
    return false;
  }
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Erro no login Google com Firebase:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };
