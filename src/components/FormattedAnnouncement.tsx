import React from 'react';
import { Calendar, MapPin } from 'lucide-react';

interface FormattedAnnouncementProps {
  content: string;
  className?: string;
  compact?: boolean;
}

export function FormattedAnnouncement({ content, className = '', compact = false }: FormattedAnnouncementProps) {
  if (!content) return null;

  // Regex to detect start of Day dates like "Tue, 14 Jul 2026" or "Wed, 15 Jul 2026" or "Mon 20 Jul"
  const dayNameRegex = /(?=(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)/gi;

  // First split by existing newlines
  const rawLines = content.split('\n').map(l => l.trim()).filter(Boolean);

  // Process lines further to separate merged schedule dates on one line
  const lines: string[] = [];
  for (const rawLine of rawLines) {
    if (dayNameRegex.test(rawLine)) {
      const parts = rawLine.split(dayNameRegex).map(p => p.trim()).filter(Boolean);
      lines.push(...parts);
    } else {
      lines.push(rawLine);
    }
  }

  // If we detected structured lines/schedules or multiline content
  if (lines.length > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {lines.map((line, idx) => {
          // Check if line matches a schedule item e.g. "Tue, 14 Jul 2026 – MVFPC"
          const scheduleMatch = line.match(/^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s*[\–\-\:]\s*(.*)$/i);

          if (scheduleMatch) {
            const [, datePart, locationPart] = scheduleMatch;
            return (
              <div 
                key={idx} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800 transition-colors ${
                  compact ? 'p-2 text-[10px]' : 'p-2.5 text-xs'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Calendar className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-600 dark:text-blue-400 shrink-0`} />
                  <span>{datePart.trim()}</span>
                </div>
                {locationPart && (
                  <div className={`flex items-center gap-1 font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40 self-start sm:self-auto ${
                    compact ? 'text-[9px]' : 'text-[11px]'
                  }`}>
                    <MapPin className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-blue-500 shrink-0`} />
                    <span>{locationPart.trim()}</span>
                  </div>
                )}
              </div>
            );
          }

          // Header or month label e.g., "July 2026" or "Schedule Note:"
          const isHeaderLabel = idx === 0 && line.length < 40 && !line.includes('–') && !line.includes('-');
          if (isHeaderLabel) {
            return (
              <div key={idx} className={`font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}>
                {line}
              </div>
            );
          }

          // Bullet point / separate line item
          return (
            <div key={idx} className={`flex items-start gap-2 text-slate-700 dark:text-slate-300 font-medium ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}>
              <span className="text-blue-500 font-bold select-none">•</span>
              <span className="flex-1">{line}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Single line paragraph with whitespace preservation
  return (
    <div className={`whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 ${compact ? 'text-[10px]' : 'text-xs'} ${className}`}>
      {content}
    </div>
  );
}
