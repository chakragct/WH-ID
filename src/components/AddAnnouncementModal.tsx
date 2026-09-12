import React, { useState, useEffect } from 'react';
import { X, FileText, Edit3 } from 'lucide-react';
import { Announcement } from '../types';

interface AddAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string, announcementId?: string) => Promise<void>;
  editingAnnouncement?: Announcement | null;
}

export default function AddAnnouncementModal({ isOpen, onClose, onSave, editingAnnouncement }: AddAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingAnnouncement) {
      setTitle(editingAnnouncement.title || '');
      setContent(editingAnnouncement.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [editingAnnouncement, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(title.trim(), content.trim(), editingAnnouncement?.id);
      setTitle('');
      setContent('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editingAnnouncement);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" id="add-announcement-modal">
      <div className="bg-white dark:bg-[#0B132B] rounded-3xl w-full max-w-md border border-slate-100 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            <span className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white">
              {isEditing ? 'Edit Announcement' : 'Post Announcement'}
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
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Safety Briefing Update"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Content
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`July 2026\nTue, 14 Jul 2026 – MVFPC\nWed, 15 Jul 2026 – Keppel\nMon, 20 Jul 2026 – Tank Road`}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
            <p className="text-[9px] text-slate-400 mt-1">
              Tip: Enter each schedule date on a new line or paste schedule lists. Dates and locations will be automatically aligned into structured cards!
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (isEditing ? 'Saving Changes...' : 'Posting...') : (isEditing ? 'Save Changes' : 'Post Announcement')}
          </button>
        </form>
      </div>
    </div>
  );
}
