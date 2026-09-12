import React, { useState, useEffect, useRef } from 'react';
import { X, User, Briefcase, MapPin, Heart, Plus, Upload } from 'lucide-react';
import { Employee, WorkSite } from '../types';
import { formatDateValue } from '../utils/dateUtils';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employeeData: Omit<Employee, 'id' | 'qrCodeDataUrl'>) => Promise<void>;
  editingEmployee?: Employee | null;
  sites: WorkSite[];
}

export default function AddEmployeeModal({ isOpen, onClose, onSave, editingEmployee, sites }: AddEmployeeModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  
  // File Upload states and reference
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [company, setCompany] = useState('WeeHur Construction');
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [status, setStatus] = useState<'Active' | 'Resigned'>('Active');
  const [lastDateOfWork, setLastDateOfWork] = useState('');
  const [dateJoined, setDateJoined] = useState(new Date().toISOString().split('T')[0]);
  const [dateJoinedProject, setDateJoinedProject] = useState('');
  const [remarks, setRemarks] = useState('');
  const [role, setRole] = useState<'Admin' | 'Employee'>('Employee');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingEmployee) {
      setEmployeeId(editingEmployee.employeeId);
      setFullName(editingEmployee.fullName);
      setPhotoUrl(editingEmployee.photoUrl || '');
      setEmail(editingEmployee.email);
      setPhone(editingEmployee.phone || '');
      setDesignation(editingEmployee.designation);
      setDepartment(editingEmployee.department || '');
      setCompany(editingEmployee.company || 'WeeHur Construction');
      setSelectedSites(editingEmployee.workSites || []);
      setStatus(editingEmployee.status || 'Active');
      setLastDateOfWork(formatDateValue(editingEmployee.lastDateOfWork));
      setDateJoined(formatDateValue(editingEmployee.dateJoined) || new Date().toISOString().split('T')[0]);
      setDateJoinedProject(formatDateValue(editingEmployee.dateJoinedProject));
      setRemarks(editingEmployee.remarks || '');
      setRole(editingEmployee.role || 'Employee');
    } else {
      // Clear forms
      setEmployeeId('');
      setFullName('');
      setPhotoUrl('');
      setEmail('');
      setPhone('');
      setDesignation('');
      setDepartment('');
      setCompany('WeeHur Construction');
      setSelectedSites([]);
      setStatus('Active');
      setLastDateOfWork('');
      setDateJoined(new Date().toISOString().split('T')[0]);
      setDateJoinedProject('');
      setRemarks('');
      setRole('Employee');
    }
    setFormError(null);
  }, [editingEmployee, isOpen]);

  if (!isOpen) return null;

  const handleToggleSite = (siteName: string) => {
    if (selectedSites.includes(siteName)) {
      setSelectedSites(selectedSites.filter(s => s !== siteName));
    } else {
      setSelectedSites([...selectedSites, siteName]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!employeeId.trim() || !fullName.trim() || !designation.trim()) {
      setFormError('Please complete all mandatory fields (Staff ID, Full Name, Designation).');
      return;
    }

    let finalEmail = email.trim().toLowerCase();
    if (!finalEmail) {
      const cleanName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff';
      const cleanEmpId = employeeId.toLowerCase().replace(/[^a-z0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
      finalEmail = `${cleanName}.${cleanEmpId}@weehur.com.sg`;
    } else if (!finalEmail.includes('@')) {
      finalEmail = `${finalEmail.replace(/[^a-z0-9._-]/g, '')}@weehur.com.sg`;
    }

    if (selectedSites.length === 0) {
      setFormError('Employee must be assigned to at least one work site.');
      return;
    }
    if (status === 'Resigned' && !lastDateOfWork) {
      setFormError('Please specify the last date of work for the resigned staff member.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        employeeId: employeeId.trim(),
        fullName: fullName.trim(),
        photoUrl: photoUrl.trim(),
        email: finalEmail,
        phone: phone.trim() || '-',
        designation: designation.trim(),
        department: department.trim() || 'Construction',
        company: company.trim() || 'WeeHur Construction',
        workSites: selectedSites,
        status,
        dateJoined,
        dateJoinedProject: dateJoinedProject.trim() || undefined,
        remarks: remarks.trim() || undefined,
        lastDateOfWork: status === 'Resigned' ? lastDateOfWork : undefined,
        role
      });
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register the profile. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in" id="add-employee-modal">
      <div className="bg-white dark:bg-[#0B132B] rounded-3xl w-full max-w-2xl border border-slate-150 dark:border-slate-850 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 dark:text-white">
              {editingEmployee ? 'Edit Staff Identity Card' : 'Register New Employee'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30">
              {formError}
            </div>
          )}

           {/* Profile Picture Selection */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Staff / Admin Profile Photo Upload
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 transition-all group flex items-center justify-center shrink-0 ${
                  dragActive 
                    ? 'border-blue-500 scale-105 bg-blue-50' 
                    : photoUrl 
                      ? 'border-slate-200 dark:border-slate-800 hover:border-blue-400' 
                      : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-blue-400'
                }`}
                title="Click or drag & drop an image file to upload photo"
              >
                {photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="Uploaded Profile" 
                    className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                    <User className="w-8 h-8" />
                    <span className="text-[7px] font-bold uppercase tracking-wider mt-0.5">No Photo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                  <Upload className="w-4 h-4" />
                  <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                    {photoUrl ? 'Change' : 'Upload'}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={photoUrl.startsWith('data:') ? 'Local custom uploaded photo' : photoUrl}
                    onChange={(e) => {
                      if (!e.target.value.startsWith('Local custom')) {
                        setPhotoUrl(e.target.value);
                      }
                    }}
                    placeholder="Paste image URL or click Browse to upload..."
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    disabled={photoUrl.startsWith('data:')}
                  />
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse...</span>
                  </button>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all border border-red-100/50 cursor-pointer shrink-0"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed">
                  No sample photos are assigned automatically. Staff or Admin can upload an official profile photo anytime by dragging & dropping an image, pasting a URL, or clicking <strong className="text-blue-500 cursor-pointer" onClick={() => fileInputRef.current?.click()}>Browse...</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Core Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Staff ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. WH-0112"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kenneth Tan"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address <span className="text-slate-400 font-normal">(Editable)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. kenneth@weehur.com.sg"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                />
                <p className="text-[9px] text-gray-400 mt-1">If blank, an email address will be automatically generated.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Mobile Number / Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +65 9123 4567"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Work Role & Site Assignment */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Staff Profile & Site Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Designation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Safety Officer"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Date of Employment
                </label>
                <input
                  type="date"
                  value={dateJoined}
                  onChange={(e) => setDateJoined(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Date Joined to Site / Project
                </label>
                <input
                  type="date"
                  value={dateJoinedProject}
                  onChange={(e) => setDateJoinedProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Remarks / Status Updates
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks or status details here..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Checkbox Checklist for Sites */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Assign to Work Sites (Select One or Multiple) <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 bg-slate-100/50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-800/80">
                {Array.from(new Set([
                  ...sites.map(s => s.name),
                  ...(editingEmployee?.workSites || []),
                  'CORPORATE', 'BC14AB', 'DEFECT', 'JBR', 'KEPPEL C2', 'KLH', 'FPC', 'N8C15', 'Spring Leaf', 'TANK97', 'THY', 'TVD', 'W2RC', 'WAIS', 'Site A', 'Site B', 'Site C', 'Site D'
                ])).filter(Boolean).map(siteName => {
                  const isSelected = selectedSites.includes(siteName);
                  return (
                    <button
                      type="button"
                      key={siteName}
                      onClick={() => handleToggleSite(siteName)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm font-extrabold scale-[1.02]'
                          : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span>{siteName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role, Status, and Last Date of Work */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Portal Access Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'Admin' | 'Employee')}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="Employee">Employee (Normal View)</option>
                  <option value="Admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const val = e.target.value as 'Active' | 'Resigned';
                    setStatus(val);
                    if (val !== 'Resigned') setLastDateOfWork('');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100"
                >
                  <option value="Active">Active Employee</option>
                  <option value="Resigned">Resigned Staff</option>
                </select>
              </div>

              {status === 'Resigned' && (
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-red-500 mb-1.5">
                    Last Date of Work (Required for Resigned) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={lastDateOfWork}
                    onChange={(e) => setLastDateOfWork(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-900/50">
              {formError}
            </div>
          )}

          {/* Buttons Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
