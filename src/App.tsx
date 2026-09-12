import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  MapPin, 
  FileText, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  LogOut, 
  Download, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  LayoutDashboard, 
  CheckCircle2, 
  PlusCircle, 
  ChevronRight, 
  AlertTriangle,
  User,
  Activity,
  UserCheck,
  UserX,
  Megaphone,
  Briefcase,
  Smartphone,
  Mail,
  Lock,
  Compass,
  ArrowRight,
  Heart,
  Globe,
  FileSpreadsheet,
  ArrowLeft,
  Home,
  Trash2,
  Phone,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Edit3,
  Table,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  LabelList
} from 'recharts';

import { AuthProvider, useAuth } from './context/AuthContext';
import { initializeFirebase } from './lib/firebase';
import { 
  fetchSites, 
  addWorkSite, 
  editWorkSite,
  deleteWorkSite,
  fetchAllEmployees, 
  addEmployee, 
  updateEmployee, 
  deleteEmployee, 
  deleteEmployeesBatch,
  cleanAndDeduplicateEmployees,
  fetchAnnouncements, 
  addAnnouncement, 
  updateAnnouncement,
  deleteAnnouncement,
  fetchLoginHistory,
  seedDatabaseIfEmpty
} from './services/dbService';
import { Employee, WorkSite, Announcement, LoginHistoryEntry } from './types';
import { exportEmployeesToCSV } from './utils/export';
import { formatDateValue, displayFormattedDate } from './utils/dateUtils';
import DigitalIDCard from './components/DigitalIDCard';
import AddEmployeeModal from './components/AddEmployeeModal';
import AddSiteModal from './components/AddSiteModal';
import AddAnnouncementModal from './components/AddAnnouncementModal';
import { FormattedAnnouncement } from './components/FormattedAnnouncement';
import { CoworkersModal } from './components/CoworkersModal';
import { WeeHurLogo } from './components/WeeHurLogo';
import { ConfirmDeleteModal, StaffDeleteItem } from './components/ConfirmDeleteModal';
import { ToastNotification, ToastState } from './components/ToastNotification';
import * as XLSX from 'xlsx';

// Active route tabs in Portal
type ActiveTab = 'dashboard' | 'directory' | 'sites' | 'announcements' | 'audit';

function AppContent() {
  const { 
    currentUser, 
    currentUserProfile, 
    isAdmin, 
    isSuperAdmin,
    canEdit,
    loading, 
    login, 
    logout, 
    resetPassword, 
    resetPasswordLocal,
    signUpFirstTime,
    verifyPreRegisteredEmail,
    loginWithGoogle,
    reloadUserProfile
  } = useAuth();

  // Theme support
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('weehur_theme');
    return saved === 'dark';
  });

  // Responsive sidebar toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Core synchronized Firestore state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<WorkSite[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState<'All' | 'Active' | 'Resigned'>('All');
  const [directoryViewMode, setDirectoryViewMode] = useState<'table' | 'cards'>('table');

  // Admin Modals state
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);

  // Selected staff for batch deletion
  const [selectedStaffForDelete, setSelectedStaffForDelete] = useState<string[]>([]);

  // In-app Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    items: StaffDeleteItem[];
    isLoading: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    items: [],
    isLoading: false,
    onConfirm: async () => {}
  });

  // Global In-App Toast notification State
  const [toastState, setToastState] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastState({ show: true, type, message });
    setTimeout(() => {
      setToastState(null);
    }, 4500);
  };

  // Helper to reliably check if a staff member is selected (by email, id, employeeId, or fullName)
  const isStaffSelected = (emp: Employee) => {
    return selectedStaffForDelete.some(s => {
      const lower = s.trim().toLowerCase();
      return (emp.email && emp.email.trim().toLowerCase() === lower) ||
             (emp.id && emp.id.trim().toLowerCase() === lower) ||
             (emp.fullName && emp.fullName.trim().toLowerCase() === lower) ||
             (emp.employeeId && emp.employeeId.trim().toLowerCase() === lower);
    });
  };

  // Expandable staff cards state
  const [expandedStaffEmails, setExpandedStaffEmails] = useState<string[]>([]);

  const toggleExpandStaff = (email: string) => {
    setExpandedStaffEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleExpandAllStaff = () => {
    const allEmails = filteredEmployeesForActiveUser.map(e => e.email);
    if (expandedStaffEmails.length >= allEmails.length && allEmails.length > 0) {
      setExpandedStaffEmails([]);
    } else {
      setExpandedStaffEmails(allEmails);
    }
  };

  // Selected colleague profile details modal
  const [selectedColleague, setSelectedColleague] = useState<Employee | null>(null);
  const [isCoworkersModalOpen, setIsCoworkersModalOpen] = useState(false);

  // Selected site for staff list display on chart click
  const [selectedSiteForStaffList, setSelectedSiteForStaffList] = useState<string | null>(null);

  // Dashboard Resigned & Active Staff toggles
  const [showResignedList, setShowResignedList] = useState(false);
  const [showActiveList, setShowActiveList] = useState(false);

  // Helper to verify if an employee has a custom uploaded photo
  const hasValidPhoto = (url?: string) => Boolean(url && url.trim() !== '' && !url.includes('unsplash.com'));

  // Authentication UI Modes: 'signin' | 'firsttime' | 'forgot'
  const [authMode, setAuthMode] = useState<'signin' | 'firsttime' | 'forgot'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authVerifyLoading, setAuthVerifyLoading] = useState(false);
  const [authVerifiedEmployee, setAuthVerifiedEmployee] = useState<Employee | null>(null);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load and bootstrap database
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await seedDatabaseIfEmpty();
        await loadAllData();
      } catch (err) {
        console.warn('Initialization warnings:', err);
      }
    };
    bootstrap();
  }, [currentUser]);

  // Sync core stylesheet themes
  useEffect(() => {
    localStorage.setItem('weehur_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [isDeduplicating, setIsDeduplicating] = useState(false);

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const { enabled } = initializeFirebase();
      if (!enabled) return;

      // Silently clean up any duplicate records in Firestore if present
      cleanAndDeduplicateEmployees().catch(err => console.warn('Auto deduplication check:', err));

      const loadedSites = await fetchSites();
      setSites(loadedSites);

      const loadedEmployees = await fetchAllEmployees();
      
      // Ensure dates are properly formatted and superadmin profile is synced
      const syncedEmployees = loadedEmployees.map(emp => {
        const dateJoined = formatDateValue(emp.dateJoined) || emp.dateJoined;
        const dateJoinedProject = emp.dateJoinedProject ? formatDateValue(emp.dateJoinedProject) : undefined;
        const lastDateOfWork = emp.lastDateOfWork ? formatDateValue(emp.lastDateOfWork) : undefined;

        let formattedEmp = { ...emp, dateJoined, dateJoinedProject, lastDateOfWork };

        if (emp.email.toLowerCase() === 'chakra@weehur.com.sg') {
          if (emp.role !== 'Admin') {
            formattedEmp = { ...formattedEmp, role: 'Admin' as const };
          }
        }
        return formattedEmp;
      });

      setEmployees(syncedEmployees);

      const loadedAnnouncements = await fetchAnnouncements();
      setAnnouncements(loadedAnnouncements);

      if (isAdmin) {
        const loadedHistory = await fetchLoginHistory();
        setLoginHistory(loadedHistory);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    setIsDeduplicating(true);
    try {
      const res = await cleanAndDeduplicateEmployees();
      await loadAllData();
      if (res.removedCount > 0) {
        alert(`Deduplication successful! Removed ${res.removedCount} duplicate staff entry/entries from Firestore. ${res.remainingCount} unique staff remain.`);
      } else {
        alert(`No duplicate staff records found. All ${res.remainingCount} staff entries are clean and unique!`);
      }
    } catch (err: any) {
      console.error('Error removing duplicate staff:', err);
      alert(`Failed to remove duplicates: ${err?.message || err}`);
    } finally {
      setIsDeduplicating(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    try {
      await login(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Login failed.' });
    }
  };

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setAuthFeedback(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Google Sign-In failed.' });
    }
  };

  // First-time signup verification handler
  const handleVerifyEmailForSetup = async () => {
    setAuthFeedback(null);
    if (!authEmail.trim()) {
      setAuthFeedback({ type: 'error', text: 'Please enter your registered email.' });
      return;
    }
    setAuthVerifyLoading(true);
    try {
      const emp = await verifyPreRegisteredEmail(authEmail.toLowerCase().trim());
      if (emp) {
        if (emp.status !== 'Active') {
          setAuthFeedback({ type: 'error', text: 'This employee profile is no longer active. Please contact your system Administrator.' });
        } else {
          setAuthVerifiedEmployee(emp);
          setAuthFeedback({ type: 'success', text: `Pre-registered employee found: "${emp.fullName}". Please set a strong login password.` });
        }
      } else {
        setAuthFeedback({ type: 'error', text: 'Email not found in Employee Database. Employee profiles must be pre-registered by an Admin.' });
      }
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setAuthVerifyLoading(false);
    }
  };

  // Execute password creation setup
  const handleFirstTimeSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    if (!authPassword.trim() || authPassword.length < 6) {
      setAuthFeedback({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    try {
      await signUpFirstTime(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
      setAuthVerifiedEmployee(null);
      setAuthMode('signin');
      setAuthFeedback({ type: 'success', text: 'Account registered and password created! Redirecting to Portal...' });
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Registration failed.' });
    }
  };

  // Forgot password trigger
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    try {
      await resetPassword(authEmail.trim());
      setAuthFeedback({ type: 'success', text: 'Password reset link dispatched to your email! Please check spam or promotions.' });
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Failed to dispatch reset email.' });
    }
  };

  // Execute password reset local setup
  const handleForgotPasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    if (!authPassword.trim() || authPassword.length < 6) {
      setAuthFeedback({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    try {
      await resetPasswordLocal(authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
      setAuthVerifiedEmployee(null);
      setAuthMode('signin');
      setAuthFeedback({ type: 'success', text: 'Password reset successfully! You can now log in using your new password.' });
    } catch (err: any) {
      setAuthFeedback({ type: 'error', text: err.message || 'Reset failed.' });
    }
  };

  // Save/Edit Employee handler
  const handleSaveEmployee = async (data: Omit<Employee, 'id' | 'qrCodeDataUrl'>) => {
    if (!canEdit) {
      alert('Permission Denied: Your Admin account has View-Only access and cannot edit or create staff.');
      return;
    }
    try {
      const emailLower = data.email.toLowerCase().trim();
      if (editingEmployee) {
        await updateEmployee(editingEmployee.email, data);
      } else {
        await addEmployee(data);
      }
      await loadAllData();

      // Update selectedColleague state if they were being viewed
      if (selectedColleague && selectedColleague.email.toLowerCase() === emailLower) {
        const updatedList = await fetchAllEmployees();
        const updatedColleague = updatedList.find(e => e.email.toLowerCase() === emailLower);
        if (updatedColleague) {
          setSelectedColleague(updatedColleague);
        }
      }

      // Reload currently logged in user profile if they edited themselves
      if (currentUserProfile && currentUserProfile.email.toLowerCase() === emailLower) {
        await reloadUserProfile();
      }
    } catch (err: any) {
      throw err;
    }
  };

  // Delete employee record with In-App Confirmation Modal
  const handleDeleteEmployee = (identifier: string) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot delete records.', 'error');
      return;
    }
    const targetLower = identifier.trim().toLowerCase();
    const emp = employees.find(e => 
      (e.email && e.email.trim().toLowerCase() === targetLower) || 
      (e.id && e.id.trim().toLowerCase() === targetLower) ||
      (e.fullName && e.fullName.trim().toLowerCase() === targetLower) ||
      (e.employeeId && e.employeeId.trim().toLowerCase() === targetLower)
    );

    const item: StaffDeleteItem = {
      id: emp?.id || emp?.email || identifier,
      name: emp?.fullName || identifier,
      designation: emp?.designation,
      email: emp?.email,
      photoUrl: emp?.photoUrl,
      department: emp?.department
    };

    setDeleteModalState({
      isOpen: true,
      title: 'Delete Staff Profile',
      description: `Are you sure you want to permanently delete the profile of ${item.name}? This action cannot be undone.`,
      items: [item],
      isLoading: false,
      onConfirm: async () => {
        try {
          setDeleteModalState(prev => ({ ...prev, isLoading: true }));
          await deleteEmployee(emp?.id || emp?.email || emp?.fullName || identifier);
          setSelectedStaffForDelete(prev => prev.filter(e => {
            const el = e.trim().toLowerCase();
            return el !== targetLower && 
              (!emp?.email || el !== emp.email.trim().toLowerCase()) && 
              (!emp?.id || el !== emp.id.trim().toLowerCase()) &&
              (!emp?.fullName || el !== emp.fullName.trim().toLowerCase());
          }));
          await loadAllData();
          setDeleteModalState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          showToast(`Successfully deleted staff profile: ${item.name}`, 'success');
        } catch (err: any) {
          console.error('Failed to delete employee:', err);
          setDeleteModalState(prev => ({ ...prev, isLoading: false }));
          showToast('Failed to delete staff: ' + (err.message || err), 'error');
        }
      }
    });
  };

  // Toggle selection for batch delete
  const toggleSelectStaffForDelete = (identifier: string) => {
    if (!canEdit) return;
    const target = identifier.trim();
    setSelectedStaffForDelete(prev => {
      const exists = prev.some(e => e.toLowerCase() === target.toLowerCase());
      return exists 
        ? prev.filter(e => e.toLowerCase() !== target.toLowerCase())
        : [...prev, target];
    });
  };

  // Select or Deselect All staff in a given array
  const handleSelectAllStaffForDelete = (identifiersToSelect: string[]) => {
    if (!canEdit) return;
    const lowerSelected = new Set(selectedStaffForDelete.map(e => e.toLowerCase()));
    const allSelected = identifiersToSelect.length > 0 && 
      identifiersToSelect.every(id => lowerSelected.has(id.toLowerCase()));
    
    if (allSelected) {
      const toRemove = new Set(identifiersToSelect.map(id => id.toLowerCase()));
      setSelectedStaffForDelete(prev => prev.filter(e => !toRemove.has(e.toLowerCase())));
    } else {
      setSelectedStaffForDelete(prev => {
        const set = new Set(prev);
        identifiersToSelect.forEach(id => set.add(id));
        return Array.from(set);
      });
    }
  };

  // Batch delete selected staff members with In-App Confirmation Modal
  const handleDeleteSelectedStaff = () => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot delete records.', 'error');
      return;
    }
    if (selectedStaffForDelete.length === 0) return;

    const itemsToDelete: StaffDeleteItem[] = [];
    const matchedEmployees: Employee[] = [];

    employees.forEach(emp => {
      const match = isStaffSelected(emp);
      if (match) {
        matchedEmployees.push(emp);
        itemsToDelete.push({
          id: emp.id || emp.email || emp.fullName,
          name: emp.fullName,
          designation: emp.designation,
          email: emp.email,
          photoUrl: emp.photoUrl,
          department: emp.department
        });
      }
    });

    if (itemsToDelete.length === 0) {
      selectedStaffForDelete.forEach(id => {
        itemsToDelete.push({
          id,
          name: id,
          designation: 'Staff Member'
        });
      });
    }

    const count = itemsToDelete.length;

    setDeleteModalState({
      isOpen: true,
      title: `Delete Selected Staff (${count})`,
      description: `Are you sure you want to permanently delete these ${count} staff member(s)?`,
      items: itemsToDelete,
      isLoading: false,
      onConfirm: async () => {
        try {
          setDeleteModalState(prev => ({ ...prev, isLoading: true }));
          setDataLoading(true);

          // Collect all potential keys for selected staff to ensure Firestore deletes every matching document
          const keysToDelete = new Set<string>(selectedStaffForDelete);
          matchedEmployees.forEach(emp => {
            if (emp.id) keysToDelete.add(emp.id);
            if (emp.email) keysToDelete.add(emp.email);
            if (emp.fullName) keysToDelete.add(emp.fullName);
            if (emp.employeeId) keysToDelete.add(emp.employeeId);
          });

          const deletedCount = await deleteEmployeesBatch(Array.from(keysToDelete));
          setSelectedStaffForDelete([]);
          await loadAllData();
          setDeleteModalState(prev => ({ ...prev, isOpen: false, isLoading: false }));
          showToast(`Successfully deleted ${deletedCount || count} staff member(s).`, 'success');
        } catch (err: any) {
          console.error('Failed to batch delete selected staff:', err);
          setDeleteModalState(prev => ({ ...prev, isLoading: false }));
          showToast('Failed to delete staff: ' + (err.message || err), 'error');
        } finally {
          setDataLoading(false);
        }
      }
    });
  };

  // Toggle between Active and Resigned status
  const handleToggleEmployeeStatus = async (emp: Employee) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot edit status.', 'error');
      return;
    }
    const nextStatus = emp.status === 'Active' ? 'Resigned' : 'Active';
    const lastDateOfWork = nextStatus === 'Resigned' ? new Date().toISOString().split('T')[0] : '';
    
    try {
      await updateEmployee(emp.email || emp.id, { 
        status: nextStatus,
        lastDateOfWork: lastDateOfWork || undefined
      });
      await loadAllData();
      showToast(`Updated ${emp.fullName}'s status to ${nextStatus}`, 'success');
    } catch (err: any) {
      showToast('Failed to update status: ' + (err.message || err), 'error');
    }
  };

  // Reset employee password via Admin trigger
  const handleAdminResetPassword = async (email: string) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot reset user passwords.', 'error');
      return;
    }
    try {
      await resetPassword(email);
      showToast(`Password reset link sent to ${email}`, 'info');
    } catch (err: any) {
      showToast('Failed to trigger reset: ' + (err.message || err), 'error');
    }
  };

  // Create/Edit site handler
  const handleSaveSite = async (name: string, editingSiteId?: string) => {
    if (!canEdit) {
      alert('Permission Denied: Your Admin account has View-Only access and cannot add or edit work sites.');
      return;
    }
    try {
      if (editingSiteId) {
        await editWorkSite(editingSiteId, name);
      } else {
        await addWorkSite(name, name);
      }
      await loadAllData();
      setEditingSite(null);
    } catch (err: any) {
      throw err;
    }
  };

  // Delete site handler
  const handleDeleteSite = async (siteId: string) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot delete work sites.', 'error');
      return;
    }
    try {
      await deleteWorkSite(siteId);
      await loadAllData();
      setDeletingSiteId(null);
      showToast('Work site deleted successfully.', 'success');
    } catch (err: any) {
      showToast(`Error deleting work site: ${err.message || err}`, 'error');
    }
  };

  // Save announcement handler (Create or Update)
  const handleSaveAnnouncement = async (title: string, content: string, announcementId?: string) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot post or edit announcements.', 'error');
      return;
    }
    try {
      if (announcementId) {
        await updateAnnouncement(announcementId, title, content);
      } else {
        const author = currentUserProfile?.fullName || 'System Admin';
        await addAnnouncement(title, content, author);
      }
      await loadAllData();
      setEditingAnnouncement(null);
      showToast('Announcement published successfully.', 'success');
    } catch (err: any) {
      throw err;
    }
  };

  // Delete announcement handler
  const handleDeleteAnnouncement = async (id: string) => {
    if (!canEdit) {
      showToast('Permission Denied: Your Admin account has View-Only access and cannot delete announcements.', 'error');
      return;
    }
    try {
      await deleteAnnouncement(id);
      await loadAllData();
      showToast('Announcement removed.', 'success');
    } catch (err: any) {
      showToast(`Error deleting announcement: ${err.message || err}`, 'error');
    }
  };

  // Bulk Excel/CSV Import handler
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      alert('Permission Denied: Your Admin account has View-Only access and cannot import staff records.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (!jsonData || jsonData.length === 0) {
        alert('The uploaded spreadsheet appears to be empty.');
        setImportLoading(false);
        return;
      }

      // Helper to query row values with robust case/whitespace/non-alphanumeric tolerance
      const getRowValue = (row: any, searchKeys: string[], defaultValue: any = ''): any => {
        const normalizedSearch = searchKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (const key of Object.keys(row)) {
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedSearch.includes(normalizedKey)) {
            const val = row[key];
            return val !== undefined && val !== null ? val : defaultValue;
          }
        }
        return defaultValue;
      };

      let successCount = 0;
      let errorCount = 0;
      const skipDetails: string[] = [];
      const processedEmailsInBatch = new Set<string>();
      const existingEmails = new Set(employees.map(emp => emp.email.toLowerCase()));

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Map common spreadsheet headers with fallback heuristics
        const fullNameRaw = getRowValue(row, ['Staff Name', 'fullName', 'Full Name', 'Name', 'StaffName']);
        const fullName = fullNameRaw ? String(fullNameRaw).trim() : '';
        
        const emailRaw = getRowValue(row, ['email', 'Email Address', 'Email', 'EmailAddress']);
        const email = emailRaw ? String(emailRaw).trim().toLowerCase() : '';

        // If a row has absolutely no staff name, skip silently
        if (!fullName && !email) {
          continue;
        }

        const employeeIdRaw = getRowValue(row, ['employeeId', 'Staff ID', 'Employee ID', 'ID', 'Id', 'StaffId', 'EmployeeId']);
        const employeeId = employeeIdRaw 
          ? String(employeeIdRaw).trim() 
          : `EMP-${Math.floor(100000 + Math.random() * 900000)}`;

        const phone = String(getRowValue(row, ['Mobile Number', 'Mobile', 'phone', 'Phone', 'Contact Number', 'Contact'], '-')).trim();
        const designation = String(getRowValue(row, ['designation', 'Designation', 'Job Title', 'JobTitle', 'Position', 'position'], 'Staff')).trim();
        const department = String(getRowValue(row, ['department', 'Department', 'Dept', 'dept'], 'General')).trim();
        const company = String(getRowValue(row, ['company', 'Company', 'Organization', 'org'], 'WeeHur Construction')).trim();
        
        // Parse Role (Admin vs Employee)
        const roleRaw = String(getRowValue(row, ['Role', 'role', 'System Role', 'SystemRole', 'User Role', 'UserRole', 'Permission'], 'Employee')).trim();
        const role: 'Admin' | 'Employee' = roleRaw.toLowerCase() === 'admin' ? 'Admin' : 'Employee';

        // Date of Employment
        const dateJoinedRaw = getRowValue(row, ['Date of Employment', 'dateJoined', 'Date Joined', 'Joined Date', 'DateOfEmployment'], '');
        const dateJoined = formatDateValue(dateJoinedRaw) || new Date().toISOString().split('T')[0];
        
        // Date of Joined to Site
        const dateJoinedProjectRaw = getRowValue(row, ['Date of Joined to Site', 'Date Joined to Site', 'Date of Joined to Project', 'Date Joined to Project', 'Project Joined Date', 'DateJoinedProject', 'DateJoinedSite'], '');
        const dateJoinedProject = formatDateValue(dateJoinedProjectRaw);

        // Remarks
        const remarksInput = String(getRowValue(row, ['Remarks', 'remarks', 'Note', 'notes'], '')).trim();

        // Site
        const siteInput = String(getRowValue(row, ['Site', 'Work Site', 'Project Site', 'Sites', 'site'], '')).trim();
        const workSites = siteInput ? String(siteInput).split(',').map(s => s.trim()).filter(Boolean) : [];

        // Auto-create imported sites that don't exist in our global database
        for (const siteName of workSites) {
          const exists = sites.some(s => s.name.toLowerCase() === siteName.toLowerCase());
          if (!exists) {
            try {
              await addWorkSite(siteName, siteName);
              // Optimistically add to the sites list state so other rows can reference it
              sites.push({
                id: siteName.replace(/\s+/g, '-').toLowerCase(),
                name: siteName,
                createdAt: new Date().toISOString()
              });
            } catch (err) {
              console.warn('Could not auto-create site from import:', siteName, err);
            }
          }
        }

        let statusInput = String(getRowValue(row, ['status', 'Status'], 'Active')).trim();
        let status: 'Active' | 'Resigned' = 'Active';
        if (statusInput.toLowerCase() === 'resigned' || statusInput.toLowerCase() === 'inactive') {
          status = 'Resigned';
        }

        const lastDateOfWorkRaw = getRowValue(row, ['lastDateOfWork', 'Last Date of Work', 'Last Working Date', 'Last Working Day'], '');
        const lastDateOfWork = formatDateValue(lastDateOfWorkRaw);

        if (!fullName) {
          errorCount++;
          skipDetails.push(`Row ${i + 2}: Missing Staff Name`);
          continue;
        }

        // Auto-generate email if email is missing or empty
        let finalEmail = email ? email.trim().toLowerCase() : '';
        if (!finalEmail) {
          const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
          const cleanEmpId = String(employeeId).toLowerCase().replace(/[^a-z0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
          finalEmail = `${cleanName}.${cleanEmpId}@weehur.com.sg`;
        } else if (!finalEmail.endsWith('@weehur.com.sg')) {
          if (finalEmail.includes('@')) {
            const localPart = finalEmail.split('@')[0].replace(/[^a-z0-9._-]/g, '');
            finalEmail = `${localPart || 'staff'}@weehur.com.sg`;
          } else {
            finalEmail = `${finalEmail.replace(/[^a-z0-9._-]/g, '')}@weehur.com.sg`;
          }
        }

        const targetEmail = finalEmail;
        processedEmailsInBatch.add(targetEmail);

        const newEmp: Omit<Employee, 'id'> = {
          employeeId: String(employeeId),
          fullName: String(fullName),
          photoUrl: '',
          email: targetEmail,
          phone: String(phone),
          designation: String(designation),
          department: String(department),
          company: String(company),
          workSites,
          status,
          dateJoined: String(dateJoined),
          dateJoinedProject: dateJoinedProject ? String(dateJoinedProject) : undefined,
          remarks: remarksInput ? String(remarksInput).trim() : undefined,
          lastDateOfWork: lastDateOfWork ? String(lastDateOfWork) : undefined,
          role
        };

        try {
          await addEmployee(newEmp);
          successCount++;
        } catch (dbErr: any) {
          console.error('Error importing employee:', dbErr);
          errorCount++;
          skipDetails.push(`Row ${i + 2} (${fullName}): ${dbErr.message || dbErr}`);
        }
      }

      await loadAllData();
      
      let reportMsg = `Import completed! Successfully imported ${successCount} staff member(s).`;
      if (errorCount > 0) {
        reportMsg += `\n\nSkipped or Errored rows: ${errorCount}`;
        if (skipDetails.length > 0) {
          reportMsg += `\nDetail logs:\n` + skipDetails.slice(0, 10).map(d => `• ${d}`).join('\n');
          if (skipDetails.length > 10) {
            reportMsg += `\n...and ${skipDetails.length - 10} more rows.`;
          }
        }
      }
      alert(reportMsg);
      
      setIsExcelImportOpen(false);
    } catch (err) {
      console.error('Failed to read file:', err);
      alert('Error parsing Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      setImportLoading(false);
    }
  };

  // Filter colleague list according to Site assignments (employees only see same site)
  const filteredEmployeesForActiveUser = useMemo(() => {
    if (!currentUserProfile) return [];

    let filtered = [...employees];

    // SECURE SITE RESTRICTION FOR NON-ADMINS:
    // "Employees should only see employees working at the same site(s) assigned to them."
    if (!isAdmin) {
      const userSites = currentUserProfile.workSites || [];
      filtered = filtered.filter(emp => {
        // Must share at least one assigned site
        return (emp.workSites || []).some(site => userSites.includes(site));
      });
    }

    // Search query matches
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.fullName.toLowerCase().includes(queryLower) ||
        emp.employeeId.toLowerCase().includes(queryLower) ||
        emp.designation.toLowerCase().includes(queryLower) ||
        emp.email.toLowerCase().includes(queryLower) ||
        (emp.remarks && emp.remarks.toLowerCase().includes(queryLower))
      );
    }

    // Site selection dropdown filter
    if (selectedSiteFilter !== 'All') {
      filtered = filtered.filter(emp => (emp.workSites || []).includes(selectedSiteFilter));
    }

    // Filter by directory status (All, Active, Resigned)
    if (directoryStatusFilter !== 'All') {
      filtered = filtered.filter(emp => emp.status === directoryStatusFilter);
    }

    // Always sequence staff site by site (e.g. CORPORATE, DEFECT, TANK97), then by name
    filtered.sort((a, b) => {
      const getSiteKey = (emp: Employee) => {
        if (emp.workSites && emp.workSites.length > 0) {
          return emp.workSites.join(', ').toLowerCase();
        }
        return (emp.department || 'CORPORATE').toLowerCase();
      };
      const siteA = getSiteKey(a);
      const siteB = getSiteKey(b);
      if (siteA !== siteB) return siteA.localeCompare(siteB);
      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [employees, currentUserProfile, isAdmin, searchQuery, selectedSiteFilter, directoryStatusFilter]);

  // Group active employees by site (show 1 site followed by other sites)
  const activeStaffBySiteGroups = useMemo(() => {
    const activeStaff = employees.filter(e => e.status === 'Active');
    
    // Collect all site names
    const siteNamesSet = new Set<string>();
    sites.forEach(s => siteNamesSet.add(s.name));
    activeStaff.forEach(e => {
      (e.workSites || []).forEach(ws => {
        if (ws && ws !== 'All') siteNamesSet.add(ws);
      });
    });

    const siteList = Array.from(siteNamesSet);
    const groups: { siteName: string; staff: Employee[] }[] = [];

    siteList.forEach(siteName => {
      const staffAtSite = activeStaff.filter(e => 
        (e.workSites || []).includes(siteName)
      );
      if (staffAtSite.length > 0) {
        groups.push({
          siteName,
          staff: staffAtSite
        });
      }
    });

    const unassigned = activeStaff.filter(e => !e.workSites || e.workSites.length === 0);
    if (unassigned.length > 0) {
      groups.push({
        siteName: 'Corporate HQ / Unassigned',
        staff: unassigned
      });
    }

    return groups;
  }, [employees, sites]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = employees.length;
    const activeCount = employees.filter(e => e.status === 'Active').length;
    const resignedCount = employees.filter(e => e.status === 'Resigned').length;
    const totalSites = sites.length;

    // Chart Data: distribution of employees by site
    const distributionBySite = sites.map(site => {
      const count = employees.filter(e => e.workSites.includes(site.name)).length;
      return {
        name: site.name,
        count: count
      };
    });

    // Chart Data: distribution of employees by department
    const departments = Array.from(new Set(employees.map(e => e.department || 'Unassigned')));
    const distributionByDepartment = departments.map(dept => {
      const count = employees.filter(e => e.department === dept).length;
      return {
        name: dept,
        count: count
      };
    });

    // Chart Data: active vs resigned status split
    const statusData = [
      { name: 'Active', value: activeCount, color: '#10B981' },
      { name: 'Resigned', value: resignedCount, color: '#EF4444' }
    ];

    return {
      totalCount,
      activeCount,
      resignedCount,
      totalSites,
      distributionBySite,
      distributionByDepartment,
      statusData
    };
  }, [employees, sites]);

  // Allowable sites in dropdown filter (Employees can only choose within their assigned list)
  const availableSitesFilterList = useMemo(() => {
    if (isAdmin) return sites.map(s => s.name);
    return currentUserProfile?.workSites || [];
  }, [sites, currentUserProfile, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#030712] transition-colors">
        <div className="w-12 h-12 rounded-2xl border-4 border-blue-600 border-t-transparent animate-spin mb-4" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
          Loading Security Vault...
        </h3>
      </div>
    );
  }

  // ==================== AUTHENTICATION SCREENS ====================
  if (!currentUser || !currentUserProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-[#030712] dark:to-[#0B152B] flex flex-col justify-center items-center p-4 transition-colors">
        
        {/* Core Auth card */}
        <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-200/40 dark:border-slate-800/60 overflow-hidden" id="auth-portal-card">
          
          {/* Header branding */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 px-6 py-8 text-center text-white relative">
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <div className="flex justify-center mb-3">
              <WeeHurLogo className="w-16 h-16" />
            </div>
            <h1 className="text-lg font-black uppercase tracking-wider">
              WeeHur Construction Pte Ltd
            </h1>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">
              Corporate Employee Management Portal
            </p>
          </div>

          <div className="p-6">
            
            {/* Feedback Alerts */}
            {authFeedback && (
              authFeedback.text.includes('EMAIL_PASSWORD_DISABLED') ? (
                <div className="p-4 rounded-2xl text-xs font-medium mb-5 border bg-amber-50 dark:bg-amber-950/20 text-slate-800 dark:text-amber-200 border-amber-200 dark:border-amber-900/30 space-y-2">
                  <div className="flex items-center gap-1.5 font-black uppercase text-[10px] tracking-wider text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Firebase Auth Set-up Required</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    The <strong>Email/Password</strong> login provider needs to be enabled in your Firebase Console. Please follow these simple steps:
                  </p>
                  <ol className="list-decimal list-inside pl-1 text-[11px] space-y-1 text-slate-600 dark:text-slate-300 font-bold">
                    <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700">Firebase Console</a></li>
                    <li>Select the project: <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-red-500">ai-studio-weehurdigitalid-0542da6c</span></li>
                    <li>Go to <strong className="text-slate-900 dark:text-white">Authentication</strong> &gt; <strong className="text-slate-900 dark:text-white">Sign-in method</strong></li>
                    <li>Click <strong className="text-slate-900 dark:text-white">Add new provider</strong> &gt; Choose <strong className="text-slate-900 dark:text-white">Email/Password</strong></li>
                    <li>Toggle the provider to <strong>Enabled</strong> and click <strong>Save</strong></li>
                  </ol>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800/40 italic">
                    Once enabled, refresh this page and you'll be able to sign in or register instantly!
                  </p>
                </div>
              ) : (
                <div className={`p-3 rounded-xl text-xs font-bold mb-4 border ${
                  authFeedback.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30'
                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                }`}>
                  {authFeedback.text}
                </div>
              )
            )}

            {/* TAB SELECTORS */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setAuthFeedback(null); setAuthVerifiedEmployee(null); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('firsttime'); setAuthFeedback(null); setAuthVerifiedEmployee(null); }}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === 'firsttime'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                }`}
              >
                First Login
              </button>
            </div>

            {/* MODE 1: SECURE SIGN-IN */}
            {authMode === 'signin' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. name@weehur.com.sg"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>Secure Login</span>
                </button>
              </form>
            )}

            {/* MODE 2: FIRST-TIME PASSSWORD CREATION */}
            {authMode === 'firsttime' && (
              <div className="space-y-4">
                {!authVerifiedEmployee ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                        Admin pre-registers your corporate email. Verify your pre-registration below to set your personal account password.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Pre-Registered Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="e.g. name@weehur.com.sg"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={authVerifyLoading}
                      onClick={handleVerifyEmailForSetup}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {authVerifyLoading ? 'Verifying...' : 'Verify Pre-Registration'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFirstTimeSetupSubmit} className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Set Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create Password & Sign In</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* GOOGLE SIGN-IN ALTERNATIVE */}
            {(authMode === 'signin' || authMode === 'firsttime') && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-850">
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-slate-800/80"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <span className="bg-white dark:bg-slate-900 px-3">or access instantly via</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-.14 3.01-1.3 4l3.1 2.4c1.8-1.69 2.91-4.18 2.91-7.25z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.1-2.4c-.9.6-2.04.98-3.32.98-2.55 0-4.71-1.73-5.48-4.05L4.9 18l.06.18C6.93 21.9 10.11 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.52 14.62a7.19 7.19 0 010-4.51L3.3 7.69a11.94 11.94 0 000 10.14l3.22-3.21z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 10.11 0 6.93 2.1 4.96 5.82L8.18 8.4c.77-2.32 2.93-4.05 5.48-4.05z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}

            {/* MODE 3: FORGOT PASSWORD */}
            {authMode === 'forgot' && (
              <div className="space-y-4">
                {!authVerifiedEmployee ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-xl border border-blue-100 dark:border-blue-950/45 leading-relaxed">
                      Enter your pre-registered email to instantly verify your profile and reset your password.
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="e.g. name@weehur.com.sg"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signin'); setAuthFeedback(null); setAuthVerifiedEmployee(null); }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        Back to Login
                      </button>
                      <button
                        type="button"
                        disabled={authVerifyLoading}
                        onClick={handleVerifyEmailForSetup}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md disabled:opacity-50 cursor-pointer text-center"
                      >
                        {authVerifyLoading ? 'Verifying...' : 'Verify Profile'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordResetSubmit} className="space-y-4 animate-fade-in">
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-xl border border-green-100 dark:border-green-950/45 leading-relaxed">
                      Profile Verified: <strong className="text-slate-800 dark:text-white">{authVerifiedEmployee.fullName}</strong>. You can set a new password below.
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setAuthVerifiedEmployee(null); setAuthPassword(''); }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer text-center"
                      >
                        Reset Password
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

          </div>

          {/* Footer Terms */}
          <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-4 text-center border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
              WeeHur Construction Pte Ltd Internal System
            </span>
          </div>

        </div>

      </div>
    );
  }

  // ==================== AUTHENTICATED PORTAL VIEW ====================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-250 flex flex-col md:flex-row">
      
      {/* MOBILE HEADER BAR */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white dark:bg-[#0B132B] border-b border-slate-150 dark:border-slate-800 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-2">
          <WeeHurLogo className="w-8 h-8 shrink-0" />
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white leading-none">
              WeeHur Construction
            </h2>
            <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">Pte Ltd</p>
          </div>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-pointer"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* PERSISTENT SIDEBAR DRAWER (Responsive) */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-white dark:bg-[#0B132B] border-r border-slate-150 dark:border-slate-800 z-[90] transform md:transform-none transition-transform duration-300 flex flex-col justify-between ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        
        <div>
          {/* Sidebar Corporate Header */}
          <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-800 hidden md:flex items-center gap-2.5">
            <WeeHurLogo className="w-9 h-9 shrink-0" />
            <div className="leading-tight">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
                WeeHur
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                Construction
              </p>
            </div>
          </div>

          {/* Sidebar Top Profile Branding */}
          <div className="px-6 py-6 border-b border-slate-150 dark:border-slate-800 flex flex-col items-center text-center">
            <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
              {hasValidPhoto(currentUserProfile.photoUrl) ? (
                <img 
                  src={currentUserProfile.photoUrl} 
                  alt={currentUserProfile.fullName}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500" />
            </div>

            <h3 className="text-sm font-black uppercase text-slate-950 dark:text-white mt-3 truncate max-w-full px-2" title={currentUserProfile.fullName}>
              {currentUserProfile.fullName}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                isSuperAdmin 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : isAdmin 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' 
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
              }`}>
                {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN (VIEW-ONLY)' : 'EMPLOYEE'}
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]" title={currentUserProfile.designation}>
                {currentUserProfile.designation}
              </span>
            </div>
            {isAdmin && !isSuperAdmin && (
              <p className="text-[8.5px] text-slate-500 dark:text-slate-400 mt-1.5 px-2 font-medium">
                Full site staff directory view access (Read-Only).
              </p>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('directory'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Directory</span>
            </button>

            {!isAdmin && (
              <button
                onClick={() => { setActiveTab('sites'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'sites'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Work Sites</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('announcements'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Announcements</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => { setActiveTab('audit'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/60'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Login History</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-[#070D1F]/30">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Theme</span>
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/35 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Session</span>
          </button>
        </div>

      </aside>

      {/* MAIN VIEWPORT PANELS */}
      <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 max-w-7xl mx-auto w-full">
        
        {dataLoading ? (
          <div className="min-h-[60vh] flex flex-col justify-center items-center">
            <div className="w-10 h-10 rounded-xl border-4 border-blue-600 border-t-transparent animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Syncing Cloud Databases...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* ==================== 1. TAB: DASHBOARDS ==================== */}
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="tab-dashboard"
              >
                {/* WELCOME BANNER */}
                <div className="bg-gradient-to-r from-red-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white grid grid-cols-1 md:grid-cols-3 items-center gap-6 shadow-md border-b-4 border-[#E2231A]">
                  <div className="space-y-1.5 text-center md:text-left">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-red-600/30 text-[9px] font-black uppercase tracking-widest text-red-200 border border-red-500/20">
                      Live Portal Sync Active
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                      Welcome {currentUserProfile.fullName}
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      Manage profiles, assign sites, and view secure digital employee identification.
                    </p>
                  </div>

                  <div className="flex justify-center items-center">
                    <div className="bg-white/10 p-3.5 rounded-full border border-white/10 backdrop-blur-xs flex items-center justify-center shadow-lg">
                      <WeeHurLogo className="w-14 h-14" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 w-full md:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#E2231A] flex items-center justify-center font-black text-white text-sm shadow-md shrink-0">
                        WH
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-black uppercase tracking-wider leading-none">
                          WeeHur Construction
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Corporate HQ</p>
                      </div>
                    </div>

                    <button
                      onClick={logout}
                      className="w-full md:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md border border-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* ==================== 1A: ADMIN DASHBOARD ==================== */}
                {isAdmin ? (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Core Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      
                      <div className="bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Total Employees</span>
                          <span className="text-xl font-black text-slate-950 dark:text-white leading-none mt-1 block">{stats.totalCount}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowActiveList(!showActiveList);
                          if (showResignedList) setShowResignedList(false);
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 w-full cursor-pointer transition-all hover:shadow-md ${
                          showActiveList 
                            ? 'bg-green-50/40 dark:bg-green-950/10 border-green-500 dark:border-green-600 ring-1 ring-green-500/20' 
                            : 'bg-white dark:bg-[#0B132B] border-slate-150 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-900 shadow-sm'
                        }`}
                        title="Click to view all active staff grouped site by site"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          showActiveList ? 'bg-green-600 text-white shadow-sm' : 'bg-green-50 dark:bg-green-950/20 text-green-600'
                        }`}>
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Active Status</span>
                          <span className="text-xl font-black text-green-600 leading-none mt-1 block flex items-center justify-between">
                            <span>{stats.activeCount}</span>
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-950/40 uppercase tracking-widest">
                              {showActiveList ? 'Collapse' : 'Expand'}
                            </span>
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowResignedList(!showResignedList);
                          if (showActiveList) setShowActiveList(false);
                        }}
                        className={`p-4 rounded-2xl border text-left flex items-center gap-3.5 w-full cursor-pointer transition-all hover:shadow-md ${
                          showResignedList 
                            ? 'bg-red-50/40 dark:bg-red-950/10 border-red-500 dark:border-red-600 ring-1 ring-red-500/20' 
                            : 'bg-white dark:bg-[#0B132B] border-slate-150 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900 shadow-sm'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          showResignedList ? 'bg-red-500 text-white shadow-sm' : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                        }`}>
                          <UserX className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Resigned Staff</span>
                          <span className="text-xl font-black text-red-600 leading-none mt-1 block flex items-center justify-between">
                            <span>{stats.resignedCount}</span>
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-950/40 uppercase tracking-widest">
                              {showResignedList ? 'Collapse' : 'Expand'}
                            </span>
                          </span>
                        </div>
                      </button>

                    </div>

                    {/* Collapsible Active Staff Panel (Grouped Site by Site) */}
                    <AnimatePresence>
                      {showActiveList && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-white dark:bg-[#0B132B] rounded-2xl border border-green-300 dark:border-green-900/80 p-5 shadow-sm space-y-5"
                        >
                          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-lg">
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
                                  Active Staff Directory — Site by Site ({stats.activeCount})
                                </h3>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  Showing personnel organized site by site
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowActiveList(false)}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Hide Registry
                            </button>
                          </div>

                          {activeStaffBySiteGroups.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No active staff members found.</p>
                          ) : (
                            <div className="space-y-5">
                              {activeStaffBySiteGroups.map((group, idx) => (
                                <div key={group.siteName} className="bg-slate-50/80 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                                  
                                  {/* Site Header */}
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                                        {idx + 1}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                          Site: {group.siteName}
                                        </h4>
                                      </div>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-900">
                                      {group.staff.length} {group.staff.length === 1 ? 'Staff Member' : 'Staff Members'}
                                    </span>
                                  </div>

                                  {/* Table of Staff for this site */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-200/60 dark:border-slate-800">
                                          {canEdit && (
                                            <th className="py-2 pr-2 w-8">
                                              <input
                                                type="checkbox"
                                                checked={group.staff.length > 0 && group.staff.every(e => isStaffSelected(e))}
                                                onChange={() => handleSelectAllStaffForDelete(group.staff.map(e => e.email || e.id))}
                                                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                                title="Select All in Site Group"
                                              />
                                            </th>
                                          )}
                                          <th className="py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Staff Name</th>
                                          <th className="py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Designation</th>
                                          <th className="py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Assigned Site(s)</th>
                                          <th className="py-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Mobile Number</th>
                                          <th className="py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                        {group.staff.map(emp => (
                                          <tr key={emp.id || emp.email} className={`hover:bg-white dark:hover:bg-slate-900 transition-colors ${isStaffSelected(emp) ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                                            {canEdit && (
                                              <td className="py-2.5 pr-2">
                                                <input
                                                  type="checkbox"
                                                  checked={isStaffSelected(emp)}
                                                  onChange={() => toggleSelectStaffForDelete(emp.email || emp.id)}
                                                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                                />
                                              </td>
                                            )}
                                            <td className="py-2.5 pr-3">
                                              <div className="flex items-center gap-2.5">
                                                {hasValidPhoto(emp.photoUrl) ? (
                                                  <img
                                                    src={emp.photoUrl}
                                                    alt={emp.fullName}
                                                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                                                    referrerPolicy="no-referrer"
                                                  />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-center font-black text-xs shrink-0">
                                                    {emp.fullName.charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                                <div className="min-w-0">
                                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">{emp.fullName}</span>
                                                  <span className="text-[9px] text-slate-400 font-mono block truncate">{emp.email}</span>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{emp.designation}</span>
                                              <span className="text-[9px] text-slate-400 block">{emp.company || 'WeeHur Construction'}</span>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                              <div className="flex flex-wrap gap-1">
                                                {emp.workSites.map(st => (
                                                  <span key={st} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[9px] font-extrabold uppercase border border-blue-100 dark:border-blue-900">
                                                    {st}
                                                  </span>
                                                ))}
                                              </div>
                                            </td>
                                            <td className="py-2.5 pr-3">
                                              <a href={`tel:${emp.phone || '+65 6250 1234'}`} className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-green-500" />
                                                <span>{emp.phone || '+65 6250 1234'}</span>
                                              </a>
                                            </td>
                                            <td className="py-2.5 text-right">
                                              <button
                                                type="button"
                                                onClick={() => setSelectedColleague(emp)}
                                                className="px-2 py-1 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                              >
                                                View ID
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Collapsible Resigned Staff Panel */}
                    <AnimatePresence>
                      {showResignedList && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-white dark:bg-[#0B132B] rounded-2xl border border-red-200 dark:border-red-950/60 p-5 shadow-sm space-y-4"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <UserX className="w-4 h-4 text-red-600" />
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-200">
                                Resigned Staff Registry with Assigned Sites ({stats.resignedCount})
                              </h3>
                            </div>
                            <button
                              onClick={() => setShowResignedList(false)}
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Hide Registry
                            </button>
                          </div>

                          {employees.filter(e => e.status === 'Resigned').length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-4 text-center">No resigned staff members found in the system.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-100 dark:border-slate-800">
                                    {canEdit && (
                                      <th className="py-2 pr-2 w-8">
                                        <input
                                          type="checkbox"
                                          checked={employees.filter(e => e.status === 'Resigned').length > 0 && employees.filter(e => e.status === 'Resigned').every(e => isStaffSelected(e))}
                                          onChange={() => handleSelectAllStaffForDelete(employees.filter(e => e.status === 'Resigned').map(e => e.email || e.id))}
                                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                          title="Select All Resigned Staff"
                                        />
                                      </th>
                                    )}
                                    <th className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Staff Info</th>
                                    <th className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Designation</th>
                                    <th className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Site(s)</th>
                                    <th className="py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                  {employees.filter(e => e.status === 'Resigned').map(emp => (
                                    <tr key={emp.id || emp.email} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${isStaffSelected(emp) ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                                      {canEdit && (
                                        <td className="py-3 pr-2">
                                          <input
                                            type="checkbox"
                                            checked={isStaffSelected(emp)}
                                            onChange={() => toggleSelectStaffForDelete(emp.email || emp.id)}
                                            className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                          />
                                        </td>
                                      )}
                                      <td className="py-3 pr-4">
                                        <div className="flex items-center gap-3">
                                          {hasValidPhoto(emp.photoUrl) ? (
                                            <img
                                              src={emp.photoUrl}
                                              alt={emp.fullName}
                                              className="w-9 h-9 rounded-lg object-cover border border-slate-150 dark:border-slate-800 shrink-0"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                              <User className="w-5 h-5" />
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">{emp.fullName}</span>
                                            <span className="text-[9px] font-mono text-slate-400 block">{emp.employeeId || 'No ID'} • {emp.email}</span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-3 pr-4">
                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-350">{emp.designation}</span>
                                      </td>
                                      <td className="py-3 pr-4">
                                        <div className="flex flex-wrap gap-1">
                                          {(emp.workSites || []).length > 0 ? (
                                            emp.workSites.map(siteName => (
                                              <span
                                                key={siteName}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider border border-blue-100/50 dark:border-blue-950/45"
                                              >
                                                <MapPin className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                                                {siteName}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[10px] text-slate-400 italic">No sites assigned</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedColleague(emp)}
                                          className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-850 cursor-pointer transition-all"
                                        >
                                          View Profile
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quick Action Matrix & Analytics Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left Block: Quick Actions Grid */}
                      <div className="lg:col-span-4 space-y-6">
                        
                        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm space-y-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Quick Administrative Tasks
                          </h3>
                          <div className="grid grid-cols-2 gap-2.5">
                            {canEdit && (
                              <button
                                onClick={() => { setEditingEmployee(null); setIsEmpModalOpen(true); }}
                                className="col-span-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Staff</span>
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => { setEditingAnnouncement(null); setIsAnnounceModalOpen(true); }}
                                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-amber-500" />
                                <span>Post News</span>
                              </button>
                            )}

                            <button
                              onClick={() => exportEmployeesToCSV(employees)}
                              className={`p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${!canEdit ? 'col-span-1' : ''}`}
                            >
                              <FileSpreadsheet className="w-4 h-4 text-green-500" />
                              <span>Export Excel</span>
                            </button>

                            {canEdit && (
                              <button
                                onClick={() => {
                                  setIsExcelImportOpen(true);
                                  setActiveTab('directory');
                                }}
                                className="p-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>Import Staff</span>
                              </button>
                            )}

                            {isAdmin && (
                              <button
                                onClick={() => setActiveTab('sites')}
                                className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>Work Sites</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Recent Announcements Card */}
                        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                              Corporate Bulletins
                            </h3>
                            <button 
                              onClick={() => setActiveTab('announcements')}
                              className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                            >
                              View All
                            </button>
                          </div>
                          
                          <div className="space-y-3.5 max-h-[180px] overflow-y-auto">
                            {announcements.slice(0, 2).map(ann => (
                              <div key={ann.id} className="space-y-1">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{ann.title}</h4>
                                <FormattedAnnouncement content={ann.content} compact />
                                <span className="text-[8px] text-slate-400 font-bold uppercase block">{new Date(ann.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                            {announcements.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">No news posted yet.</p>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right Block: Recharts Data Visualization */}
                      <div className="lg:col-span-8 bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Employee Distribution by Work Site
                          </h3>
                          <span className="text-[9px] text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                            Interactive Chart
                          </span>
                        </div>

                        {stats.distributionBySite.length > 0 ? (
                          <div className="space-y-4">
                            <div className="h-64 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.distributionBySite} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }} axisLine={false} tickLine={false} />
                                  <Tooltip contentStyle={{ background: isDarkMode ? '#0F172A' : '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '11px' }} />
                                  <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]}>
                                    <LabelList 
                                      dataKey="count" 
                                      position="top" 
                                      fill={isDarkMode ? '#CBD5E1' : '#1E293B'} 
                                      fontSize={10} 
                                      fontWeight="bold" 
                                      offset={6}
                                    />
                                    {stats.distributionBySite.map((entry, index) => {
                                      const isSelected = selectedSiteForStaffList === entry.name;
                                      return (
                                        <Cell 
                                          key={`cell-${index}`} 
                                          fill={isSelected ? '#E2231A' : (index % 2 === 0 ? '#3B82F6' : '#60A5FA')} 
                                          className="cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={() => {
                                            setSelectedSiteForStaffList(
                                              selectedSiteForStaffList === entry.name ? null : entry.name
                                            );
                                          }}
                                        />
                                      );
                                    })}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            
                            <p className="text-[10px] text-slate-400 text-center italic font-medium">
                              💡 Tip: Click on any bar to see the staff name list for that work site.
                            </p>

                            {/* SELECTED SITE STAFF LIST PANEL */}
                            {selectedSiteForStaffList && (
                              <div className="mt-4 pt-4 border-t border-slate-150 dark:border-slate-800 animate-fade-in space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#E2231A]" />
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                      Staff List: <span className="text-blue-600 dark:text-blue-400">{selectedSiteForStaffList}</span>
                                    </h4>
                                  </div>
                                  <button
                                    onClick={() => setSelectedSiteForStaffList(null)}
                                    className="text-[9px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded font-black uppercase tracking-wider cursor-pointer transition-colors"
                                  >
                                    Close List
                                  </button>
                                </div>

                                {(() => {
                                  const staffAtSite = employees.filter(e => e.workSites.includes(selectedSiteForStaffList));
                                  if (staffAtSite.length === 0) {
                                    return (
                                      <p className="text-[11px] text-slate-400 italic">No staff members currently assigned to this site.</p>
                                    );
                                  }
                                  return (
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                      {staffAtSite.map(emp => (
                                        <button
                                          key={emp.email}
                                          onClick={() => setSelectedColleague(emp)}
                                          className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900/40 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-800 cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
                                          title={`Click to view ${emp.fullName}'s profile`}
                                        >
                                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                                          <span className="truncate max-w-[150px]">{emp.fullName}</span>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-bold uppercase">
                            No site data available for analytics
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                ) : (
                  
                  // ==================== 1B: EMPLOYEE DASHBOARD ====================
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
                    
                    {/* Left Panel: Digital Card ID Mockup View */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <div className="bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-sm w-full space-y-4 flex flex-col items-center">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
                            Your Virtual Employee Badge
                          </h3>
                          <p className="text-[10px] text-slate-500 text-center mt-0.5">
                            Click/tap card to reveal QR verification face
                          </p>
                        </div>
                        
                        <DigitalIDCard employee={currentUserProfile} />
                      </div>
                    </div>

                    {/* Right Panel: Announcements & Colleague Site Distribution */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Active stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Deployed Staff Project</span>
                              <span className="text-xs font-extrabold text-slate-850 dark:text-white truncate block" title={currentUserProfile.workSites.join(', ')}>
                                {currentUserProfile.workSites.join(', ')}
                              </span>
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => { setEditingEmployee(currentUserProfile); setIsEmpModalOpen(true); }}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="Deploy or edit staff project site"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Deploy Site</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsCoworkersModalOpen(true)}
                          className="bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-center justify-between gap-2 text-left cursor-pointer group w-full"
                          title="Click to view all site coworkers, designation & mobile numbers"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block truncate">Total Coworkers</span>
                              <span className="text-sm font-extrabold text-slate-850 dark:text-white block truncate">
                                {employees.filter(e => e.status === 'Active' && (currentUserProfile.workSites.includes('All') || currentUserProfile.role === 'Admin' || e.workSites.some(s => currentUserProfile.workSites.includes(s)))).length} Site Colleagues
                              </span>
                            </div>
                          </div>
                          <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors shrink-0">
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      </div>

                      {/* Announcement List */}
                      <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                          Recent Company Announcements
                        </h3>
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                          {announcements.map(ann => (
                            <div key={ann.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-1.5 relative group">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight line-clamp-1">{ann.title}</h4>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(ann.createdAt).toLocaleDateString()}</span>
                                  {canEdit && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingAnnouncement(ann);
                                          setIsAnnounceModalOpen(true);
                                        }}
                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                                        title="Edit Announcement"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAnnouncement(ann.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                                        title="Delete Announcement"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <FormattedAnnouncement content={ann.content} compact />
                              <span className="text-[8px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest block">By: {ann.authorName}</span>
                            </div>
                          ))}
                          {announcements.length === 0 && (
                            <p className="text-[10px] text-slate-400 italic">No news posted yet.</p>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </motion.div>
            )}

            {/* ==================== 2. TAB: STAFF DIRECTORY ==================== */}
            {activeTab === 'directory' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="tab-directory"
              >
                
                 {/* Header title */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-wider text-slate-950 dark:text-white">
                        Staff Member Directory
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {isAdmin ? 'Complete active/resigned profile index.' : 'Interactive listing of colleagues assigned to your work site(s).'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* EXCEL IMPORT UTILITY PANEL */}
                <AnimatePresence>
                  {isExcelImportOpen && canEdit && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-slate-100 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                            Bulk Import Staff via Excel / CSV Spreadsheet
                          </h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            Upload a spreadsheet containing staff records. The system intelligently parses columns. To ensure accuracy, you can include headers such as: <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">fullName</code>, <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">email</code>, <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">employeeId</code>, <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">designation</code>, <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">department</code>, <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">status</code> (Active/Resigned), and <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded text-red-500 text-[9px] font-mono">lastDateOfWork</code>.
                          </p>
                        </div>
                        <button
                          onClick={() => setIsExcelImportOpen(false)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-950 relative hover:border-blue-500 transition-colors">
                          <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleExcelImport}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            disabled={importLoading}
                          />
                          {importLoading ? (
                            <div className="space-y-2">
                              <div className="w-8 h-8 border-4 border-t-blue-500 border-slate-250 rounded-full animate-spin mx-auto" />
                              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider animate-pulse block">Processing Spreadsheet...</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto" />
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Click or Drag Spreadsheet Here</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-1">Supports Microsoft Excel (.xlsx, .xls) and standard CSV files</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Spreadsheet Template Guide:</h4>
                            <ul className="text-[10px] text-slate-500 space-y-1 pl-4 list-disc leading-relaxed">
                              <li><strong>Staff Name</strong> (Required) - e.g. Tan Ah Kow</li>
                              <li><strong>Designation</strong> (Required) - e.g. Safety Officer</li>
                              <li><strong>Site</strong> (Optional) - Operational sites e.g. Kallang Site</li>
                              <li><strong>Role</strong> (Optional) - "Employee" or "Admin" (defaults to Employee)</li>
                              <li><strong>Status</strong> (Optional) - "Active" or "Resigned" (defaults to Active)</li>
                              <li><strong>Last Date of Work</strong> (Optional) - YYYY-MM-DD format (if Resigned)</li>
                              <li><strong>Email Address</strong> (Optional) - Auto-generated if blank</li>
                              <li><strong>Date of Employment</strong> (Optional) - YYYY-MM-DD format</li>
                              <li><strong>Date Joined to Site</strong> (Optional) - YYYY-MM-DD format</li>
                              <li><strong>Remarks</strong> (Optional) - Custom notes or remarks</li>
                            </ul>
                          </div>

                          <button
                            onClick={() => {
                              // Create and download sample spreadsheet template with Status
                              const ws = XLSX.utils.json_to_sheet([
                                {
                                  "Staff Name": "Tan Ah Kow",
                                  "Designation": "Safety Officer",
                                  "Site": "Kallang Site",
                                  "Role": "Employee",
                                  "Status": "Active",
                                  "Last Date of Work": "",
                                  "Email Address": "ahkow@weehur.com.sg",
                                  "Date of Employment": "2024-01-15",
                                  "Date Joined to Site": "2024-02-01",
                                  "Remarks": "Completed Safety Level 3 Training"
                                },
                                {
                                  "Staff Name": "Lim Kiat",
                                  "Designation": "Project Manager",
                                  "Site": "Changi Airport T5",
                                  "Role": "Admin",
                                  "Status": "Active",
                                  "Last Date of Work": "",
                                  "Email Address": "limkiat@weehur.com.sg",
                                  "Date of Employment": "2022-03-10",
                                  "Date Joined to Site": "2022-04-15",
                                  "Remarks": "Overseeing Runway Project"
                                },
                                {
                                  "Staff Name": "Ahmad Bin Rosli",
                                  "Designation": "Site Engineer",
                                  "Site": "Keppel C2",
                                  "Role": "Employee",
                                  "Status": "Resigned",
                                  "Last Date of Work": "2026-05-31",
                                  "Email Address": "ahmad@weehur.com.sg",
                                  "Date of Employment": "2021-08-01",
                                  "Date Joined to Site": "2021-09-01",
                                  "Remarks": "Completed contract handover"
                                }
                              ]);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, "Template");
                              XLSX.writeFile(wb, "WeeHur_Staff_Import_Template.xlsx");
                            }}
                            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors border border-slate-150 dark:border-slate-800 cursor-pointer text-center"
                          >
                            Download Sample Excel Template
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search and Dropdown Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
                  
                  <div className="sm:col-span-8 relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search colleagues by name, staff ID, designation, or remarks..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4 relative flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={selectedSiteFilter}
                      onChange={(e) => setSelectedSiteFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="All">{isAdmin ? 'All Sites' : 'All Allowable Sites'}</option>
                      {availableSitesFilterList.map(sName => (
                        <option key={sName} value={sName}>{sName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* DIRECTORY VIEW TOGGLE (All, Active, Resigned) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 bg-slate-50 dark:bg-slate-900/20 p-2 rounded-xl border border-slate-150 dark:border-slate-800/80" id="directory-status-selector">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setDirectoryStatusFilter('All')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                        directoryStatusFilter === 'All'
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-white dark:bg-[#0B132B] hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      All Staff ({employees.length})
                    </button>
                    <button
                      onClick={() => setDirectoryStatusFilter('Active')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                        directoryStatusFilter === 'Active'
                          ? 'bg-green-600 text-white border-green-600 shadow-sm'
                          : 'bg-white dark:bg-[#0B132B] hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Active ({employees.filter(e => e.status === 'Active').length})
                    </button>
                    <button
                      onClick={() => setDirectoryStatusFilter('Resigned')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 ${
                        directoryStatusFilter === 'Resigned'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white dark:bg-[#0B132B] hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      Resigned ({employees.filter(e => e.status === 'Resigned').length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Switcher (Table vs Cards) */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-white dark:bg-slate-950">
                      <button
                        onClick={() => setDirectoryViewMode('table')}
                        className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                          directoryViewMode === 'table'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Spreadsheet Table View"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span>Table</span>
                      </button>
                      <button
                        onClick={() => setDirectoryViewMode('cards')}
                        className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                          directoryViewMode === 'cards'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title="Cards Grid View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </button>
                    </div>

                    {directoryViewMode === 'cards' && filteredEmployeesForActiveUser.length > 0 && (
                      <button
                        onClick={handleExpandAllStaff}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5"
                      >
                        {expandedStaffEmails.length >= filteredEmployeesForActiveUser.length ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Collapse All</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Expand All</span>
                          </>
                        )}
                      </button>
                    )}

                    {canEdit && filteredEmployeesForActiveUser.length > 0 && (
                      <button
                        onClick={() => handleSelectAllStaffForDelete(filteredEmployeesForActiveUser.map(e => e.email))}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-red-500" />
                        <span>
                          {filteredEmployeesForActiveUser.every(e => selectedStaffForDelete.includes(e.email))
                            ? 'Deselect All'
                            : 'Select All'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SPREADSHEET TABLE VIEW OR CARD GRID VIEW */}
                {directoryViewMode === 'table' ? (
                  <div className="overflow-x-auto bg-white dark:bg-[#0B132B] rounded-xl border-2 border-slate-300 dark:border-slate-800 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-extrabold text-xs uppercase tracking-wider">
                            {canEdit && (
                            <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 w-10 text-center">
                              <input
                                type="checkbox"
                                checked={filteredEmployeesForActiveUser.length > 0 && filteredEmployeesForActiveUser.every(e => isStaffSelected(e))}
                                onChange={() => handleSelectAllStaffForDelete(filteredEmployeesForActiveUser.map(e => e.email || e.id))}
                                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                              />
                            </th>
                          )}
                          <th className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700">Staff Name</th>
                          <th className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700">Designation</th>
                          <th className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-700">Work Site</th>
                          <th className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-center w-24">Status</th>
                          <th className="py-2.5 px-3 text-center w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 dark:divide-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {filteredEmployeesForActiveUser.map((emp) => {
                          const isSelected = isStaffSelected(emp);
                          const siteLabel = emp.workSites && emp.workSites.length > 0 
                            ? emp.workSites.join(', ') 
                            : (emp.department || 'CORPORATE');

                          return (
                            <tr 
                              key={emp.id || emp.email}
                              onClick={() => setSelectedColleague(emp)}
                              className={`hover:bg-blue-50/80 dark:hover:bg-slate-900/80 transition-colors cursor-pointer border-b border-slate-300 dark:border-slate-800 ${
                                isSelected ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                              }`}
                            >
                              {canEdit && (
                                <td className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectStaffForDelete(emp.email || emp.id)}
                                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                  />
                                </td>
                              )}
                              <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-800 font-bold text-slate-950 dark:text-white uppercase tracking-tight">
                                {emp.fullName}
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                                {emp.designation}
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-300 dark:border-slate-800 font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                                {siteLabel}
                              </td>
                              <td className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-800 text-center" onClick={(e) => e.stopPropagation()}>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  emp.status === 'Active' ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                                }`}>
                                  {emp.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => setSelectedColleague(emp)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-[10px] font-black uppercase transition-colors cursor-pointer"
                                    title="View Badge Profile"
                                  >
                                    Badge
                                  </button>
                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingEmployee(emp);
                                          setIsEmpModalOpen(true);
                                        }}
                                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                                        title="Edit Staff Record"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEmployee(emp.email || emp.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                                        title="Delete Staff Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredEmployeesForActiveUser.length === 0 && (
                          <tr>
                            <td colSpan={canEdit ? 6 : 5} className="py-12 text-center text-slate-400 font-bold uppercase text-xs">
                              No matching staff records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Directory Card Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployeesForActiveUser.map(emp => {
                      const isExpanded = expandedStaffEmails.includes(emp.email);

                      return (
                        <div 
                          key={emp.id || emp.email}
                          onClick={() => toggleExpandStaff(emp.email || emp.id)}
                          className={`bg-white dark:bg-[#0B132B] rounded-2xl border p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative cursor-pointer ${
                            isStaffSelected(emp) ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20 dark:bg-red-950/10' : 'border-slate-150 dark:border-slate-800'
                          }`}
                        >
                          {/* Card Header Bar: Selection Box, Status, Expand/Collapse Toggle */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            {canEdit ? (
                              <label className="flex items-center gap-1.5 cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isStaffSelected(emp)}
                                  onChange={() => toggleSelectStaffForDelete(emp.email || emp.id)}
                                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                                />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                  Select
                                </span>
                              </label>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  emp.status === 'Active' ? 'bg-green-500' : emp.status === 'Resigned' ? 'bg-red-500' : 'bg-amber-500'
                                }`} />
                                <span className="text-[10px] font-bold uppercase text-slate-400">{emp.status}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <span className={`w-2.5 h-2.5 rounded-full ${
                                  emp.status === 'Active' ? 'bg-green-500' : emp.status === 'Resigned' ? 'bg-red-500' : 'bg-amber-500'
                                }`} title={emp.status} />
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandStaff(emp.email);
                                }}
                                className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                              </button>
                            </div>
                          </div>

                          {/* Collapsed / Main Card View (Name, Designation, Site) */}
                          <div className="flex gap-3.5 items-start">
                            {hasValidPhoto(emp.photoUrl) ? (
                              <img 
                                src={emp.photoUrl} 
                                alt={emp.fullName}
                                className="w-14 h-14 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                <User className="w-7 h-7" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-black uppercase text-slate-950 dark:text-white truncate" title={emp.fullName}>
                                {emp.fullName}
                              </h3>
                              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide truncate mt-0.5">
                                {emp.designation}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                                <span className="text-slate-400 font-bold uppercase">Site:</span>
                                <span className="font-extrabold text-blue-600 dark:text-blue-400 truncate bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                                  {emp.workSites && emp.workSites.length > 0 ? emp.workSites.join(', ') : 'Unassigned'}
                                </span>
                              </div>
                              {emp.status === 'Resigned' && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 tracking-wider">
                                  Resigned
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expandable Details Section */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-[10px] text-slate-500">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Email:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-300 truncate max-w-[160px]">{emp.email}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Staff ID:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-300">{emp.employeeId}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Date of Employment:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-300">{displayFormattedDate(emp.dateJoined)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400 font-semibold">Joined Site Date:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-300">{displayFormattedDate(emp.dateJoinedProject, 'N/A')}</span>
                                  </div>
                                  {emp.remarks && (
                                    <div className="text-[9px] text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded border border-slate-100 dark:border-slate-800 mt-1 truncate" title={emp.remarks}>
                                      <strong>Remarks:</strong> {emp.remarks}
                                    </div>
                                  )}
                                  {emp.status === 'Resigned' && (
                                    <div className="flex justify-between text-red-600 dark:text-red-400 font-bold pt-1">
                                      <span>Last Working Day:</span>
                                      <span>{emp.lastDateOfWork || 'Not Listed'}</span>
                                    </div>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedColleague(emp);
                                      }}
                                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                                    >
                                      View ID Profile
                                    </button>

                                    {canEdit && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingEmployee(emp);
                                            setIsEmpModalOpen(true);
                                          }}
                                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEmployee(emp.email || emp.id);
                                          }}
                                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                                          title="Delete Staff permanently"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>Delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    {filteredEmployeesForActiveUser.length === 0 && (
                      <div className="col-span-full py-16 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-400 uppercase">No colleague matches found.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Try altering search parameters or selected filters.</p>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

            {/* ==================== 3. TAB: WORK SITES ==================== */}
            {activeTab === 'sites' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="tab-sites"
              >
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-wider text-slate-950 dark:text-white">
                        Work Site Directory
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Directory list of corporate operational sectors.
                      </p>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingSite(null); setIsSiteModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Site</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Site Grid Card list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sites.map(site => {
                    const siteStaffCount = employees.filter(e => e.workSites.includes(site.name)).length;
                    const isConfirmingDelete = deletingSiteId === site.id;

                    return (
                      <div 
                        key={site.id}
                        className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all h-[170px]"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600">
                              <MapPin className="w-5 h-5" />
                            </div>
                            
                            {canEdit && (
                              <div className="flex items-center gap-1.5">
                                {isConfirmingDelete ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDeleteSite(site.id)}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[8px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                                      title="Confirm Delete"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeletingSiteId(null)}
                                      className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 rounded text-[8px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingSite(site);
                                        setIsSiteModalOpen(true);
                                      }}
                                      className="p-1 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/20 text-slate-400 transition-colors cursor-pointer text-[9px] font-extrabold uppercase tracking-wide px-2"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => setDeletingSiteId(site.id)}
                                      className="p-1 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 text-slate-400 transition-colors cursor-pointer text-[9px] font-extrabold uppercase tracking-wide px-2"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white truncate" title={site.name}>
                              {site.name}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5 truncate">
                              Active Operational Sector
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[10px] mt-auto">
                          <span className="text-slate-400 font-bold uppercase">Staff Allocated</span>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">{siteStaffCount} Employees</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </motion.div>
            )}

            {/* ==================== 4. TAB: ANNOUNCEMENTS ==================== */}
            {activeTab === 'announcements' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="tab-announcements"
              >
                 {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-wider text-slate-950 dark:text-white">
                        Company Announcements Board
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Internal corporate updates and news broadcasts.
                      </p>
                    </div>
                  </div>
                  
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingAnnouncement(null); setIsAnnounceModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Post Announcement</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* News List */}
                <div className="space-y-4 max-w-3xl">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id}
                      className="bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-150 dark:border-slate-800 p-6 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5 flex-1">
                          <h3 className="text-sm font-black uppercase tracking-tight text-slate-950 dark:text-white">
                            {ann.title}
                          </h3>
                          <div className="flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase">
                            <span>Posted on: {new Date(ann.createdAt).toLocaleDateString()}</span>
                            <span>&bull;</span>
                            <span className="text-blue-600 dark:text-blue-400">By: {ann.authorName}</span>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingAnnouncement(ann);
                                setIsAnnounceModalOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Edit Announcement"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-50 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <FormattedAnnouncement content={ann.content} />
                      </div>
                    </div>
                  ))}

                  {announcements.length === 0 && (
                    <div className="py-16 text-center bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-150 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400">No active bulletins published.</p>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* ==================== 5. TAB: LOGIN AUDIT LOGS (ADMIN ONLY) ==================== */}
            {activeTab === 'audit' && isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
                id="tab-audit"
              >
                {/* Header Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="Back to Dashboard"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-wider text-slate-950 dark:text-white">
                        Access Audit Logs (Recent Successful Logins)
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Real-time login history monitoring.
                      </p>
                    </div>
                  </div>
                  

                </div>

                {/* Audit Logs Table */}
                <div className="bg-white dark:bg-[#0B132B] rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="px-6 py-4">User Details</th>
                          <th className="px-6 py-4">Auth Role</th>
                          <th className="px-6 py-4">Timestamp</th>
                          <th className="px-6 py-4">Device Reference</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-slate-700 dark:text-slate-300 divide-y divide-slate-50 dark:divide-slate-800/85">
                        {loginHistory.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-950 dark:text-white">{log.fullName}</p>
                              <p className="text-[10px] text-slate-400">{log.email}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                log.role === 'Admin' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                              }`}>
                                {log.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-[9px] text-slate-400 max-w-[240px] truncate" title={log.deviceInfo}>
                              {log.deviceInfo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {loginHistory.length === 0 && (
                    <div className="py-12 text-center text-slate-400 italic">
                      No active security login records.
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* FLOATING BATCH SELECTION & DELETION BAR (SUPER ADMIN ONLY) */}
      <AnimatePresence>
        {canEdit && selectedStaffForDelete.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white dark:bg-slate-950 dark:border dark:border-slate-800 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 max-w-[95vw] sm:max-w-auto"
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-red-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                {selectedStaffForDelete.length} Staff Selected
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <button
              onClick={handleDeleteSelectedStaff}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedStaffForDelete.length})</span>
            </button>
            <button
              onClick={() => setSelectedStaffForDelete([])}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== MODALS MATRIX ==================== */}
      
      {/* 1. COLLEAGUE ID DETAIL SHEET */}
      <AnimatePresence>
        {selectedColleague && (
          <motion.div 
            id="colleague-profile-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedColleague(null);
            }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-xs"
          >
            <motion.div 
              id="colleague-profile-modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-[#0B132B] rounded-3xl w-full max-w-md border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              
              {/* Front Header */}
              <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider">Colleague Badge Viewer</span>
                <button 
                  onClick={() => setSelectedColleague(null)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-center">
                
                <DigitalIDCard employee={selectedColleague} />

                {/* Extra Details sheet */}
                <div className="w-full space-y-3.5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-xs border border-slate-150 dark:border-slate-800">
                  <h4 className="font-black text-slate-950 dark:text-white uppercase tracking-wider text-[10px] text-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    Secure Profile Card Details
                  </h4>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[11px]">
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block">EMAIL ADDRESS</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block" title={selectedColleague.email}>{selectedColleague.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">EMPLOYMENT DATE</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{displayFormattedDate(selectedColleague.dateJoined)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">DATE JOINED TO SITE</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{displayFormattedDate(selectedColleague.dateJoinedProject, 'N/A')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">STATUS</span>
                      <span className={`font-extrabold ${
                        selectedColleague.status === 'Active' 
                          ? 'text-green-500' 
                          : selectedColleague.status === 'Resigned'
                          ? 'text-red-500'
                          : 'text-amber-500'
                      }`}>{selectedColleague.status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block">REMARKS</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 block whitespace-pre-wrap">{selectedColleague.remarks || 'No remarks provided'}</span>
                    </div>
                    {selectedColleague.status === 'Resigned' && (
                      <div className="col-span-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                        <span className="text-red-500 font-black block text-[9px] uppercase tracking-wider">LAST DATE OF WORK</span>
                        <span className="font-extrabold text-red-600 dark:text-red-400 text-xs">{selectedColleague.lastDateOfWork || 'Not specified'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="w-full flex gap-2">
                    <button
                      onClick={() => {
                        const email = selectedColleague.email;
                        setSelectedColleague(null);
                        handleAdminResetPassword(email);
                      }}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => {
                        const targetId = selectedColleague.email || selectedColleague.id;
                        setSelectedColleague(null);
                        handleDeleteEmployee(targetId);
                      }}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Delete Profile
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ADMIN REGISTER/EDIT STAFF MODAL */}
      <AddEmployeeModal 
        isOpen={isEmpModalOpen}
        onClose={() => { setIsEmpModalOpen(false); setEditingEmployee(null); }}
        onSave={handleSaveEmployee}
        editingEmployee={editingEmployee}
        sites={sites}
      />

      {/* 3. ADMIN ADD SITES MODAL */}
      <AddSiteModal 
        isOpen={isSiteModalOpen}
        onClose={() => { setIsSiteModalOpen(false); setEditingSite(null); }}
        onSave={handleSaveSite}
        editingSite={editingSite}
      />

      {/* 4. ADMIN ADD / EDIT ANNOUNCEMENT MODAL */}
      <AddAnnouncementModal 
        isOpen={isAnnounceModalOpen}
        onClose={() => { setIsAnnounceModalOpen(false); setEditingAnnouncement(null); }}
        onSave={handleSaveAnnouncement}
        editingAnnouncement={editingAnnouncement}
      />

      {/* 5. SITE COWORKERS DIRECTORY MODAL */}
      <CoworkersModal 
        isOpen={isCoworkersModalOpen}
        onClose={() => setIsCoworkersModalOpen(false)}
        currentUserProfile={currentUserProfile}
        employees={employees}
        onSelectColleague={(emp) => {
          setSelectedColleague(emp);
          setIsCoworkersModalOpen(false);
        }}
      />

      {/* 6. ADMIN IN-APP DELETE CONFIRMATION MODAL */}
      <ConfirmDeleteModal 
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        description={deleteModalState.description}
        items={deleteModalState.items}
        isLoading={deleteModalState.isLoading}
        onConfirm={deleteModalState.onConfirm}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* 7. GLOBAL IN-APP TOAST NOTIFICATION */}
      <ToastNotification 
        toast={toastState}
        onClose={() => setToastState(null)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
