export interface Employee {
  id: string; // Document ID / Auth UID if mapped
  employeeId: string; // e.g., 'WH1234'
  fullName: string;
  designation: string;
  department?: string;
  mobile: string;
  email: string;
  site: string;
  nationality: string;
  dateOfJoining: string;
  emergencyContact: string;
  photoUrl: string;
  qrCodeUrl: string;
  activeStatus: boolean;
  isAdmin?: boolean;
}

export interface AppSettings {
  darkMode: boolean;
  offlineCache: boolean;
  notificationsEnabled: boolean;
}
