import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  User,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { Employee } from '../types';

interface AuthContextType {
  currentUser: User | null;
  currentUserProfile: Employee | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resetPasswordLocal: (email: string, newPassword: string) => Promise<void>;
  signUpFirstTime: (email: string, password: string) => Promise<void>;
  verifyPreRegisteredEmail: (email: string) => Promise<Employee | null>;
  loginWithGoogle: () => Promise<void>;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Employee | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { auth, db, enabled } = initializeFirebase();

  // Load profile details from Firestore
  const fetchUserProfileAndRole = async (user: User) => {
    if (!enabled || !db) return;

    try {
      const emailLower = user.email?.toLowerCase() || '';
      
      // We check root super admin override
      const isSuperAdmin = emailLower === 'chakra@weehur.com.sg';

      // Get employee profile
      const empDocRef = doc(db, 'employees', emailLower);
      const empSnap = await getDoc(empDocRef);

      if (empSnap.exists()) {
        const empData = empSnap.data() as Employee;
        // Make sure superadmin email lower always gets Admin status
        if (isSuperAdmin) {
          empData.role = 'Admin';
          if (empData.fullName === 'Super Admin') {
            empData.fullName = 'Chakravarthy';
            try {
              await setDoc(empDocRef, { fullName: 'Chakravarthy' }, { merge: true });
            } catch (e) {
              console.error('Failed to update Super Admin name to Chakravarthy:', e);
            }
          }
        }
        setCurrentUserProfile({ ...empData, id: empSnap.id });
        setIsAdmin(empData.role === 'Admin');
      } else if (isSuperAdmin) {
        // Create an automatic admin profile if it doesn't exist
        const defaultAdmin: Employee = {
          id: emailLower,
          employeeId: 'WH-ADMIN',
          fullName: 'Chakravarthy',
          photoUrl: '',
          email: emailLower,
          phone: '+65 6250 1234',
          designation: 'Managing Director',
          department: 'Management',
          company: 'WeeHur Construction',
          workSites: ['Site A', 'Site B', 'Site C', 'Site D'],
          status: 'Active',
          dateJoined: '2020-01-01',
          role: 'Admin'
        };
        await setDoc(empDocRef, defaultAdmin);
        setCurrentUserProfile(defaultAdmin);
        setIsAdmin(true);
      } else {
        // Fallback for custom user records not fully in employees
        setCurrentUserProfile(null);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    if (!enabled || !auth) {
      setLoading(false);
      return;
    }

    // Check if there is a local/fallback session saved
    const savedLocalSession = localStorage.getItem('weehur_local_session');
    if (savedLocalSession) {
      try {
        const localUser = JSON.parse(savedLocalSession);
        setCurrentUser(localUser);
        fetchUserProfileAndRole(localUser).then(() => {
          setLoading(false);
        });
        return;
      } catch (e) {
        console.error('Error reading saved local session:', e);
        localStorage.removeItem('weehur_local_session');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const emailLower = user.email?.toLowerCase() || '';
        if (!emailLower.endsWith('@weehur.com.sg')) {
          await signOut(auth);
          setCurrentUser(null);
          setCurrentUserProfile(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setCurrentUser(user);
        await fetchUserProfileAndRole(user);
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth, enabled]);

  // Log to loginHistory collection
  const logLoginEvent = async (user: User) => {
    if (!db) return;
    try {
      const emailLower = user.email?.toLowerCase() || '';
      
      // Determine employee name for log
      let name = 'System User';
      let role = 'Employee';
      const empDocRef = doc(db, 'employees', emailLower);
      const empSnap = await getDoc(empDocRef);
      if (empSnap.exists()) {
        const d = empSnap.data();
        name = d.fullName || name;
        role = d.role || role;
      }

      await addDoc(collection(db, 'loginHistory'), {
        userId: user.uid,
        email: emailLower,
        fullName: name,
        role: role,
        timestamp: new Date().toISOString(),
        deviceInfo: navigator.userAgent
      });
    } catch (e) {
      console.warn('Logging login event skipped or failed:', e);
    }
  };

  const login = async (email: string, password: string) => {
    if (!enabled || !auth) throw new Error('Firebase Auth is not enabled');
    setError(null);
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@weehur.com.sg')) {
      const msg = 'Access Denied. Only weehur domain (@weehur.com.sg) users are authorized to log in.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      // 1. Try regular Firebase Auth first
      const result = await signInWithEmailAndPassword(auth, emailLower, password);
      
      // Save password in Firestore employee document as a fallback
      try {
        if (db) {
          await setDoc(doc(db, 'employees', emailLower), { password: password }, { merge: true });
        }
      } catch (dbErr) {
        console.warn('Could not cache password to Firestore:', dbErr);
      }

      // Clear any stale local session
      localStorage.removeItem('weehur_local_session');

      // Log login event
      await logLoginEvent(result.user);
      return;
    } catch (err: any) {
      console.warn('Firebase Auth login failed, attempting Firestore password verification fallback:', err);
      
      // 2. If Firebase Auth fails (or Email/Password provider is disabled in Firebase Console), fallback to Firestore password verification
      if (db) {
        try {
          const empDocRef = doc(db, 'employees', emailLower);
          let empSnap = await getDoc(empDocRef);
          
          // Auto-bootstrap super admin profile if first time
          const isSuperAdmin = emailLower === 'chakra@weehur.com.sg';
          if (!empSnap.exists() && isSuperAdmin) {
            const defaultAdmin: Employee = {
              id: emailLower,
              employeeId: 'WH-ADMIN',
              fullName: 'Chakravarthy',
              photoUrl: '',
              email: emailLower,
              phone: '+65 6250 1234',
              designation: 'Managing Director',
              department: 'Management',
              company: 'WeeHur Construction',
              workSites: ['Site A', 'Site B', 'Site C', 'Site D'],
              status: 'Active',
              dateJoined: '2020-01-01',
              role: 'Admin'
            };
            await setDoc(empDocRef, defaultAdmin);
            empSnap = await getDoc(empDocRef);
          }

          if (empSnap.exists()) {
            const empData = empSnap.data() as Employee;
            
            // Check if account status is active
            if (empData.status !== 'Active') {
              const msg = 'This account is no longer active. Please contact an Administrator.';
              setError(msg);
              throw new Error(msg);
            }

            // Case A: Password already set in Firestore
            if (empData.password) {
              if (empData.password === password) {
                const simulatedUser = {
                  uid: emailLower,
                  email: emailLower,
                  displayName: empData.fullName,
                } as any;

                localStorage.setItem('weehur_local_session', JSON.stringify(simulatedUser));
                setCurrentUser(simulatedUser);
                await fetchUserProfileAndRole(simulatedUser);
                return; // Successful login!
              } else {
                const msg = 'Invalid email or password.';
                setError(msg);
                throw new Error(msg);
              }
            } 
            // Case B: Password not set yet for this pre-registered account (first login attempt on Sign In tab)
            else if (password && password.length >= 6) {
              await setDoc(empDocRef, { password: password }, { merge: true });
              const simulatedUser = {
                uid: emailLower,
                email: emailLower,
                displayName: empData.fullName,
              } as any;

              localStorage.setItem('weehur_local_session', JSON.stringify(simulatedUser));
              setCurrentUser(simulatedUser);
              await fetchUserProfileAndRole(simulatedUser);
              return; // Successful login!
            } else {
              const msg = 'Password must be at least 6 characters long.';
              setError(msg);
              throw new Error(msg);
            }
          } else {
            const msg = 'This email address is not pre-registered in our Employee Database. Please contact HR or an Administrator.';
            setError(msg);
            throw new Error(msg);
          }
        } catch (fbErr: any) {
          if (fbErr.message && !fbErr.message.includes('Firebase Auth')) {
            setError(fbErr.message);
            throw fbErr;
          }
        }
      }

      let msg = 'Invalid email or password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    // Clear local session first
    localStorage.removeItem('weehur_local_session');
    setCurrentUser(null);
    setCurrentUserProfile(null);
    setIsAdmin(false);

    if (!enabled || !auth) return;
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    if (!enabled || !auth) throw new Error('Firebase Auth is not enabled');
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@weehur.com.sg')) {
      throw new Error('Access Denied. Only weehur domain (@weehur.com.sg) users can reset password.');
    }
    try {
      await sendPasswordResetEmail(auth, emailLower);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const resetPasswordLocal = async (email: string, newPassword: string) => {
    if (!db) throw new Error('Database is offline');
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@weehur.com.sg')) {
      throw new Error('Access Denied. Only weehur domain (@weehur.com.sg) users can reset password.');
    }
    
    // Confirm they are pre-registered
    const empDocRef = doc(db, 'employees', emailLower);
    const snap = await getDoc(empDocRef);
    if (!snap.exists()) {
      throw new Error('This email address is not pre-registered in our Employee Database.');
    }

    const empData = snap.data() as Employee;
    if (empData.status !== 'Active') {
      throw new Error('This account is no longer active. Password reset disabled.');
    }

    try {
      // Update Firestore cached password
      await setDoc(empDocRef, { password: newPassword }, { merge: true });

      // Auto-login user immediately with session
      const simulatedUser = {
        uid: emailLower,
        email: emailLower,
        displayName: empData.fullName,
      } as any;

      localStorage.setItem('weehur_local_session', JSON.stringify(simulatedUser));
      setCurrentUser(simulatedUser);
      await fetchUserProfileAndRole(simulatedUser);
    } catch (err: any) {
      throw new Error('Failed to reset password: ' + err.message);
    }
  };

  // Verify that the email is pre-registered in employee DB
  const verifyPreRegisteredEmail = async (email: string): Promise<Employee | null> => {
    if (!db) throw new Error('Database is offline');
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@weehur.com.sg')) {
      throw new Error('Access Denied. Only weehur domain (@weehur.com.sg) users are authorized.');
    }
    const isSuperAdmin = emailLower === 'chakra@weehur.com.sg';
    const empDocRef = doc(db, 'employees', emailLower);
    const snap = await getDoc(empDocRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as Employee;
    } else if (isSuperAdmin) {
      // Create and return default super admin profile in Firestore so they can proceed
      const defaultAdmin: Employee = {
        id: emailLower,
        employeeId: 'WH-ADMIN',
        fullName: 'Super Admin',
        photoUrl: '',
        email: emailLower,
        phone: '+65 6250 1234',
        designation: 'Managing Director',
        department: 'Management',
        company: 'WeeHur Construction',
        workSites: ['Site A', 'Site B', 'Site C', 'Site D'],
        status: 'Active',
        dateJoined: '2020-01-01',
        role: 'Admin'
      };
      await setDoc(empDocRef, defaultAdmin);
      return defaultAdmin;
    }
    return null;
  };

  // Create real password on firebase auth for pre-registered email
  const signUpFirstTime = async (email: string, password: string) => {
    if (!enabled || !auth) throw new Error('Authentication is offline');
    const emailLower = email.trim().toLowerCase();
    if (!emailLower.endsWith('@weehur.com.sg')) {
      throw new Error('Access Denied. Only weehur domain (@weehur.com.sg) users are authorized.');
    }
    
    // 1. Confirm they are pre-registered
    const employee = await verifyPreRegisteredEmail(emailLower);
    if (!employee) {
      throw new Error('This email address is not pre-registered in our Employee Database. Please contact HR or your system Administrator.');
    }

    if (employee.status !== 'Active') {
      throw new Error('This employee account is not active. First-time registration is disabled.');
    }

    // Always cache the password directly on the Firestore employee record so we have a local fallback if Auth is disabled
    try {
      if (db) {
        await setDoc(doc(db, 'employees', emailLower), { password: password }, { merge: true });
      }
    } catch (dbErr: any) {
      console.warn('Failed to save password to Firestore:', dbErr);
    }

    try {
      // 2. Create the account in firebase auth
      const credential = await createUserWithEmailAndPassword(auth, emailLower, password);
      
      // 3. Write user details in users collection
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: emailLower,
        role: employee.role,
        createdAt: new Date().toISOString()
      });

      // Log the login event
      await logLoginEvent(credential.user);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('An account already exists for this email. If you forgot your password, please reset it.');
      }
      if (err.code === 'auth/operation-not-allowed') {
        // If Email/Password auth is disabled, we rely on Firestore password caching and auto-login
        console.warn('Firebase Email/Password Auth is disabled, relying on Firestore password caching.');
      } else {
        console.warn('Firebase Auth user creation error, falling back to database password session:', err);
      }
    }

    // Auto-login user immediately with session
    const simulatedUser = {
      uid: emailLower,
      email: emailLower,
      displayName: employee.fullName,
    } as any;

    localStorage.setItem('weehur_local_session', JSON.stringify(simulatedUser));
    setCurrentUser(simulatedUser);
    await fetchUserProfileAndRole(simulatedUser);
  };

  const loginWithGoogle = async () => {
    if (!enabled || !auth || !db) throw new Error('Authentication/Database is offline');
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      const emailLower = result.user.email?.toLowerCase() || '';
      if (!emailLower.endsWith('@weehur.com.sg')) {
        await signOut(auth);
        throw new Error('Access Denied. Only weehur domain (@weehur.com.sg) users are authorized.');
      }
      const isSuperAdmin = emailLower === 'chakra@weehur.com.sg';
      
      const empDocRef = doc(db, 'employees', emailLower);
      const empSnap = await getDoc(empDocRef);
      
      if (!empSnap.exists() && !isSuperAdmin) {
        await signOut(auth);
        throw new Error(`Your Google account (${result.user.email}) is not pre-registered in our Employee Database. Please contact HR.`);
      }
      
      if (!empSnap.exists() && isSuperAdmin) {
        const defaultAdmin: Employee = {
          id: emailLower,
          employeeId: 'WH-ADMIN',
          fullName: 'Super Admin',
          photoUrl: '',
          email: emailLower,
          phone: '+65 6250 1234',
          designation: 'Managing Director',
          department: 'Management',
          company: 'WeeHur Construction',
          workSites: ['Site A', 'Site B', 'Site C', 'Site D'],
          status: 'Active',
          dateJoined: '2020-01-01',
          role: 'Admin'
        };
        await setDoc(empDocRef, defaultAdmin);
      }
      
      // Write user details in users collection
      const userDocRef = doc(db, 'users', result.user.uid);
      await setDoc(userDocRef, {
        uid: result.user.uid,
        email: emailLower,
        role: isSuperAdmin ? 'Admin' : (empSnap.data() as Employee).role || 'Employee',
        createdAt: new Date().toISOString()
      }, { merge: true });

      await logLoginEvent(result.user);
    } catch (err: any) {
      console.error('Google login error:', err);
      const friendlyMsg = err.code === 'auth/popup-blocked'
        ? 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        : err.message;
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  const reloadUserProfile = async () => {
    if (currentUser) {
      await fetchUserProfileAndRole(currentUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      currentUserProfile,
      isAdmin,
      loading,
      error,
      login,
      logout,
      resetPassword,
      resetPasswordLocal,
      signUpFirstTime,
      verifyPreRegisteredEmail,
      loginWithGoogle,
      reloadUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
