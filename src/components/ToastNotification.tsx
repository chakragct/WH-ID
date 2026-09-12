import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastState {
  show: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastNotificationProps {
  toast: ToastState | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onClose }) => {
  const isSuccess = toast?.type === 'success';
  const isError = toast?.type === 'error';

  return (
    <AnimatePresence>
      {toast && toast.show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-6 right-6 z-[300] max-w-md w-[calc(100vw-3rem)] shadow-2xl rounded-2xl overflow-hidden border backdrop-blur-md"
        >
          <div
            className={`p-4 flex items-center gap-3 ${
              isSuccess
                ? 'bg-emerald-900/95 text-white border-emerald-700/80 shadow-emerald-950/40'
                : isError
                ? 'bg-red-900/95 text-white border-red-700/80 shadow-red-950/40'
                : 'bg-slate-900/95 text-white border-slate-700/80 shadow-slate-950/40'
            }`}
          >
            <div className="shrink-0">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-red-300" />
              ) : (
                <Info className="w-5 h-5 text-blue-300" />
              )}
            </div>

            <div className="flex-1 text-xs font-bold leading-snug">
              {toast.message}
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
