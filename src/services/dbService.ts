import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { Employee, WorkSite, Announcement, LoginHistoryEntry } from '../types';
import { generateEmployeeQRCode } from '../utils/qr';

// Helper to get db instance safely
function getDb() {
  const { db, enabled } = initializeFirebase();
  if (!enabled || !db) {
    throw new Error('Firestore connection is not initialized');
  }
  return db;
}

/**
 * Automatically seeds initial work sites, announcements, and default employees if the database is empty.
 */
export async function seedDatabaseIfEmpty() {
  try {
    const db = getDb();
    
    // Check if sites exist
    const sitesCollection = collection(db, 'sites');
    const sitesSnap = await getDocs(sitesCollection);
    
    if (sitesSnap.empty) {
      console.log('Seeding initial sites...');
      const defaultSites = ['Site A', 'Site B', 'Site C', 'Site D'];
      for (const siteName of defaultSites) {
        const docId = siteName.replace(/\s+/g, '-').toLowerCase();
        await setDoc(doc(db, 'sites', docId), {
          id: docId,
          name: siteName,
          createdAt: new Date().toISOString()
        });
      }

      // Check if announcements exist
      const announcementsCol = collection(db, 'announcements');
      console.log('Seeding initial announcements...');
      const defaultAnnouncements = [
        {
          title: 'Welcome to the New Employee Portal',
          content: 'We are thrilled to launch our upgraded employee portal featuring digital ID cards, QR status codes, multi-site permissions, and dark mode. Please keep your profile updated.',
          authorName: 'Corporate HR',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Mandatory Site Safety Briefing',
          content: 'All engineers and supervisors across Site A and Site B must attend the bi-weekly safety review at 09:00 AM this Friday. Safety remains our utmost priority.',
          authorName: 'Safety Committee',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
        }
      ];
      for (const ann of defaultAnnouncements) {
        await addDoc(announcementsCol, ann);
      }

      // Seed a few default active staff members so the app looks professional on first load
      console.log('Seeding initial employees...');
      const defaultEmployees: Omit<Employee, 'qrCodeDataUrl'>[] = [
        {
          id: 'jane.doe@weehur.com.sg',
          employeeId: 'WH-0402',
          fullName: 'Jane Doe',
          photoUrl: '',
          email: 'jane.doe@weehur.com.sg',
          phone: '+65 9123 4567',
          designation: 'Senior Project Engineer',
          department: 'Construction',
          company: 'WeeHur Construction',
          workSites: ['Site A'],
          status: 'Active',
          dateJoined: '2021-03-15',
          role: 'Employee'
        },
        {
          id: 'marcus.tan@weehur.com.sg',
          employeeId: 'WH-0821',
          fullName: 'Marcus Tan',
          photoUrl: '',
          email: 'marcus.tan@weehur.com.sg',
          phone: '+65 8234 5678',
          designation: 'Safety Supervisor',
          department: 'Health & Safety',
          company: 'WeeHur Construction',
          workSites: ['Site B', 'Site C'],
          status: 'Active',
          dateJoined: '2022-06-01',
          role: 'Employee'
        },
        {
          id: 'sarah.lim@weehur.com.sg',
          employeeId: 'WH-0312',
          fullName: 'Sarah Lim',
          photoUrl: '',
          email: 'sarah.lim@weehur.com.sg',
          phone: '+65 9345 6789',
          designation: 'Site Administrator',
          department: 'Operations',
          company: 'WeeHur Construction',
          workSites: ['Site A', 'Site D'],
          status: 'Active',
          dateJoined: '2023-01-10',
          role: 'Employee'
        }
      ];

      for (const emp of defaultEmployees) {
        const qrUrl = await generateEmployeeQRCode(emp.email);
        await setDoc(doc(db, 'employees', emp.email), {
          ...emp,
          qrCodeDataUrl: qrUrl
        });
      }
      
      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.warn('Seeding skipped or encountered error:', error);
  }
}

// ---------------- SITES MANAGEMENT ----------------

export async function fetchSites(): Promise<WorkSite[]> {
  const db = getDb();
  const sitesSnap = await getDocs(collection(db, 'sites'));
  return sitesSnap.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as WorkSite));
}

export async function addWorkSite(id: string, name: string): Promise<void> {
  const db = getDb();
  const docId = id.replace(/\s+/g, '-').toLowerCase();
  await setDoc(doc(db, 'sites', docId), {
    id: docId,
    name: name,
    createdAt: new Date().toISOString()
  });
}

export async function editWorkSite(docId: string, name: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'sites', docId), {
    name: name
  });
}

export async function deleteWorkSite(docId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'sites', docId));
}

// ---------------- EMPLOYEES DATABASE ----------------

export async function fetchAllEmployees(): Promise<Employee[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'employees'));
  return snap.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as Employee));
}

// Helper to clean undefined properties from objects to prevent Firestore from throwing errors
function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = cleanUndefined(val);
    }
  }
  return cleaned;
}

export async function addEmployee(employee: Omit<Employee, 'id' | 'qrCodeDataUrl'>): Promise<void> {
  const db = getDb();
  const emailLower = employee.email.trim().toLowerCase();
  
  // Create an automatic QR Code Data URL containing their core verification URL
  // We can write their verification status into the QR content
  const verificationPayload = `https://weehur-verify.web.app/verify?email=${encodeURIComponent(emailLower)}`;
  const qrUrl = await generateEmployeeQRCode(verificationPayload);

  const cleanedEmployee = cleanUndefined(employee);

  await setDoc(doc(db, 'employees', emailLower), {
    ...cleanedEmployee,
    id: emailLower,
    email: emailLower,
    qrCodeDataUrl: qrUrl,
    createdAt: new Date().toISOString()
  });
}

export async function updateEmployee(email: string, updates: Partial<Employee>): Promise<void> {
  const db = getDb();
  const emailLower = email.trim().toLowerCase();
  const cleanedUpdates = cleanUndefined(updates);
  
  // If the email is being changed, it would create a new doc, so we handle it gracefully:
  if (cleanedUpdates.email && cleanedUpdates.email.toLowerCase() !== emailLower) {
    // Usually email shouldn't be altered, but if it is:
    const newEmailLower = cleanedUpdates.email.trim().toLowerCase();
    const qrUrl = await generateEmployeeQRCode(`https://weehur-verify.web.app/verify?email=${encodeURIComponent(newEmailLower)}`);
    
    // Copy content
    const currentSnap = await getDocs(query(collection(db, 'employees'), where('email', '==', emailLower)));
    if (!currentSnap.empty) {
      const currentData = currentSnap.docs[0].data();
      await setDoc(doc(db, 'employees', newEmailLower), {
        ...currentData,
        ...cleanedUpdates,
        id: newEmailLower,
        email: newEmailLower,
        qrCodeDataUrl: qrUrl
      });
      await deleteDoc(doc(db, 'employees', emailLower));
    }
  } else {
    await updateDoc(doc(db, 'employees', emailLower), cleanedUpdates);
  }
}

export async function deleteEmployee(email: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'employees', email.toLowerCase()));
}

// ---------------- ANNOUNCEMENTS ----------------

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const db = getDb();
  const q = query(collection(db, 'announcements'));
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as Announcement));
  
  // Sort descending manually to avoid needing complex Firestore indices immediately
  return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addAnnouncement(title: string, content: string, authorName: string): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, 'announcements'), {
    title,
    content,
    authorName,
    createdAt: new Date().toISOString()
  });
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, 'announcements', announcementId));
}

// ---------------- LOGIN HISTORY ----------------

export async function fetchLoginHistory(): Promise<LoginHistoryEntry[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'loginHistory'));
  const data = snap.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as LoginHistoryEntry));

  // Sort descending
  return data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
}
