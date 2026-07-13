import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, query, where, getDocFromServer } from 'firebase/firestore';
import { Employee } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Let's load the Firebase config if it exists. We'll lazy initialize.
let app: any = null;
let db: any = null;
let auth: any = null;
let firebaseEnabled = false;

// Default initial mock employees
const INITIAL_MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'chakra@weehur.com.sg',
    employeeId: 'WH1234',
    fullName: 'CHAKRAVARTHI G',
    designation: 'PROJECT ENGINEER',
    department: 'Projects',
    mobile: '+65 9123 4567',
    email: 'chakra@weehur.com.sg',
    site: 'Weehur Main Site',
    dateOfJoining: '12 Jan 2020',
    nationality: 'Singaporean',
    emergencyContact: '+65 6789 1234',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    qrCodeUrl: '', // Generated dynamically
    activeStatus: true,
    isAdmin: true // Bootstrapped admin
  },
  {
    id: 'chen.m@weehur.com.sg',
    employeeId: 'WH1088',
    fullName: 'MICHAEL CHEN',
    designation: 'WSH OFFICER',
    department: 'Safety',
    mobile: '+65 8234 5678',
    email: 'chen.m@weehur.com.sg',
    site: 'Changi East Site',
    dateOfJoining: '15 Mar 2021',
    nationality: 'Malaysian',
    emergencyContact: '+65 6555 1111',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    qrCodeUrl: '',
    activeStatus: true,
    isAdmin: false
  },
  {
    id: 'sarah.toh@weehur.com.sg',
    employeeId: 'WH0899',
    fullName: 'SARAH TOH',
    designation: 'HR MANAGER',
    department: 'HR',
    mobile: '+65 9111 2222',
    email: 'sarah.toh@weehur.com.sg',
    site: 'Head Office',
    dateOfJoining: '10 May 2018',
    nationality: 'Singaporean',
    emergencyContact: '+65 6222 3333',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    qrCodeUrl: '',
    activeStatus: true,
    isAdmin: false
  },
  {
    id: 'tan.kk@weehur.com.sg',
    employeeId: 'WH0012',
    fullName: 'TAN KAH KEE',
    designation: 'PROJECT DIRECTOR',
    department: 'Management',
    mobile: '+65 9888 7777',
    email: 'tan.kk@weehur.com.sg',
    site: 'Head Office',
    dateOfJoining: '01 Sep 2012',
    nationality: 'Singaporean',
    emergencyContact: '+65 6888 1234',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    qrCodeUrl: '',
    activeStatus: true,
    isAdmin: true
  }
];

// Initialize mock storage if not already there
export const getLocalStorageEmployees = (): Employee[] => {
  const data = localStorage.getItem('weehur_employees');
  if (!data) {
    localStorage.setItem('weehur_employees', JSON.stringify(INITIAL_MOCK_EMPLOYEES));
    return INITIAL_MOCK_EMPLOYEES;
  }
  return JSON.parse(data);
};

const setLocalStorageEmployees = (employees: Employee[]) => {
  localStorage.setItem('weehur_employees', JSON.stringify(employees));
};

// Error handlers strictly matching FirestoreErrorInfo
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };

  // If it's an expected permission restriction, log as warning to prevent automated false alerts.
  if (errMessage.includes('permission') || errMessage.includes('Permission') || errMessage.includes('insufficient')) {
    console.warn('Firestore expected permission restriction:', JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  
  throw new Error(JSON.stringify(errInfo));
}

// Attempt Firebase Setup
export function tryInitializeFirebase() {
  if (firebaseEnabled) return { enabled: true, auth, db };
  
  try {
    const config = firebaseConfig;

    if (config && config.apiKey) {
      if (!getApps().length) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }
      if (config.firestoreDatabaseId) {
        db = getFirestore(app, config.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }
      auth = getAuth(app);
      firebaseEnabled = true;
      console.log('Firebase initialized successfully from applet config!');
      return { enabled: true, auth, db };
    }
  } catch (error) {
    console.warn('Firebase initialization skipped or failed:', error);
  }
  return { enabled: false, auth: null, db: null };
}

// Mock auth states
export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

let mockCurrentUser: MockUser | null = {
  uid: 'chakra-uid-1234',
  email: 'chakra@weehur.com.sg',
  displayName: 'CHAKRAVARTHI G',
  photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  emailVerified: true
};

export const getActiveUser = (): { email: string; name: string; photoUrl: string; isAdmin: boolean; isFirebase: boolean; department?: string; designation?: string } => {
  const { enabled, auth: fAuth } = tryInitializeFirebase();
  const employees = getLocalStorageEmployees();
  
  if (enabled && fAuth && fAuth.currentUser) {
    const emailStr = fAuth.currentUser.email || '';
    const currentEmployee = employees.find(e => e.email.toLowerCase() === emailStr.toLowerCase());
    const isUserAdmin = emailStr === 'chakra@weehur.com.sg' || 
                        currentEmployee?.isAdmin ||
                        localStorage.getItem(`admin_${emailStr}`) === 'true';
    return {
      email: emailStr,
      name: currentEmployee?.fullName || fAuth.currentUser.displayName || emailStr.split('@')[0].toUpperCase() || '',
      photoUrl: currentEmployee?.photoUrl || fAuth.currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      isAdmin: isUserAdmin,
      isFirebase: true,
      department: currentEmployee?.department,
      designation: currentEmployee?.designation
    };
  }
  
  // Local storage mock auth
  const savedMock = localStorage.getItem('weehur_mock_auth');
  if (savedMock) {
    const parsed = JSON.parse(savedMock);
    const currentEmployee = employees.find(e => e.email.toLowerCase() === parsed.email.toLowerCase());
    return {
      email: parsed.email,
      name: currentEmployee?.fullName || parsed.displayName || '',
      photoUrl: currentEmployee?.photoUrl || parsed.photoURL || '',
      isAdmin: currentEmployee?.isAdmin || parsed.email === 'chakra@weehur.com.sg',
      isFirebase: false,
      department: currentEmployee?.department,
      designation: currentEmployee?.designation
    };
  }

  // Fallback default
  const chakraRecord = INITIAL_MOCK_EMPLOYEES[0];
  return {
    email: chakraRecord.email,
    name: chakraRecord.fullName,
    photoUrl: chakraRecord.photoUrl,
    isAdmin: true,
    isFirebase: false,
    department: chakraRecord.department,
    designation: chakraRecord.designation
  };
};

export const setMockUser = (email: string) => {
  const employees = getLocalStorageEmployees();
  const emp = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (emp) {
    const user = {
      uid: `mock-uid-${emp.employeeId}`,
      email: emp.email,
      displayName: emp.fullName,
      photoURL: emp.photoUrl,
      emailVerified: true
    };
    localStorage.setItem('weehur_mock_auth', JSON.stringify(user));
  } else {
    const user = {
      uid: `mock-uid-new`,
      email: email,
      displayName: email.split('@')[0].toUpperCase(),
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
      emailVerified: true
    };
    localStorage.setItem('weehur_mock_auth', JSON.stringify(user));
  }
};

export const logoutUser = async (): Promise<void> => {
  const { enabled, auth: fAuth } = tryInitializeFirebase();
  if (enabled && fAuth) {
    await signOut(fAuth);
  } else {
    localStorage.removeItem('weehur_mock_auth');
  }
};

// Database CRUD Operations (Dynamic fall-through)
export const fetchEmployees = async (): Promise<Employee[]> => {
  const { enabled, db: fDb, auth: fAuth } = tryInitializeFirebase();
  
  if (enabled && fDb) {
    const currentUserEmail = fAuth?.currentUser?.email;
    const isUserAdmin = currentUserEmail === 'chakra@weehur.com.sg' || 
                        localStorage.getItem(`admin_${currentUserEmail}`) === 'true';

    // Only query collection list if an authenticated administrator is signed in.
    // Otherwise, immediately fallback to local cache to satisfy secure data-harvesting restrictions.
    if (!fAuth?.currentUser || !isUserAdmin) {
      return getLocalStorageEmployees();
    }

    const path = 'employees';
    try {
      const q = collection(fDb, path);
      const snapshot = await getDocs(q);
      const employees: Employee[] = [];
      snapshot.forEach(doc => {
        employees.push({ id: doc.id, ...doc.data() } as Employee);
      });
      return employees;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  // Fallback to local storage
  return getLocalStorageEmployees();
};

export const fetchEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  const { enabled, db: fDb } = tryInitializeFirebase();

  if (enabled && fDb) {
    const path = `employees/${email}`;
    try {
      const docRef = doc(fDb, 'employees', email);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Employee;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  // Fallback to local storage
  const list = getLocalStorageEmployees();
  const found = list.find(e => e.email.toLowerCase() === email.toLowerCase());
  return found || null;
};

export const saveEmployeeRecord = async (employee: Employee): Promise<void> => {
  const { enabled, db: fDb, auth: fAuth } = tryInitializeFirebase();
  const docId = employee.email; // Use email as document ID

  // Only attempt write if authenticated in Firebase. Unauthenticated/simulated users directly fallback to local storage.
  if (enabled && fDb && fAuth?.currentUser) {
    const path = `employees/${docId}`;
    try {
      const docRef = doc(fDb, 'employees', docId);
      await setDoc(docRef, {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        designation: employee.designation,
        department: employee.department,
        mobile: employee.mobile,
        email: employee.email,
        site: employee.site,
        nationality: employee.nationality,
        dateOfJoining: employee.dateOfJoining,
        emergencyContact: employee.emergencyContact,
        photoUrl: employee.photoUrl,
        qrCodeUrl: employee.qrCodeUrl || '',
        activeStatus: employee.activeStatus,
        isAdmin: employee.isAdmin || false
      });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Fallback to local storage
  const list = getLocalStorageEmployees();
  const idx = list.findIndex(e => e.email.toLowerCase() === employee.email.toLowerCase());
  const updatedEmployee = { ...employee, id: docId };
  if (idx > -1) {
    list[idx] = updatedEmployee;
  } else {
    list.push(updatedEmployee);
  }
  setLocalStorageEmployees(list);
};

export const deleteEmployeeRecord = async (email: string): Promise<void> => {
  const { enabled, db: fDb, auth: fAuth } = tryInitializeFirebase();

  // Only attempt delete if authenticated in Firebase. Unauthenticated/simulated users directly fallback to local storage.
  if (enabled && fDb && fAuth?.currentUser) {
    const path = `employees/${email}`;
    try {
      const docRef = doc(fDb, 'employees', email);
      await deleteDoc(docRef);
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Fallback to local storage
  const list = getLocalStorageEmployees();
  const filtered = list.filter(e => e.email.toLowerCase() !== email.toLowerCase());
  setLocalStorageEmployees(filtered);
};

export async function seedDatabaseIfEmpty() {
  const { enabled, db: fDb, auth: fAuth } = tryInitializeFirebase();
  if (!enabled || !fDb) return;
  
  // Only attempt seeding if an administrator is authenticated in Firebase
  const currentUserEmail = fAuth?.currentUser?.email;
  const isUserAdmin = currentUserEmail === 'chakra@weehur.com.sg' || 
                      localStorage.getItem(`admin_${currentUserEmail}`) === 'true';
  if (!fAuth?.currentUser || !isUserAdmin) {
    return;
  }

  try {
    const q = collection(fDb, 'employees');
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log('Database is empty. Seeding with initial employees...');
      for (const employee of INITIAL_MOCK_EMPLOYEES) {
        await saveEmployeeRecord(employee);
      }
      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.warn('Failed to seed database:', error);
  }
}

// Seed standard connection test as mandated by firebase-integration skill
export async function testConnection() {
  const { enabled, db: fDb } = tryInitializeFirebase();
  if (!enabled || !fDb) return;
  try {
    const docRef = doc(fDb, 'test', 'connection');
    await getDocFromServer(docRef);
    await seedDatabaseIfEmpty();
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.warn('testConnection warning:', error);
    }
  }
}
testConnection();
