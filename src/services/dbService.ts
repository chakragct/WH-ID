import { 
  collection, 
  doc, 
  getDoc,
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
  const allDocs = snap.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as Employee & { docId: string }));

  // In-memory deduplication map by normalized identity
  const uniqueMap = new Map<string, Employee>();

  for (const emp of allDocs) {
    const rawEmail = (emp.email || emp.id || '').trim().toLowerCase();
    // Normalize email by stripping _1, _2 suffixes if name matches
    const baseEmail = rawEmail.replace(/_\d+@/, '@');
    const nameKey = (emp.fullName || '').trim().toLowerCase();
    const empIdKey = (emp.employeeId || '').trim().toLowerCase();

    // Secondary key for fallback matching if email is dynamic
    const compositeKey = nameKey && empIdKey && empIdKey.startsWith('wh-')
      ? `id:${empIdKey}`
      : baseEmail || `name:${nameKey}`;

    if (!uniqueMap.has(compositeKey) && !uniqueMap.has(rawEmail)) {
      uniqueMap.set(rawEmail, emp);
    } else {
      // Merge records if the existing record lacks data
      const existingKey = uniqueMap.has(compositeKey) ? compositeKey : rawEmail;
      const existing = uniqueMap.get(existingKey);
      if (existing) {
        const merged: Employee = {
          ...existing,
          photoUrl: existing.photoUrl || emp.photoUrl || '',
          phone: (existing.phone && existing.phone !== '-') ? existing.phone : emp.phone || '-',
          designation: existing.designation || emp.designation || 'Staff',
          department: existing.department || emp.department || 'General',
          company: existing.company || emp.company || 'WeeHur Construction',
          workSites: Array.from(new Set([...(existing.workSites || []), ...(emp.workSites || [])])),
          role: existing.role === 'Admin' || emp.role === 'Admin' ? 'Admin' : existing.role || 'Employee',
          status: existing.status === 'Active' ? 'Active' : emp.status || 'Active'
        };
        uniqueMap.set(existingKey, merged);
      }
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Sweeps the Firestore employees collection, finds duplicate records (by email, ID, or name),
 * merges their data, and permanently deletes redundant duplicate documents from Firestore.
 */
export async function cleanAndDeduplicateEmployees(): Promise<{ removedCount: number; remainingCount: number }> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'employees'));
  
  if (snap.empty) {
    return { removedCount: 0, remainingCount: 0 };
  }

  const rawEmployees = snap.docs.map(d => ({
    refId: d.id,
    data: d.data() as Employee
  }));

  // Grouping map by primary identity
  const groups = new Map<string, typeof rawEmployees>();

  for (const item of rawEmployees) {
    const emailLower = (item.data.email || item.refId || '').trim().toLowerCase();
    // Strip import deduplication suffixes like _1, _2
    const baseEmail = emailLower.replace(/_\d+@/, '@');
    const nameLower = (item.data.fullName || '').trim().toLowerCase();
    const empIdLower = (item.data.employeeId || '').trim().toLowerCase();

    // Form group key
    let key = baseEmail;
    if (nameLower && empIdLower && empIdLower.startsWith('wh-')) {
      key = `empid:${empIdLower}`;
    } else if (nameLower && !baseEmail) {
      key = `name:${nameLower}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  let removedCount = 0;

  for (const [key, items] of groups.entries()) {
    if (items.length > 1) {
      // Sort items to pick the best master document to retain
      items.sort((a, b) => {
        // 1. Prefer document whose refId matches clean email without _
        const aClean = a.refId.toLowerCase() === (a.data.email || '').toLowerCase() && !a.refId.includes('_');
        const bClean = b.refId.toLowerCase() === (b.data.email || '').toLowerCase() && !b.refId.includes('_');
        if (aClean && !bClean) return -1;
        if (!aClean && bClean) return 1;

        // 2. Prefer Admin role
        if (a.data.role === 'Admin' && b.data.role !== 'Admin') return -1;
        if (a.data.role !== 'Admin' && b.data.role === 'Admin') return 1;

        // 3. Prefer items with photoUrl
        if (a.data.photoUrl && !b.data.photoUrl) return -1;
        if (!a.data.photoUrl && b.data.photoUrl) return 1;

        // 4. Prefer items with longer/more workSites
        const aSites = a.data.workSites?.length || 0;
        const bSites = b.data.workSites?.length || 0;
        return bSites - aSites;
      });

      const keeper = items[0];
      const duplicates = items.slice(1);

      // Merge any missing fields into keeper
      const mergedSites = new Set(keeper.data.workSites || []);
      let updatedKeeperNeeded = false;
      const updates: Partial<Employee> = {};

      for (const dup of duplicates) {
        if (dup.data.workSites) {
          dup.data.workSites.forEach(s => mergedSites.add(s));
        }
        if (!keeper.data.photoUrl && dup.data.photoUrl) {
          updates.photoUrl = dup.data.photoUrl;
          updatedKeeperNeeded = true;
        }
        if ((!keeper.data.phone || keeper.data.phone === '-') && dup.data.phone && dup.data.phone !== '-') {
          updates.phone = dup.data.phone;
          updatedKeeperNeeded = true;
        }
      }

      if (mergedSites.size > (keeper.data.workSites?.length || 0)) {
        updates.workSites = Array.from(mergedSites);
        updatedKeeperNeeded = true;
      }

      if (updatedKeeperNeeded) {
        await updateDoc(doc(db, 'employees', keeper.refId), updates);
      }

      // Delete all duplicate documents from Firestore
      for (const dup of duplicates) {
        try {
          await deleteDoc(doc(db, 'employees', dup.refId));
          removedCount++;
        } catch (err) {
          console.warn(`Could not delete duplicate staff doc ${dup.refId}:`, err);
        }
      }
    }
  }

  const finalSnap = await getDocs(collection(db, 'employees'));
  return { removedCount, remainingCount: finalSnap.size };
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
  
  let qrUrl = '';
  try {
    qrUrl = await generateEmployeeQRCode(`https://weehur-verify.web.app/verify?email=${encodeURIComponent(emailLower)}`);
  } catch (e) {
    console.warn('QR Code generation fallback:', e);
  }

  const cleanedEmployee = cleanUndefined(employee);

  await setDoc(doc(db, 'employees', emailLower), {
    ...cleanedEmployee,
    id: emailLower,
    email: emailLower,
    qrCodeDataUrl: qrUrl,
    createdAt: new Date().toISOString()
  });
}

export async function updateEmployee(originalEmail: string, updates: Partial<Employee>): Promise<void> {
  const db = getDb();
  const oldEmailLower = (originalEmail || '').trim().toLowerCase();
  const cleanedUpdates = cleanUndefined(updates);
  const newEmailLower = (cleanedUpdates.email || oldEmailLower).trim().toLowerCase();

  let qrUrl = updates.qrCodeDataUrl || '';
  if (!qrUrl && newEmailLower) {
    try {
      qrUrl = await generateEmployeeQRCode(`https://weehur-verify.web.app/verify?email=${encodeURIComponent(newEmailLower)}`);
    } catch (e) {
      console.warn('QR Code generation fallback:', e);
    }
  }

  if (newEmailLower !== oldEmailLower && oldEmailLower.length > 0) {
    const oldDocRef = doc(db, 'employees', oldEmailLower);
    const oldSnap = await getDoc(oldDocRef);
    const oldData = oldSnap.exists() ? oldSnap.data() : {};

    const newDocRef = doc(db, 'employees', newEmailLower);
    await setDoc(newDocRef, {
      ...oldData,
      ...cleanedUpdates,
      id: newEmailLower,
      email: newEmailLower,
      qrCodeDataUrl: qrUrl || oldData.qrCodeDataUrl || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (oldSnap.exists()) {
      try {
        await deleteDoc(oldDocRef);
      } catch (e) {
        console.warn('Could not delete old employee doc:', e);
      }
    }
  } else {
    const targetDocRef = doc(db, 'employees', newEmailLower);
    await setDoc(targetDocRef, {
      ...cleanedUpdates,
      id: newEmailLower,
      email: newEmailLower,
      qrCodeDataUrl: qrUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}

export async function deleteEmployee(identifier: string): Promise<void> {
  const db = getDb();
  if (!identifier) return;
  const target = identifier.trim();
  const targetLower = target.toLowerCase();

  const docsToDelete = new Set<string>();
  docsToDelete.add(target);
  docsToDelete.add(targetLower);

  // Scan collection to match by docId, email, id, employeeId, or fullName
  try {
    const snap = await getDocs(collection(db, 'employees'));
    snap.docs.forEach(d => {
      const data = d.data();
      const docIdLower = d.id.trim().toLowerCase();
      const emailLower = (data.email || '').trim().toLowerCase();
      const idLower = (data.id ? String(data.id) : '').trim().toLowerCase();
      const empIdLower = (data.employeeId || '').trim().toLowerCase();
      const nameLower = (data.fullName || '').trim().toLowerCase();

      if (
        docIdLower === targetLower ||
        d.id.trim() === target ||
        emailLower === targetLower ||
        idLower === targetLower ||
        (empIdLower && empIdLower === targetLower) ||
        (nameLower && nameLower === targetLower)
      ) {
        docsToDelete.add(d.id);
      }
    });
  } catch (err) {
    console.warn('Could not scan employees collection during single delete:', err);
  }

  for (const docId of docsToDelete) {
    try {
      await deleteDoc(doc(db, 'employees', docId));
    } catch (e) {
      console.warn(`Could not delete employee doc ${docId}:`, e);
    }
  }
}

export async function deleteEmployeesBatch(identifiers: string[]): Promise<number> {
  const db = getDb();
  if (!identifiers || identifiers.length === 0) return 0;

  const targetSet = new Set<string>();
  identifiers.forEach(id => {
    if (id && id.trim()) {
      targetSet.add(id.trim().toLowerCase());
      targetSet.add(id.trim());
    }
  });

  const docsToDelete = new Set<string>();

  // Add direct IDs
  identifiers.forEach(id => {
    if (id && id.trim()) {
      docsToDelete.add(id.trim().toLowerCase());
      docsToDelete.add(id.trim());
    }
  });

  // Query and match across documents in collection
  try {
    const snap = await getDocs(collection(db, 'employees'));
    snap.docs.forEach(d => {
      const data = d.data();
      const docIdLower = d.id.trim().toLowerCase();
      const emailLower = (data.email || '').trim().toLowerCase();
      const idLower = (data.id ? String(data.id) : '').trim().toLowerCase();
      const empIdLower = (data.employeeId || '').trim().toLowerCase();
      const nameLower = (data.fullName || '').trim().toLowerCase();

      if (
        targetSet.has(docIdLower) ||
        targetSet.has(d.id.trim()) ||
        targetSet.has(emailLower) ||
        targetSet.has(idLower) ||
        (empIdLower && targetSet.has(empIdLower)) ||
        (nameLower && targetSet.has(nameLower))
      ) {
        docsToDelete.add(d.id);
      }
    });
  } catch (err) {
    console.warn('Error querying employee docs during batch delete:', err);
  }

  let deletedCount = 0;
  for (const docId of docsToDelete) {
    try {
      await deleteDoc(doc(db, 'employees', docId));
      deletedCount++;
    } catch (err) {
      console.warn(`Failed to delete employee doc ${docId}:`, err);
    }
  }

  return deletedCount;
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

export async function updateAnnouncement(announcementId: string, title: string, content: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'announcements', announcementId), {
    title,
    content
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
