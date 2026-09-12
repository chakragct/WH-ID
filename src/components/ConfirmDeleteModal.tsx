import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Loader2, User } from 'lucide-react';

export interface StaffDeleteItem {
  id: string;
  name: string;
  designation?: string;
  email?: string;
  photoUrl?: string;
  department?: string;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  items: StaffDeleteItem[];
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description,
  items,
  isLoading = false,
  onConfirm,
  onClose
}) => {
  const count = items.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-lg bg-white dark:bg-[#0E1726] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {description || `Are you sure you want to permanently delete ${count === 1 ? 'this profile' : `these ${count} staff profiles`}?`}
                  </p>
                </div>
              </div>

              <button
                disabled={isLoading}
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Staff Item(s) Preview */}
            <div className="p-5 max-h-[280px] overflow-y-auto space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {count === 1 ? 'Selected Profile to Remove' : `Selected Profiles to Remove (${count})`}
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div 
                    key={item.id || item.email || idx}
                    className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3"
                  >
                    {item.photoUrl ? (
                      <img 
                        src={item.photoUrl} 
                        alt={item.name} 
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold text-xs">
                        {item.name ? item.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.designation || 'Staff'} {item.department ? `• ${item.department}` : ''}
                      </p>
                      {item.email && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-mono">
                          {item.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning Callout */}
              <div className="p-3.5 bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-2.5">
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
                  <span className="font-black">Permanent Action:</span> This will permanently erase the records, assigned site permissions, and digital ID card data from the database.
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-5 border-t border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-250 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{count > 1 ? `Delete Selected (${count})` : 'Permanently Delete'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
