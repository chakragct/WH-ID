export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface Employee {
  id: string; // Document ID / Email
  employeeId: string; // custom ID like EMP-001
  fullName: string;
  photoUrl: string;
  email: string;
  phone?: string;
  designation: string;
  department?: string;
  company?: string;
  workSites: string[]; // Assigned sites (e.g. ['Site A', 'Site B'])
  status: 'Active' | 'Resigned';
  dateJoined: string; // Date of Employment
  lastDateOfWork?: string; // Optional last day of work for resigned employees
  emergencyContact?: EmergencyContact;
  bloodGroup?: string;
  nationality?: string;
  qrCodeDataUrl?: string; // Cacheable QR code data URI
  role: 'Admin' | 'Employee';
  password?: string; // Backup local password for fallback auth
  createdAt?: string;
  dateJoinedProject?: string; // Date joined to project / site
  remarks?: string; // Remarks field
}

export interface UserRoleRecord {
  uid: string;
  email: string;
  role: 'Admin' | 'Employee';
  createdAt: string;
}

export interface WorkSite {
  id: string;
  name: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string; // ISO String
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  timestamp: string; // ISO String
  deviceInfo: string;
}
