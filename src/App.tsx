import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Globe,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Download,
  Share2,
  Sun,
  Moon,
  ToggleLeft,
  ToggleRight,
  Bell,
  Menu,
  Check,
  ChevronRight,
  RefreshCw,
  QrCode,
  AlertCircle,
  FileText,
  Search,
  ExternalLink,
  Users,
  Copy,
  LogOut,
  Sparkles,
  Camera,
  X,
  Scan
} from 'lucide-react';
import { Employee, AppSettings } from './types';
import {
  fetchEmployees,
  fetchEmployeeByEmail,
  saveEmployeeRecord,
  deleteEmployeeRecord,
  getActiveUser,
  setMockUser,
  logoutUser,
  tryInitializeFirebase,
  getLocalStorageEmployees
} from './lib/firebase';
import WeehurLogo from './components/WeehurLogo';
import FlipCard from './components/FlipCard';
import PhysicalCardMockup from './components/PhysicalCardMockup';
import { downloadVCard, downloadIDCardAsPNG } from './lib/cardUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function App() {
  // Application states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'id_card' | 'profile' | 'contact' | 'settings'>('id_card');
  const [customSites, setCustomSites] = useState<string[]>(() => {
    const stored = localStorage.getItem('weehur_custom_sites');
    return stored ? JSON.parse(stored) : ['Weehur Main Site', 'Changi East Site', 'Head Office'];
  });
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState('');
  const [editedSiteName, setEditedSiteName] = useState('');
  const [isUpdatingSite, setIsUpdatingSite] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  useEffect(() => {
    localStorage.setItem('weehur_custom_sites', JSON.stringify(customSites));
  }, [customSites]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Public Scan View simulation
  const [simulatedPublicView, setSimulatedPublicView] = useState<string | null>(null); // holds email of public profile
  const [qrMode, setQrMode] = useState<'public' | 'dev'>('public');

  // ID Scanner state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [activeScanTab, setActiveScanTab] = useState<'camera' | 'simulated'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStream, setScanStream] = useState<MediaStream | null>(null);
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [simulatedSelectedEmail, setSimulatedSelectedEmail] = useState('');
  
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Play a beautiful QR scan success beep using Web Audio API
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.log('Audio scan beep played silently:', e);
    }
  };

  // Handle active camera streaming
  useEffect(() => {
    if (isScanOpen && activeScanTab === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          setScanStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
          setCameraError(null);
        })
        .catch(err => {
          console.error('Camera access error:', err);
          setCameraError('Camera access denied or unsupported. Redirecting to our high-fidelity scan simulation environment.');
          setActiveScanTab('simulated');
        });
    } else {
      if (scanStream) {
        scanStream.getTracks().forEach(track => track.stop());
        setScanStream(null);
      }
    }
    return () => {
      if (scanStream) {
        scanStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
    };
  }, [isScanOpen, activeScanTab]);

  // Admin Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({
    employeeId: '',
    fullName: '',
    designation: '',
    mobile: '',
    email: '',
    site: 'Head Office',
    nationality: 'Singaporean',
    dateOfJoining: '',
    emergencyContact: '',
    photoUrl: '',
    activeStatus: true,
    isAdmin: false
  });

  // Load all initial employee records
  const loadRecords = async () => {
    setIsLoadingRecords(true);
    let records: Employee[] = [];
    try {
      records = await fetchEmployees();
      setEmployees(records);
    } catch (err) {
      console.warn('Listing employees from Firebase is restricted or offline. Falling back to secure cache.');
      records = getLocalStorageEmployees();
      setEmployees(records);
    }

    try {
      // Get currently signed-in user or default to chakra
      const active = getActiveUser();
      setCurrentUser(active);

      // Secure public QR code scan lookup:
      // If a public view is requested, fetch the single active employee document from Firestore.
      // Unauthenticated users are allowed to 'get' individual active records, avoiding 'list' errors.
      const params = new URLSearchParams(window.location.search);
      const isPublic = params.get('public') === 'true';
      const emailParam = params.get('email');

      if (isPublic && emailParam) {
        const liveEmp = await fetchEmployeeByEmail(emailParam);
        if (liveEmp) {
          // Upsert the live employee profile so it is verified correctly from Firestore
          setEmployees(prev => {
            const filtered = prev.filter(e => e.email.toLowerCase() !== emailParam.toLowerCase());
            return [...filtered, liveEmp];
          });
        }
      }

      // Find current employee's record
      const myRecord = records.find(e => e.email.toLowerCase() === active.email.toLowerCase());
      if (myRecord) {
        setSelectedEmployee(myRecord);
      } else if (records.length > 0) {
        // Fallback to first
        setSelectedEmployee(records[0]);
      }
    } catch (err) {
      console.error('Error post-processing loaded records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Sync state when active user changes
  const handleUserChange = (email: string) => {
    setMockUser(email);
    const active = getActiveUser();
    setCurrentUser(active);
    const emp = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (emp) {
      setSelectedEmployee(emp);
    }
    showToast(`Signed in as ${emp?.fullName || email}`, 'success');
  };

  const triggerLogout = async () => {
    await logoutUser();
    localStorage.removeItem('weehur_mock_auth');
    const active = getActiveUser();
    setCurrentUser(active);
    const emp = employees.find(e => e.email.toLowerCase() === active.email.toLowerCase());
    if (emp) setSelectedEmployee(emp);
    showToast('Logged out of digital identity session.', 'info');
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    
    // Check file size (limit to 1.5MB for base64 storage)
    if (file.size > 1.5 * 1024 * 1024) {
      showToast('Photo is too large. Please select an image under 1.5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, photoUrl: result }));
        showToast('Photo uploaded and loaded successfully!', 'success');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read image file.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Create or Update operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName || !formData.employeeId) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    // Default placeholder photo if empty
    const updatedPhoto = formData.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
    const finalRecord: Employee = {
      id: formData.email,
      employeeId: formData.employeeId,
      fullName: formData.fullName.toUpperCase(),
      designation: formData.designation?.toUpperCase() || 'STAFF',
      mobile: formData.mobile || '+65 9123 4567',
      email: formData.email,
      site: formData.site || 'Weehur Main Site',
      nationality: formData.nationality || 'Singaporean',
      dateOfJoining: formData.dateOfJoining || new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }),
      emergencyContact: formData.emergencyContact || '+65 6789 1234',
      photoUrl: updatedPhoto,
      qrCodeUrl: `${getSharedBaseUrl()}?public=true&email=${formData.email}`,
      activeStatus: formData.activeStatus !== undefined ? formData.activeStatus : true,
      isAdmin: formData.isAdmin !== undefined ? formData.isAdmin : false
    };

    try {
      await saveEmployeeRecord(finalRecord);
      await loadRecords();
      setShowAddModal(false);
      setShowEditModal(false);
      showToast(`Employee record for ${finalRecord.fullName} saved successfully!`, 'success');
    } catch (err) {
      showToast('Permission denied or invalid schema config.', 'error');
    }
  };

  const handleEditClick = (emp: Employee) => {
    setFormData(emp);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (email: string) => {
    if (window.confirm(`Are you sure you want to permanently delete record for ${email}?`)) {
      try {
        await deleteEmployeeRecord(email);
        await loadRecords();
        showToast('Employee record permanently removed.', 'info');
      } catch (err) {
        showToast('Only administrators can remove employees.', 'error');
      }
    }
  };

  const toggleEmployeeActive = async (emp: Employee) => {
    const updated = { ...emp, activeStatus: !emp.activeStatus };
    try {
      await saveEmployeeRecord(updated);
      await loadRecords();
      showToast(`Employee ID status set to ${updated.activeStatus ? 'CONFIRMED (VALID)' : 'RESIGNED (INVALID)'}.`, 'info');
    } catch (err) {
      showToast('Admin authority required to modify status.', 'error');
    }
  };

  const handleEditSiteName = async (e: React.FormEvent) => {
    e.preventDefault();
    const oldName = siteToEdit.trim();
    const newName = editedSiteName.trim();

    if (!newName) {
      showToast('Site name cannot be empty.', 'error');
      return;
    }

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      setShowEditSiteModal(false);
      return;
    }

    if (sitesList.some(s => s.toLowerCase() === newName.toLowerCase() && s !== oldName)) {
      showToast('This site name already exists.', 'error');
      return;
    }

    setIsUpdatingSite(true);
    try {
      // 1. Update the customSites list
      const updatedCustom = customSites.map(s => s === oldName ? newName : s);
      if (!customSites.includes(oldName)) {
        updatedCustom.push(newName);
      }
      setCustomSites(updatedCustom);
      localStorage.setItem('weehur_custom_sites', JSON.stringify(updatedCustom));

      // 2. Update all employee records at the old site
      const affectedEmployees = employees.filter(emp => emp.site === oldName);
      let successCount = 0;
      
      for (const emp of affectedEmployees) {
        try {
          await saveEmployeeRecord({
            ...emp,
            site: newName
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to update employee ${emp.fullName}:`, err);
        }
      }

      // 3. Reload everything
      await loadRecords();

      // 4. Update the siteFilter if it was set to the old site
      if (siteFilter === oldName) {
        setSiteFilter(newName);
      }

      showToast(`Site renamed to "${newName}". ${successCount} staff member(s) transferred!`, 'success');
      setShowEditSiteModal(false);
    } catch (err) {
      showToast('Error updating work site name.', 'error');
    } finally {
      setIsUpdatingSite(false);
    }
  };

  const handleDeleteSite = async (siteName: string) => {
    if (!hasFullAccess) {
      showToast('Super Admin authority required to delete sites.', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete the work site "${siteName}"? All employees currently assigned to this site will be set to "Unassigned".`)) {
      try {
        // 1. Remove from customSites list
        const updatedCustom = customSites.filter(s => s !== siteName);
        setCustomSites(updatedCustom);
        localStorage.setItem('weehur_custom_sites', JSON.stringify(updatedCustom));

        // 2. Update any employee assigned to this site
        const affectedEmployees = employees.filter(emp => emp.site === siteName);
        let successCount = 0;
        for (const emp of affectedEmployees) {
          try {
            await saveEmployeeRecord({
              ...emp,
              site: '' // Unassign
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to clear site for employee ${emp.fullName}:`, err);
          }
        }

        // 3. Reload everything
        await loadRecords();

        // 4. Reset siteFilter if it was set to the deleted site
        if (siteFilter === siteName) {
          setSiteFilter('');
        }

        showToast(`Site "${siteName}" deleted. ${successCount} staff member(s) unassigned!`, 'success');
      } catch (err) {
        showToast('Error deleting work site.', 'error');
      }
    }
  };

  const handleShare = (emp: Employee) => {
    const shareText = `Weehur Construction Digital ID Card:\nName: ${emp.fullName}\nID: ${emp.employeeId}\nDesignation: ${emp.designation}\nVerify at: ${getSharedBaseUrl()}?public=true&email=${emp.email}`;
    if (navigator.share) {
      navigator.share({
        title: 'Weehur Digital ID',
        text: shareText,
        url: getSharedBaseUrl()
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('ID Profile text copied to clipboard!', 'success');
    }
  };

  const exportEmployees = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(employees, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "weehur_employees_export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported employee directory to JSON.', 'success');
  };

  const handleScanDetect = (emp: Employee) => {
    playBeep();
    showToast(`Successfully scanned ${emp.fullName}'s ID Card!`, 'success');
    setIsScanOpen(false);
    setSimulatedPublicView(emp.email);
  };

  // Catch direct public scan routes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPublic = params.get('public');
    const emailParam = params.get('email');
    if (isPublic === 'true' && emailParam) {
      setSimulatedPublicView(emailParam);
    }
  }, []);

  // Helper to construct a public shareable URL, auto-bypassing the 403 Forbidden dev restriction in AI Studio
  const getSharedBaseUrl = () => {
    const origin = window.location.origin;
    // Replace 'ais-dev-' with 'ais-pre-' to generate the public Shared App URL
    if (window.location.hostname.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    return origin;
  };

  const simulatedScanUrl = selectedEmployee 
    ? `${qrMode === 'public' ? getSharedBaseUrl() : window.location.origin}?public=true&email=${selectedEmployee.email}`
    : '';

  // Determine user authorization roles
  const isRootSuperAdmin = currentUser?.email?.toLowerCase() === 'chakra@weehur.com.sg';
  const currentUserRecord = employees.find(e => e.email.toLowerCase() === currentUser?.email?.toLowerCase());
  
  // Only the root super admin (chakra@weehur.com.sg) or accounts explicitly set as Admin in the db have administrative panel / write access
  const hasFullAccess = isRootSuperAdmin || currentUserRecord?.isAdmin === true;

  // Check if the current URL parameters indicate a public QR scan view
  const isFromQRScan = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('public') === 'true' && !!params.get('email');
  }, []);

  // Restrict employee visibility for regular staff
  const accessibleEmployees = hasFullAccess 
    ? employees 
    : employees.filter(e => e.email.toLowerCase() === currentUser?.email?.toLowerCase());

  // Filter list
  const filteredEmployees = accessibleEmployees.filter(e => {
    const matchesSearch = e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = !siteFilter || e.site === siteFilter;
    return matchesSearch && matchesSite;
  });

  // List of all sites, including default pre-populated ones and custom-created ones
  const sitesList = React.useMemo(() => {
    const employeeSites = employees.map(e => e.site).filter(Boolean);
    const combined = Array.from(new Set([...customSites, ...employeeSites]));
    return combined.sort();
  }, [employees, customSites]);

  const uniqueSites = sitesList;

  // Dynamic workforce distribution calculation for Recharts
  const siteDistributionData = React.useMemo(() => {
    const siteCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const siteName = emp.site || 'Other/Unknown';
      siteCounts[siteName] = (siteCounts[siteName] || 0) + 1;
    });
    return Object.entries(siteCounts).map(([name, value]) => ({
      name,
      count: value
    }));
  }, [employees]);

  // Handle Standalone Public Profile Verification Loading State
  if (isLoadingRecords && simulatedPublicView) {
    return (
      <div className={`min-h-screen flex flex-col justify-between ${isDarkMode ? 'bg-[#060F1D] text-slate-100' : 'bg-[#F3F4F6] text-slate-800'}`}>
        <header className="sticky top-0 z-40 bg-[#0B1F3A] dark:bg-[#060F1D] py-4 px-6 border-b border-[#1F2937] shadow-lg text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <WeehurLogo className="h-9" light={true} />
            <div className="hidden sm:block border-l border-white/20 pl-3">
              <span className="text-[10px] font-black tracking-widest text-[#D71920] block">STAFF VERIFICATION PORTAL</span>
              <span className="text-[9px] text-gray-400 font-bold tracking-wider block">WEE HUR CONSTRUCTION PTE LTD</span>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4 bg-white dark:bg-[#0B1F3A] p-10 rounded-[32px] shadow-2xl border border-gray-200 dark:border-slate-800 max-w-sm w-full text-center">
            <RefreshCw className="w-12 h-12 text-[#D71920] animate-spin" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0B1F3A] dark:text-white">Verifying Identity...</h3>
            <p className="text-xs text-gray-400 font-medium">Please wait while we establish a secure cryptographic handshake with the Wee Hur Staff Directory.</p>
          </div>
        </main>
        <footer className="bg-slate-900 border-t border-slate-850 py-5 px-4 text-center text-slate-500">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">
            WEE HUR CONSTRUCTION PTE LTD • CORPORATE SECURITY COMPLIANCE
          </p>
        </footer>
      </div>
    );
  }

  // Handle Standalone Public Profile Verification (QR code scans)
  if (simulatedPublicView) {
    const publicEmp = employees.find(e => e.email.toLowerCase() === simulatedPublicView.toLowerCase());
    const isValid = publicEmp && publicEmp.activeStatus !== false;

    return (
      <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-between ${isDarkMode ? 'bg-[#060F1D] text-slate-100' : 'bg-[#F3F4F6] text-slate-800'}`}>
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border bg-[#0B1F3A] text-white animate-bounce" id="toast-notif">
            {toast.type === 'success' && <Check className="w-5 h-5 text-green-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <Sparkles className="w-5 h-5 text-blue-400" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        )}

        {/* TOP BRAND BAR */}
        <header className="sticky top-0 z-40 bg-[#0B1F3A] dark:bg-[#060F1D] py-4 px-6 border-b border-[#1F2937] shadow-lg text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <WeehurLogo className="h-9" light={true} />
            <div className="hidden sm:block border-l border-white/20 pl-3">
              <span className="text-[10px] font-black tracking-widest text-[#D71920] block">STAFF VERIFICATION PORTAL</span>
              <span className="text-[9px] text-gray-400 font-bold tracking-wider block">WEE HUR CONSTRUCTION PTE LTD</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>
            {!isFromQRScan && (
              <button
                onClick={() => {
                  setSimulatedPublicView(null);
                  window.history.pushState({}, document.title, window.location.pathname);
                }}
                className="bg-white/10 hover:bg-[#D71920] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold text-gray-300 transition-all uppercase tracking-wider flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit View</span>
              </button>
            )}
          </div>
        </header>

        {/* STANDALONE CONTENT */}
        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-slate-800 animate-fade-in flex flex-col">
            {!publicEmp ? (
              <>
                <div className="bg-red-700 px-6 py-5 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 bg-white text-red-700 rounded-full p-0.5" />
                    <span className="font-extrabold text-sm tracking-widest uppercase">ID Not Found</span>
                  </div>
                </div>
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col justify-center items-center my-8">
                  <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Access Denied</h3>
                  <p className="font-semibold text-xs mt-2 text-gray-400 max-w-xs">The staff member profile you scanned was not found or is no longer active in our database.</p>
                  
                  {!isFromQRScan && (
                    <button
                      onClick={() => {
                        setSimulatedPublicView(null);
                        window.history.pushState({}, document.title, window.location.pathname);
                      }}
                      className="mt-6 px-6 py-3 bg-[#0B1F3A] hover:bg-[#D71920] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
                    >
                      Return to Portal
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={`${isValid ? 'bg-green-600' : 'bg-red-700'} px-6 py-4.5 text-white flex justify-between items-center shadow-md`}>
                  <div className="flex items-center gap-2.5">
                    {isValid ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-100 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-200"></span>
                        </span>
                        <span className="font-black text-[11px] tracking-widest uppercase">VERIFIED STAFF IDENTITY</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 bg-white text-red-700 rounded-full p-0.5" />
                        <span className="font-black text-[11px] tracking-widest uppercase">INVALID / REVOKED BADGE</span>
                      </>
                    )}
                  </div>
                  <span className="text-[9px] bg-white/20 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                    {isValid ? 'ACTIVE' : 'REVOKED'}
                  </span>
                </div>

                <div className="p-6 flex flex-col items-center">
                  {!isValid && (
                    <div className="w-full mb-4 p-3 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-xl text-center font-black text-[10px] uppercase tracking-wider border border-red-200 dark:border-red-950/30 flex items-center justify-center gap-2 animate-pulse">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>STAFF HAS RESIGNED - BADGE DEACTIVATED</span>
                    </div>
                  )}

                  <div className="mb-4">
                    <FlipCard
                      photoUrl={publicEmp.photoUrl}
                      fullName={publicEmp.fullName}
                      qrValue={`${getSharedBaseUrl()}?public=true&email=${publicEmp.email}`}
                    />
                  </div>

                  <h2 className={`text-xl font-black ${isValid ? 'text-slate-800 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through'} uppercase tracking-tight text-center leading-snug`}>
                    {publicEmp.fullName}
                  </h2>
                  <p className={`text-sm font-extrabold ${isValid ? 'text-red-600' : 'text-red-400'} uppercase tracking-widest mt-1`}>
                    {publicEmp.designation}
                  </p>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">{publicEmp.department || 'Projects'}</p>

                  <div className="w-full mt-6 space-y-3 bg-gray-50 dark:bg-slate-900/40 p-4.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center text-xs pb-2.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400 uppercase font-bold text-[10px]">Staff BAS ID</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{publicEmp.employeeId}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400 uppercase font-bold text-[10px]">Deployment Site</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{publicEmp.site}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pb-2.5 border-b border-gray-100 dark:border-gray-800">
                      <span className="text-gray-400 uppercase font-bold text-[10px]">Verified On</span>
                      <span className="font-bold text-slate-500 dark:text-slate-450 font-mono text-[10px]">
                        {new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 uppercase font-bold text-[10px]">Cryptographic Node</span>
                      <span className="font-bold text-[#D71920] font-mono text-[10px] tracking-widest">
                        WH-{publicEmp.employeeId}-{publicEmp.dateOfJoining.split(' ').slice(-1)[0] || '2024'}
                      </span>
                    </div>
                  </div>

                  {/* Public Quick Action Buttons with minimum 44px touch targets */}
                  <div className="grid grid-cols-2 gap-3.5 w-full mt-6">
                    <a
                      href={`tel:${publicEmp.mobile}`}
                      className="flex items-center justify-center gap-2 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                      id="action-call"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>Call Staff</span>
                    </a>
                    <button
                      onClick={() => {
                        downloadVCard(publicEmp);
                        showToast('Staff contact card downloaded.', 'success');
                      }}
                      className="flex items-center justify-center gap-2 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                      id="action-save"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Save Contact</span>
                    </button>
                    <a
                      href={`mailto:${publicEmp.email}`}
                      className="flex items-center justify-center gap-2 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                      id="action-email"
                    >
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>Send Email</span>
                    </a>
                    <button
                      onClick={() => handleShare(publicEmp)}
                      className="flex items-center justify-center gap-2 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                      id="action-share"
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                      <span>Share Card</span>
                    </button>
                  </div>

                  {!isFromQRScan && (
                    <button
                      onClick={() => {
                        setSimulatedPublicView(null);
                        window.history.pushState({}, document.title, window.location.pathname);
                      }}
                      className="mt-6 text-[10px] text-gray-400 hover:text-[#D71920] font-black uppercase tracking-widest transition-colors"
                    >
                      ← Return to main portal
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* BOTTOM BRAND COMPLIANCE FOOTER */}
        <footer className="bg-slate-900 border-t border-slate-850 py-5 px-4 text-center text-slate-500">
          <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">
            WEE HUR CONSTRUCTION PTE LTD • CORPORATE SECURITY COMPLIANCE
          </p>
          <p className="text-[9px] max-w-sm mx-auto text-slate-500 leading-relaxed mt-1 font-semibold uppercase tracking-wider">
            Secure Cryptographic Verification Node ISO 27001 Certified. Verified OK.
          </p>
        </footer>
      </div>
    );
  }

  // Handle Main Portal Loading State
  if (isLoadingRecords && !simulatedPublicView) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#060F1D] text-slate-100' : 'bg-[#F3F4F6] text-slate-800'}`}>
        <div className="flex flex-col items-center gap-4 bg-white dark:bg-[#0B1F3A] p-10 rounded-[32px] shadow-2xl border border-gray-200 dark:border-slate-800 max-w-sm w-full text-center">
          <RefreshCw className="w-12 h-12 text-[#D71920] animate-spin" />
          <h3 className="text-sm font-black uppercase tracking-widest text-[#0B1F3A] dark:text-white">Loading Digital ID Portal...</h3>
          <p className="text-xs text-gray-400 font-medium font-mono">Connecting to secure personnel database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#060F1D] text-slate-100' : 'bg-[#F3F4F6] text-slate-800'}`}>
      
      {/* SCAN ID MODAL */}
      {isScanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4" id="scanner-modal">
          <div className="relative bg-white dark:bg-[#0B1F3A] rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 dark:border-slate-800 animate-fade-in">
            
            {/* Modal Header */}
            <div className="bg-[#0B1F3A] dark:bg-[#060F1D] px-6 py-5 text-white flex justify-between items-center border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600/10 text-red-500 rounded-xl">
                  <QrCode className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-widest uppercase">Scan Staff QR / ID</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Access Corporate Profile Logs</p>
                </div>
              </div>
              <button
                onClick={() => setIsScanOpen(false)}
                className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector Tabs */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 p-2 gap-2 bg-slate-50 dark:bg-[#09172A]">
              <button
                onClick={() => {
                  setActiveScanTab('camera');
                  setCameraError(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeScanTab === 'camera'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>📷 Live Camera Feed</span>
              </button>
              <button
                onClick={() => setActiveScanTab('simulated')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeScanTab === 'simulated'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>🧪 Simulated Scanner</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {activeScanTab === 'camera' ? (
                <div className="flex flex-col items-center">
                  {cameraError ? (
                    <div className="p-5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl text-center border border-red-100 dark:border-red-950/40 mb-4">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2.5" />
                      <p className="text-xs font-bold leading-relaxed">{cameraError}</p>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden border-4 border-[#0B1F3A] shadow-inner mb-4 flex items-center justify-center">
                      {/* Live Camera Feed Stream */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Cool scanning target finder overlays */}
                      <div className="absolute inset-0 border-4 border-black/30 pointer-events-none"></div>
                      <div className="absolute top-10 bottom-10 left-10 right-10 border-2 border-dashed border-red-500 rounded-2xl pointer-events-none flex items-center justify-center">
                        {/* Pulse scanner line */}
                        <div className="w-full h-1 bg-red-500/80 shadow-[0_0_15px_#D71920] rounded-full animate-bounce"></div>
                      </div>

                      {/* Glowing scanner corner indicators */}
                      <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-red-600 rounded-tl-xl"></div>
                      <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-red-600 rounded-tr-xl"></div>
                      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-red-600 rounded-bl-xl"></div>
                      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-red-600 rounded-br-xl"></div>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0B1F3A]/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        LIVE ID CAPTURING...
                      </div>
                    </div>
                  )}

                  <div className="w-full flex flex-col gap-2 mt-2">
                    <button
                      onClick={() => {
                        // Pick a random employee for simulated success
                        if (employees.length > 0) {
                          setIsSimulatingScan(true);
                          const randomIndex = Math.floor(Math.random() * employees.length);
                          const randomEmp = employees[randomIndex];
                          setTimeout(() => {
                            setIsSimulatingScan(false);
                            handleScanDetect(randomEmp);
                          }, 1500);
                        }
                      }}
                      disabled={isSimulatingScan}
                      className="w-full py-3 bg-[#D71920] hover:bg-[#b51419] disabled:bg-slate-400 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isSimulatingScan ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing scan result...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span>⚡ Simulated Scan Match</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider mt-1.5">
                      Point camera at any printed badge or ID QR code to scan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-950/30 text-xs font-bold leading-relaxed">
                    🌟 <strong>Simulation Mode:</strong> Select any staff member from the corporate directory below to simulate scanning their physical QR code and instantly view their profile.
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                      Choose Staff ID to Scan
                    </label>
                    <select
                      value={simulatedSelectedEmail}
                      onChange={(e) => setSimulatedSelectedEmail(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                    >
                      <option value="">-- Choose a staff member --</option>
                      {employees.map(emp => (
                        <option key={emp.email} value={emp.email}>
                          👤 {emp.fullName} ({emp.employeeId}) - {emp.designation}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const emp = employees.find(e => e.email === simulatedSelectedEmail);
                      if (emp) {
                        setIsSimulatingScan(true);
                        setTimeout(() => {
                          setIsSimulatingScan(false);
                          handleScanDetect(emp);
                        }, 1200);
                      } else {
                        showToast('Please select a staff member to simulate scan.', 'error');
                      }
                    }}
                    disabled={isSimulatingScan || !simulatedSelectedEmail}
                    className="w-full py-3.5 bg-[#D71920] hover:bg-[#b51419] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    {isSimulatingScan ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning ID Barcode/QR Code...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>⚡ Execute Simulated Scan</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Demo QR scanner helpers */}
            <div className="bg-slate-50 dark:bg-[#09172A] px-6 py-4 border-t border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Weehur Corporate Secure ID System • ISO 27001 Certified
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CORE WORKSPACE GRID */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8" id="workspace-grid">
        
        {/* LEFT COLUMN: INTERACTIVE DEVICE VIEWPORT (5 cols or centered 12 cols) */}
        <div className={`${hasFullAccess ? 'lg:col-span-5' : 'lg:col-span-12 flex justify-center'} flex flex-col items-center`} id="device-preview-pane">
          <div className="text-center mb-6">
            <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest">
              Digital ID Web Portal
            </h3>
            <p className="text-xs text-gray-400">Authentic desktop web rendering with active flip-to-verify interaction</p>
          </div>

          {/* Web Portal Viewport Card */}
          <div className="w-full bg-white rounded-[32px] border border-gray-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden dark:bg-[#0B1F3A]" id="web-console-wrapper">
            
            {/* Corporate Web Header */}
            <div className="py-5 px-6 flex justify-between items-center bg-[#0B1F3A] text-white border-b border-white/10" id="web-portal-header">
              <div className="flex items-center gap-3">
                <WeehurLogo className="h-7" iconOnly={false} light={true} />
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-red-600 text-[9px] font-black tracking-widest uppercase">
                  WEB PORTAL
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center relative cursor-pointer" title="System Alerts">
                  <Bell className="w-4 h-4 text-[#D71920]" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-ping" />
                </div>
              </div>
            </div>

            {/* Elegant Web Tab Navigation */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800/80 px-4 py-2 flex gap-1.5 overflow-x-auto" id="web-tab-navigation">
              <button
                onClick={() => setActiveTab('id_card')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'id_card'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm border border-gray-150 dark:border-slate-800'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>ID CARD</span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm border border-gray-150 dark:border-slate-800'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>PROFILE</span>
              </button>

              <button
                onClick={() => setActiveTab('contact')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'contact'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm border border-gray-150 dark:border-slate-800'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>CONTACT</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-white dark:bg-[#0B1F3A] text-red-600 dark:text-red-400 shadow-sm border border-gray-150 dark:border-slate-800'
                    : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>SETTINGS</span>
              </button>
            </div>

            {/* WEB ACTIVE SCREEN BODY */}
            <div className="flex-1 min-h-[480px] max-h-[750px] overflow-y-auto bg-slate-50 p-6 flex flex-col items-center dark:bg-[#060F1D]/50" id="web-screen-body">
              {selectedEmployee ? (
                <>
                  {/* TAB 1: FRONT ID CARD */}
                  {activeTab === 'id_card' && (
                    <div className="w-full max-w-sm mx-auto flex flex-col items-center" id="phone-id-card-view">
                      
                      {/* Interactive Staff ID Card Box */}
                      <div className="w-full bg-white dark:bg-[#0B1F3A] rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden relative flex flex-col p-5 items-center">
                        
                        {/* Upper Color Stripe */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#D71920] via-[#0B1F3A] to-[#D71920]" />
                        
                        {/* If resigned/invalid, show visual watermark overlay */}
                        {selectedEmployee.activeStatus === false && (
                          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-950/15">
                            <div className="transform -rotate-12 bg-red-600/95 text-white font-black text-[11px] px-5 py-2.5 border-2 border-white tracking-widest uppercase rounded-lg shadow-xl animate-pulse">
                              INVALID / RESIGNED
                            </div>
                          </div>
                        )}

                        {/* Interactive Photo Frame */}
                        <div className="mt-4 w-full flex justify-center">
                          <FlipCard
                            photoUrl={selectedEmployee.photoUrl}
                            fullName={selectedEmployee.fullName}
                            qrValue={simulatedScanUrl}
                          />
                        </div>

                        {/* Details below photo */}
                        <div className="text-center mt-4">
                          <h2 className="text-xl font-black text-[#0B1F3A] dark:text-white tracking-tight uppercase leading-snug">
                            {selectedEmployee.fullName}
                          </h2>
                          <p className="text-red-600 font-extrabold text-xs tracking-widest uppercase mt-0.5">
                            {selectedEmployee.designation}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">
                            {selectedEmployee.site}
                          </p>
                        </div>

                        {/* Mini metadata blocks */}
                        <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800">
                          <div className="text-center">
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Employee BAS ID</span>
                            <p className="text-xs font-mono font-black text-[#0B1F3A] dark:text-slate-300">{selectedEmployee.employeeId}</p>
                          </div>
                          <div className="text-center">
                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">JOINED</span>
                            <p className="text-xs font-mono font-black text-[#0B1F3A] dark:text-slate-300">
                              {selectedEmployee.dateOfJoining.split(' ').slice(-1)[0] || '2024'}
                            </p>
                          </div>
                        </div>

                        {/* Card bottom branding bar */}
                        <div className={`w-full mt-4 py-2 ${selectedEmployee.activeStatus !== false ? 'bg-[#0B1F3A]' : 'bg-red-950'} rounded-xl flex justify-between items-center px-4 text-white`}>
                          <span className="text-[9px] font-black tracking-widest uppercase">Digital Staff ID</span>
                          {selectedEmployee.activeStatus !== false ? (
                            <span className="text-[9px] font-mono text-green-400 flex items-center gap-1 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                              VERIFIED
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-red-400 flex items-center gap-1 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              INVALID (RESIGNED)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Download ID Card Mobile trigger */}
                      <button
                        onClick={() => downloadIDCardAsPNG(selectedEmployee, 'both')}
                        className="mt-4 w-full py-3 bg-[#0B1F3A] hover:bg-[#152e4f] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                        id="phone-download-card-button"
                        title="Download Offline Copy of ID Card"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Offline ID Card</span>
                      </button>

                      {/* Large Action Button below Card */}
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="mt-3.5 w-full py-4 bg-[#D71920] hover:bg-[#c0161c] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        <User className="w-4 h-4" />
                        <span>VIEW ALL MY DETAILS</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* TAB 2: DETAILED PROFILE VIEW */}
                  {activeTab === 'profile' && (
                    <div className="w-full max-w-xl mx-auto" id="phone-profile-view">
                      <div className="bg-white dark:bg-[#0B1F3A] p-5 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D71920] mb-3">
                          <img src={selectedEmployee.photoUrl} alt={selectedEmployee.fullName} className="w-full h-full object-cover" />
                        </div>
                        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight text-center">
                          {selectedEmployee.fullName}
                        </h3>
                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest">{selectedEmployee.designation}</p>

                        <div className="w-full mt-5 space-y-3">
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Employee BAS ID</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300 font-mono">{selectedEmployee.employeeId}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Mobile</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300 font-mono">{selectedEmployee.mobile}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Email</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300 text-right truncate max-w-[150px]">{selectedEmployee.email}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Work Site</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300 text-right truncate max-w-[150px]">{selectedEmployee.site}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Joining Date</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300">{selectedEmployee.dateOfJoining}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-800 text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Nationality</span>
                            <span className="font-bold text-slate-800 dark:text-slate-300">{selectedEmployee.nationality}</span>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <span className="text-[9px] text-red-500 font-black tracking-widest uppercase block mb-1">Emergency Contact</span>
                            <p className="text-xs font-black text-red-700 dark:text-red-400 font-mono">{selectedEmployee.emergencyContact}</p>
                          </div>
                        </div>

                        {/* Informative Scanner Sharing Explainer */}
                        <div className="w-full mt-5 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                            🔒 <strong>Privacy Note:</strong> Direct actions (Call, Email, Save vCard) are hidden on your personal profile app. When others scan your physical or digital ID QR code, they will instantly see your details with quick-action buttons to save your contact, dial, or email you.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CONTACT DIRECTORY */}
                  {activeTab === 'contact' && (
                    <div className="w-full max-w-xl mx-auto space-y-3" id="phone-contact-view">
                      <div className="bg-white dark:bg-[#0B1F3A] p-4 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-black text-[#0B1F3A] dark:text-white uppercase tracking-wider mb-3">
                          Emergency Contacts
                        </h3>
                        <div className="space-y-3">
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-xs font-black text-red-600 dark:text-red-400">Head Office Helpline</p>
                              <p className="text-xs font-mono font-bold text-gray-500">+65 6789 1234</p>
                            </div>
                            <a href="tel:+6567891234" className="p-2.5 bg-[#D71920] text-white rounded-full">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-2xl flex justify-between items-center">
                            <div>
                              <p className="text-xs font-black text-blue-600 dark:text-blue-400">Security Command</p>
                              <p className="text-xs font-mono font-bold text-gray-500">+65 6888 1111</p>
                            </div>
                            <a href="tel:+6568881111" className="p-2.5 bg-[#0B1F3A] text-white rounded-full">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#0B1F3A] p-4 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">
                          Directory Quick Dial
                        </h3>
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                          {accessibleEmployees.map(emp => (
                            <div key={emp.email} className="py-2.5 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <img src={emp.photoUrl} alt={emp.fullName} className="w-8 h-8 rounded-full object-cover" />
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-300 leading-tight uppercase">{emp.fullName}</p>
                                  <p className="text-[9px] text-gray-400 font-semibold uppercase">{emp.designation}</p>
                                </div>
                              </div>
                              <a href={`tel:${emp.mobile}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-green-600">
                                <Phone className="w-4 h-4" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: APP SETTINGS */}
                  {activeTab === 'settings' && (
                    <div className="w-full max-w-xl mx-auto space-y-4" id="phone-settings-view">
                      <div className="bg-white dark:bg-[#0B1F3A] p-4 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">
                          Security Settings
                        </h3>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Offline Cache</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-[10px] font-bold rounded-md">
                              ENABLED
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Device Encryption</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold rounded-md">
                              ACTIVE (AES-256)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Biometric Lock</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold rounded-md">
                              SECURE ENCLAVE
                            </span>
                          </div>
                        </div>
                      </div>

                      {hasFullAccess && (
                        <div className="bg-white dark:bg-[#0B1F3A] p-4 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
                          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-3">
                            Simulate Identity Change
                          </h3>
                          <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                            For development purposes, you can simulate logging in as other registered staff identities:
                          </p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {employees.map(emp => (
                              <button
                                key={emp.email}
                                onClick={() => handleUserChange(emp.email)}
                                className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  currentUser?.email.toLowerCase() === emp.email.toLowerCase()
                                    ? 'border-[#D71920] bg-red-50/50 dark:bg-red-950/20'
                                    : 'border-gray-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <img src={emp.photoUrl} alt={emp.fullName} className="w-6 h-6 rounded-full object-cover" />
                                  <div>
                                    <p className="font-extrabold uppercase text-slate-700 dark:text-slate-300">{emp.fullName}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">{emp.email}</p>
                                  </div>
                                </div>
                                {currentUser?.email.toLowerCase() === emp.email.toLowerCase() && (
                                  <span className="text-[9px] font-black text-red-600 tracking-wider">CURRENT</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Standalone Sign Out Card */}
                      <div className="bg-white dark:bg-[#0B1F3A] p-4 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800">
                        <button
                          onClick={triggerLogout}
                          className="w-full py-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors dark:bg-gray-800 dark:hover:bg-red-950 dark:text-gray-300"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>End Security Session</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                  <AlertCircle className="w-12 h-12 mb-3" />
                  <p className="font-bold">No active digital ID matches your credentials.</p>
                </div>
              )}
            </div>
          </div>


        </div>

        {/* RIGHT COLUMN: REVIEWS, CO-PILOT AND ADMIN PANEL (7 cols) */}
        {hasFullAccess && (
          <div className="lg:col-span-7 space-y-8" id="master-console-pane">
          
          {/* Section 2: Administrative Directory controls */}
          <div className="bg-white p-6 rounded-[32px] border border-gray-200 dark:bg-[#0B1F3A] dark:border-slate-800 shadow-sm" id="admin-directory-block">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">ADMIN PANEL</span>
                <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
                  Corporate Employee Registry
                </h4>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportEmployees}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                
                {hasFullAccess && (
                  <button
                    onClick={() => {
                      setFormData({
                        employeeId: `WH${Math.floor(1000 + Math.random() * 9000)}`,
                        fullName: '',
                        designation: '',
                        department: 'Projects',
                        mobile: '+65 ',
                        email: '',
                        site: siteFilter || 'Weehur Main Site',
                        nationality: 'Singaporean',
                        dateOfJoining: new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }),
                        emergencyContact: '+65 ',
                        photoUrl: '',
                        activeStatus: true,
                        isAdmin: false
                      });
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D71920] hover:bg-[#c0161c] text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Employee</span>
                  </button>
                )}
              </div>
            </div>

            {/* Real-time Validation Statistics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in" id="admin-stats-dashboard">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-none">Total Directory</span>
                <span className="text-xl font-black text-[#0B1F3A] dark:text-white mt-1.5 mb-1 leading-none">{employees.length}</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">Staff</span>
              </div>
              <div className="bg-green-50 dark:bg-green-950/10 p-3.5 rounded-2xl border border-green-100/70 dark:border-green-900/20 flex flex-col justify-between">
                <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-wider leading-none">Confirmed (Valid)</span>
                <span className="text-xl font-black text-green-600 dark:text-green-400 mt-1.5 mb-1 leading-none" id="valid-staff-count">{employees.filter(e => e.activeStatus !== false).length}</span>
                <span className="text-[8px] text-green-500 font-bold uppercase tracking-wider leading-none">Valid Cards</span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/10 p-3.5 rounded-2xl border border-red-100/70 dark:border-red-900/20 flex flex-col justify-between">
                <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider leading-none">Resigned (Invalid)</span>
                <span className="text-xl font-black text-red-600 dark:text-red-400 mt-1.5 mb-1 leading-none">{employees.filter(e => e.activeStatus === false).length}</span>
                <span className="text-[8px] text-red-400 font-bold uppercase tracking-wider leading-none">Invalid Cards</span>
              </div>
            </div>

            {/* Workforce Distribution Chart */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/80">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-red-50 dark:bg-red-950/20 text-[#D71920] rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Workforce Distribution by Site</h5>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Real-time site assignment statistics</p>
                </div>
              </div>
              <div className="h-48 w-full" id="workforce-distribution-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={siteDistributionData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#0B1F3A' : '#ffffff',
                        borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }}
                      itemStyle={{ color: '#D71920' }}
                      cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                    />
                    <Bar dataKey="count" fill="#D71920" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {siteDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index % 2 === 0 ? '#D71920' : '#475569'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Site Workspace Cards Selector */}
            <div className="mb-6" id="site-workspace-dashboard">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Select Work Site Dashboard
                </span>
                {hasFullAccess && (
                  <button
                    type="button"
                    onClick={() => setShowAddSiteModal(true)}
                    className="text-xs font-bold text-[#D71920] hover:text-[#c0161c] flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Site</span>
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* All Locations Card */}
                <div
                  onClick={() => setSiteFilter('')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !siteFilter
                      ? 'border-[#D71920] bg-red-50/20 dark:bg-red-950/10 shadow-sm'
                      : 'border-gray-200 dark:border-slate-850 bg-white dark:bg-[#0B1F3A]/20 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl ${!siteFilter ? 'bg-red-100 dark:bg-red-950/40 text-[#D71920]' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                      <Globe className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-black text-slate-500">{employees.length}</span>
                  </div>
                  <div className="mt-3">
                    <p className="font-extrabold text-xs text-slate-805 dark:text-slate-200">ALL LOCATIONS</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Entire Directory</p>
                  </div>
                </div>

                {/* Individual Site Cards */}
                {sitesList.map(siteName => {
                  const siteStaffCount = employees.filter(e => e.site === siteName).length;
                  const isSelected = siteFilter === siteName;
                  return (
                    <div
                      key={siteName}
                      onClick={() => setSiteFilter(siteName)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#D71920] bg-red-50/20 dark:bg-red-950/10 shadow-sm'
                          : 'border-gray-200 dark:border-slate-850 bg-white dark:bg-[#0B1F3A]/20 hover:border-gray-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className={`p-2 rounded-xl ${isSelected ? 'bg-red-100 dark:bg-red-950/40 text-[#D71920]' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          {hasFullAccess && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSiteToEdit(siteName);
                                  setEditedSiteName(siteName);
                                  setShowEditSiteModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-[#D71920] hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                title="Edit site name"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSite(siteName);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                title="Delete site"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <span className="text-[10px] font-mono font-black text-slate-500">{siteStaffCount}</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="font-extrabold text-xs text-slate-805 dark:text-slate-200 truncate uppercase" title={siteName}>
                          {siteName}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Active Workspace</p>
                      </div>
                    </div>
                  );
                })}

                {/* Add Site Dotted Card (Only for Admins) */}
                {hasFullAccess && (
                  <div
                    onClick={() => setShowAddSiteModal(true)}
                    className="p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 hover:border-[#D71920] hover:bg-slate-50 dark:hover:bg-slate-900/10 transition-all cursor-pointer flex flex-col justify-center items-center text-center group"
                  >
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:text-[#D71920] rounded-xl transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                    <p className="mt-2 font-extrabold text-[11px] text-slate-500 group-hover:text-[#D71920]">NEW SITE</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Expand Workspace</p>
                  </div>
                )}
              </div>
            </div>

            {/* Directory list searching & filtering */}
            <div className="mb-4 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search staff members by name, ID number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="w-full md:w-56">
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full px-3 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  <option value="">All Site Locations</option>
                  {sitesList.map(siteName => (
                    <option key={siteName} value={siteName}>
                      🏢 {siteName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto" id="employees-table">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-3">Staff Profile</th>
                    <th className="py-3 px-3">Employee BAS ID</th>
                    <th className="py-3 px-3">Site Location</th>
                    <th className="py-3 px-3">Access Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 text-xs">
                  {filteredEmployees.map(emp => (
                    <tr
                      key={emp.email}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer ${
                        selectedEmployee?.email === emp.email ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                      }`}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <img src={emp.photoUrl} alt={emp.fullName} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                          <div>
                            <p className="font-extrabold uppercase text-slate-800 dark:text-slate-200">{emp.fullName}</p>
                            <p className="text-[10px] text-gray-400 font-semibold">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                        {emp.employeeId}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-gray-500 dark:text-gray-400 font-extrabold uppercase text-[10px] bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded-md font-mono tracking-wider truncate max-w-[150px] inline-block" title={emp.site}>
                          {emp.site || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${
                          emp.isAdmin 
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20' 
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                        }`}>
                          {emp.isAdmin ? '🔑 Admin' : '👤 Staff'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmployeeActive(emp);
                          }}
                          disabled={!hasFullAccess}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider transition-colors ${
                            emp.activeStatus
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                          }`}
                          title={hasFullAccess ? "Click to toggle employment status" : "Employment status"}
                        >
                          {emp.activeStatus ? 'CONFIRMED' : 'RESIGNED'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-blue-600 transition-colors"
                            title="Edit Record"
                            disabled={!hasFullAccess}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(emp.email)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-red-500 transition-colors"
                            title="Delete Record"
                            disabled={!hasFullAccess}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 font-semibold">
                        No employees found matching the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!hasFullAccess ? (
              <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-amber-100 dark:border-amber-950/30">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Individual Mode: You can only see your own profile details. Admin access is required to see all staff details.</span>
              </div>
            ) : (
              <div className="mt-4 p-3.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-green-100 dark:border-green-950/30">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Super Admin Mode: Full database, role movement, and site controls authorized.</span>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* FOOTER BAR */}
      <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 py-6 text-center text-[11px] text-gray-400 dark:bg-[#0B1F3A]/40" id="main-footer">
        <p className="font-semibold tracking-wider text-slate-500 dark:text-slate-400">WEEHUR DIGITAL IDENTITY CO-PILOT</p>
        <p className="mt-1">Real-time encryption keys secured. Firebase Firestore Cloud synchronized.</p>
        <p className="mt-2 text-gray-500">© 2026 Weehur Construction. All rights reserved.</p>
      </footer>

      {/* ADD / EDIT EMPLOYEE MODAL DIALOGS */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" id="employee-editor-modal">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-slate-800">
            
            {/* Modal Header */}
            <div className="bg-[#0B1F3A] dark:bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <Users className="w-5 h-5 text-red-500" />
                <span>{showAddModal ? 'Register New Staff Member' : 'Modify Staff Record'}</span>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Employee BAS ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                    placeholder="e.g. WH1234"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. CHAKRAVARTHI G"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Designation *</label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. PROJECT ENGINEER"
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    disabled={showEditModal} // Primary key / Document ID in Firebase cannot change
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                    placeholder="e.g. user@weehur.com.sg"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="e.g. +65 9123 4567"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Primary Work Site *</label>
                  <select
                    value={formData.site || ''}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    required
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer text-xs"
                  >
                    <option value="" disabled>Select Work Site</option>
                    {sitesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Emergency Contact Number</label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="e.g. +65 6789 1234"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Staff Photo *</label>
                
                {/* Drag-and-drop Upload Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPhoto(true);
                  }}
                  onDragLeave={() => setIsDraggingPhoto(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingPhoto(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handlePhotoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('photo-file-input')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDraggingPhoto
                      ? 'border-[#D71920] bg-red-50/30 dark:bg-red-950/10'
                      : 'border-gray-200 hover:border-[#D71920] dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                  }`}
                  id="photo-drag-drop-zone"
                >
                  <input
                    type="file"
                    id="photo-file-input"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePhotoFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  
                  {formData.photoUrl ? (
                    <div className="flex items-center gap-3 w-full">
                      <img
                        src={formData.photoUrl}
                        alt="Staff Preview"
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-slate-700 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-extrabold text-slate-700 dark:text-slate-300 truncate">Photo successfully loaded</p>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase">Drag or Click to replace photo</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData(prev => ({ ...prev, photoUrl: '' }));
                        }}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 rounded-lg shrink-0"
                        title="Remove photo"
                        id="remove-photo-button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-gray-300 mb-1.5" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        Drag & drop staff photo, or <span className="text-[#D71920] underline">browse computer</span>
                      </p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Supports PNG, JPG, WEBP up to 1.5MB</p>
                    </>
                  )}
                </div>

                {/* Optional URL manual override input */}
                <div className="mt-2">
                  <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider block mb-1">
                    Or Paste External Photo URL
                  </span>
                  <input
                    type="url"
                    value={formData.photoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-[10px] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Joining Date</label>
                  <input
                    type="text"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    placeholder="e.g. 12 Jan 2020"
                    className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">Employment Status *</label>
                <select
                  value={formData.activeStatus !== false ? 'confirmed' : 'resigned'}
                  onChange={(e) => setFormData({ ...formData, activeStatus: e.target.value === 'confirmed' })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer text-xs uppercase"
                  id="active-status-select"
                >
                  <option value="confirmed">🟢 Confirmed Staff (Valid Digital ID)</option>
                  <option value="resigned">🔴 Resigned Staff (Invalid / Revoked Digital ID)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">System Access / Role *</label>
                <select
                  value={formData.isAdmin ? 'admin' : 'staff'}
                  onChange={(e) => setFormData({ ...formData, isAdmin: e.target.value === 'admin' })}
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer text-xs uppercase"
                  id="access-role-select"
                >
                  <option value="staff">👤 Staff Member (Restricted to own ID only)</option>
                  <option value="admin">🔑 Super Admin (Full access to all controls)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#D71920] hover:bg-[#c0161c] text-white font-bold rounded-xl uppercase tracking-wider shadow-md transition-colors"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW SITE MODAL */}
      {showAddSiteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" id="add-site-modal">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="bg-[#0B1F3A] dark:bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <MapPin className="w-5 h-5 text-red-500" />
                <span>Create New Work Site</span>
              </div>
              <button
                onClick={() => {
                  setShowAddSiteModal(false);
                  setNewSiteName('');
                }}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newSiteName.trim();
                if (!trimmed) {
                  showToast('Site name cannot be empty.', 'error');
                  return;
                }
                if (sitesList.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
                  showToast('This site name already exists.', 'error');
                  return;
                }
                setCustomSites(prev => [...prev, trimmed]);
                setSiteFilter(trimmed); // Auto select the new site
                setShowAddSiteModal(false);
                setNewSiteName('');
                showToast(`Work site "${trimmed}" added successfully!`, 'success');
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">New Site Name *</label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Tuas South Yard"
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                  autoFocus
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSiteModal(false);
                    setNewSiteName('');
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#D71920] hover:bg-[#c0161c] text-white font-bold rounded-xl uppercase tracking-wider shadow-md transition-colors"
                >
                  Create Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SITE MODAL */}
      {showEditSiteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" id="edit-site-modal">
          <div className="bg-white dark:bg-[#0B1F3A] rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="bg-[#0B1F3A] dark:bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                <Edit2 className="w-4 h-4 text-red-500" />
                <span>Rename Work Site</span>
              </div>
              <button
                onClick={() => {
                  setShowEditSiteModal(false);
                  setSiteToEdit('');
                  setEditedSiteName('');
                }}
                disabled={isUpdatingSite}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleEditSiteName} className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-gray-500 dark:text-slate-400 font-medium mb-3">
                  You are editing the site <strong className="text-slate-800 dark:text-white font-black uppercase font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{siteToEdit}</strong>.
                </p>
                <label className="block text-gray-400 font-bold uppercase tracking-wider mb-1">New Site Name *</label>
                <input
                  type="text"
                  required
                  value={editedSiteName}
                  onChange={(e) => setEditedSiteName(e.target.value)}
                  placeholder="e.g. New Yard Location"
                  className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl font-bold uppercase focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                  autoFocus
                  disabled={isUpdatingSite}
                />
                
                {employees.filter(e => e.site === siteToEdit).length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-extrabold uppercase text-[10px]">Cascade Transfer Warning</p>
                      <p className="mt-0.5 font-medium text-[10px]">
                        <strong>{employees.filter(e => e.site === siteToEdit).length} staff member(s)</strong> currently assigned to this site will be automatically transferred to the renamed site location in the database.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSiteModal(false);
                    setSiteToEdit('');
                    setEditedSiteName('');
                  }}
                  disabled={isUpdatingSite}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl uppercase transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSite}
                  className="px-6 py-2.5 bg-[#D71920] hover:bg-[#c0161c] text-white font-bold rounded-xl uppercase tracking-wider shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-75"
                >
                  {isUpdatingSite ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Rename Site</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
