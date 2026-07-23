import React, { useState, useMemo } from 'react';
import { X, Search, Users, Phone, Mail, MapPin, Copy, Check, ExternalLink, Shield } from 'lucide-react';
import { Employee } from '../types';

interface CoworkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: Employee | null;
  employees: Employee[];
  onSelectColleague: (employee: Employee) => void;
}

export const CoworkersModal: React.FC<CoworkersModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  employees,
  onSelectColleague,
}) => {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'site' | 'all'>('site');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const mySites = useMemo(() => currentUserProfile?.workSites || [], [currentUserProfile]);

  // Site colleagues vs all active staff
  const siteCoworkers = useMemo(() => {
    return employees.filter(e => {
      if (e.status !== 'Active') return false;
      if (mySites.includes('All') || currentUserProfile?.role === 'Admin') return true;
      return e.workSites.some(s => mySites.includes(s));
    });
  }, [employees, mySites, currentUserProfile]);

  const allActiveEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Active');
  }, [employees]);

  const targetList = scope === 'site' ? siteCoworkers : allActiveEmployees;

  // Filter by search term
  const filteredList = useMemo(() => {
    if (!search.trim()) return targetList;
    const q = search.toLowerCase().trim();
    return targetList.filter(e => 
      e.fullName.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      (e.department && e.department.toLowerCase().includes(q)) ||
      (e.phone && e.phone.toLowerCase().includes(q)) ||
      e.email.toLowerCase().includes(q) ||
      e.workSites.some(s => s.toLowerCase().includes(q))
    );
  }, [targetList, search]);

  if (!isOpen) return null;

  const handleCopyPhone = (phone: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(id);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
      id="coworkers-modal"
    >
      <div className="bg-white dark:bg-[#0B132B] rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide">
                Site Coworkers Directory
              </h2>
              <p className="text-[11px] text-blue-200/80 font-medium">
                {mySites.length > 0 ? `Assigned Sites: ${mySites.join(', ')}` : 'All Company Operational Sites'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          
          {/* Scope Selector & Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setScope('site')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    scope === 'site'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Site Colleagues ({siteCoworkers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    scope === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Staff ({allActiveEmployees.length})
                </button>
              </div>

              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredList.length} {filteredList.length === 1 ? 'Coworker' : 'Coworkers'}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, designation, mobile number, site..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List of Coworkers */}
          {filteredList.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                No coworkers found matching "{search}"
              </p>
              <button
                type="button"
                onClick={() => { setSearch(''); setScope('all'); }}
                className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredList.map((c) => {
                const isMe = currentUserProfile && c.email.toLowerCase() === currentUserProfile.email.toLowerCase();
                const phoneNum = c.phone || '+65 6250 1234';

                return (
                  <div
                    key={c.id}
                    className="bg-slate-50 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 p-4 rounded-2xl shadow-xs transition-all flex flex-col justify-between gap-3 relative group"
                  >
                    {/* Top Row: Avatar + Name + Designation */}
                    <div className="flex items-start gap-3">
                      {c.photoUrl ? (
                        <img 
                          src={c.photoUrl} 
                          alt={c.fullName}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 uppercase">
                          {getInitials(c.fullName)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
                            {c.fullName}
                          </h3>
                          {isMe && (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[9px] font-black uppercase tracking-wider">
                              YOU
                            </span>
                          )}
                          {c.role === 'Admin' && (
                            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />
                              ADMIN
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-350 truncate">
                          {c.designation}
                        </p>
                        {c.department && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">
                            {c.department} • {c.company || 'WeeHur Construction'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle Section: Prominent Mobile Number Box */}
                    <div className="bg-white dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">
                            Mobile Number
                          </span>
                          <a 
                            href={`tel:${phoneNum}`}
                            className="text-xs font-extrabold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors tracking-tight block truncate"
                          >
                            {phoneNum}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={`tel:${phoneNum}`}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors"
                          title="Call Mobile Number"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>

                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(phoneNum, c.id, e)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Copy phone number"
                        >
                          {copiedPhone === c.id ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Work Sites & Actions Footer */}
                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1 overflow-x-auto max-w-[60%]">
                        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 truncate">
                          {c.workSites.join(', ')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectColleague(c);
                        }}
                        className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>View ID Card</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            WeeHur Corporate Directory
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
