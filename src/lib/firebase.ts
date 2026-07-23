import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;
let firebaseInitialized = false;

export function initializeFirebase() {
  if (firebaseInitialized) return { db, auth, enabled: true };

  try {
    if (firebaseConfig && firebaseConfig.apiKey) {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      auth = getAuth(app);
      firebaseInitialized = true;
      return { db, auth, enabled: true };
    }
  } catch (error) {
    console.warn('Firebase lazy initialization skipped or failed:', error);
  }
  return { db: null, auth: null, enabled: false };
}

// Global Enum for tracking operations
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const { auth: fAuth } = initializeFirebase();
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    authInfo: {
      userId: fAuth?.currentUser?.uid || null,
      email: fAuth?.currentUser?.email || null,
      emailVerified: fAuth?.currentUser?.emailVerified || null,
      isAnonymous: fAuth?.currentUser?.isAnonymous || null,
    }
  };

  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
