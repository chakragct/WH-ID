import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { WorkSite } from '../types';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, editingSiteId?: string) => Promise<void>;
  editingSite?: WorkSite | null;
}

export default function AddSiteModal({ isOpen, onClose, onSave, editingSite }: AddSiteModalProps) {
  const [siteName, setSiteName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingSite) {
      setSiteName(editingSite.name);
    } else {
      setSiteName('');
    }
    setError(null);
  }, [editingSite, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!siteName.trim()) {
      setError('Site name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(siteName.trim(), editingSite?.id);
      setSiteName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save site.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" id="add-site-modal">
      <div className="bg-white dark:bg-[#0B132B] rounded-3xl w-full max-w-sm border border-slate-150 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
              {editingSite ? 'Edit Work Site' : 'Create Work Site'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
          
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Site Name
            </label>
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. Site E"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : editingSite ? 'Save Changes' : 'Create Site'}
          </button>
        </form>
      </div>
    </div>
  );
}
