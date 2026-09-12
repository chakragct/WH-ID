import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, 
  Download, 
  UserPlus, 
  Shield, 
  Loader2,
  Printer 
} from 'lucide-react';
import { Employee } from '../types';
import { WeeHurLogo } from './WeeHurLogo';
import { Barcode } from './Barcode';
import { downloadVCardFile } from '../utils/vcard';
import { formatDateValue } from '../utils/dateUtils';
import { toBlob } from 'html-to-image';
import { CR80PrintModal } from './CR80PrintModal';

interface DigitalIDCardProps {
  employee: Employee;
}

export default function DigitalIDCard({ employee }: DigitalIDCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const isResigned = employee.status === 'Resigned';

  // Reset imgError when employee photo changes
  useEffect(() => {
    setImgError(false);
  }, [employee.photoUrl]);

  // Initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'WH';
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Download Badge Image (Current Face)
  const handleDownload = async () => {
    const targetRef = isFlipped ? backCardRef.current : frontCardRef.current;
    if (!targetRef) return;

    setDownloading(true);
    try {
      await new Promise(res => setTimeout(res, 150));
      const blob = await toBlob(targetRef, {
        cacheBust: true,
        backgroundColor: '#132c37',
        pixelRatio: 2
      });

      if (!blob) {
        throw new Error('Failed to generate badge blob');
      }

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (employee.fullName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');
      const side = isFlipped ? 'Back' : 'Front';
      link.download = `${safeName}_ID_${side}.png`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
    } catch (err) {
      console.error('Download badge failed:', err);
      alert('Could not download badge image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Format employment date and site joined date
  const employmentDate = formatDateValue(employee.dateJoined) || '2026-07-21';
  const siteJoinedDate = formatDateValue(employee.dateJoinedProject) || formatDateValue(employee.dateJoined) || '2026-07-21';
  const siteName = (employee.workSites && employee.workSites.length > 0) ? employee.workSites.join(', ') : 'MVFPC';

  return (
    <div className="flex flex-col items-center w-full select-none" id={`staff-badge-${employee.employeeId}`}>
      
      {/* CARD FLIP TOGGLE SELECTOR BAR */}
      <div className="mb-3 flex items-center justify-between w-full max-w-[340px] sm:max-w-[350px] px-1">
        <div className="flex items-center gap-1.5 bg-[#0f242e] p-1 rounded-xl border border-[#264c5d]">
          <button
            type="button"
            onClick={() => setIsFlipped(false)}
            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              !isFlipped
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#7a9aa9] hover:text-white'
            }`}
          >
            Front Side
          </button>
          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              isFlipped
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[#7a9aa9] hover:text-white'
            }`}
          >
            Back Side
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-[#7a9aa9] font-bold font-mono">
          <span className={`w-2 h-2 rounded-full ${isResigned ? 'bg-red-500' : 'bg-[#00E676] animate-pulse'}`} />
          <span>{isResigned ? 'RESIGNED' : 'ACTIVE ID'}</span>
        </div>
      </div>

      {/* CARD 3D FLIP CONTAINER - CR80 Aspect Ratio (54 × 85.6 mm / 1:1.585) */}
      <div 
        className="w-full max-w-[340px] sm:max-w-[350px] aspect-[54/85.6] perspective-1000 cursor-pointer relative group"
        onClick={() => setIsFlipped(!isFlipped)}
        title="Click card to flip face"
      >
        <div 
          className={`w-full h-full relative transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ======================================================== */}
          {/* FRONT FACE (CR80 Standard: 85.6 × 54 mm)                 */}
          {/* ======================================================== */}
          <div 
            ref={frontCardRef}
            className="absolute inset-0 backface-hidden rounded-[20px] sm:rounded-[22px] overflow-hidden bg-[#132c37] text-white shadow-2xl border border-[#264c5d] flex flex-col justify-between p-4 sm:p-5"
          >
            {/* TOP HEADER */}
            <div className="flex items-center justify-between">
              {/* Logo and Brand */}
              <div className="flex items-center gap-2.5">
                <WeeHurLogo variant="stacked" className="h-9 w-auto shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-wider text-white leading-tight">
                    CONSTRUCTION
                  </span>
                  <span className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#7a9aa9]">
                    DIGITAL IDENTITY
                  </span>
                </div>
              </div>

              {/* Secure Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0f242e]/90 border border-[#264c5d] text-slate-200 shadow-xs">
                <Shield className="w-3 h-3 text-[#38BDF8]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-white">SECURE</span>
              </div>
            </div>

            {/* CENTER: PHOTO, NAME, DESIGNATION */}
            <div className="flex flex-col items-center my-auto py-1">
              {/* Circular Avatar with Gradient Ring */}
              <div className="relative">
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#f43f5e] via-[#8b5cf6] to-[#06b6d4] shadow-lg">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                    {employee.photoUrl && !imgError ? (
                      <img 
                        src={employee.photoUrl} 
                        alt={employee.fullName}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b3d4d] to-[#0d212b] text-white text-xl font-black tracking-wider">
                        {getInitials(employee.fullName)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Dot */}
                <div 
                  className={`absolute bottom-0.5 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#132c37] ${
                    isResigned ? 'bg-red-500' : 'bg-[#00E676]'
                  }`}
                  title={isResigned ? 'Resigned' : 'Active'}
                />
              </div>

              {/* Full Name */}
              <h3 className="text-base sm:text-lg font-black text-white text-center mt-2 leading-tight tracking-wide uppercase px-2 line-clamp-2">
                {employee.fullName}
              </h3>

              {/* Designation */}
              <p className="text-[10.5px] sm:text-[11.5px] font-bold text-[#FF5C5C] text-center uppercase tracking-widest mt-0.5">
                {employee.designation}
              </p>
            </div>

            {/* DETAILS CONTAINER */}
            <div className="bg-[#0d212b]/80 border border-[#234759]/60 rounded-xl p-2.5 sm:p-3 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">
                  EMAIL
                </span>
                <span className="font-bold text-white tracking-wide truncate max-w-[180px]" title={employee.email}>
                  {employee.email}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">
                  SITE
                </span>
                <span className="font-extrabold text-[#38BDF8] uppercase tracking-wider">
                  {siteName}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">
                  DATE OF EMPLOYMENT
                </span>
                <span className="font-bold text-white font-mono tracking-wider">
                  {employmentDate}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">
                  JOINED SITE DATE
                </span>
                <span className="font-bold text-white font-mono tracking-wider">
                  {siteJoinedDate}
                </span>
              </div>
            </div>

            {/* FRONT FOOTER */}
            <div className="pt-1 flex items-center justify-between text-[9px] font-extrabold text-[#7a9aa9] tracking-wider uppercase font-mono">
              <span>ID: {employee.employeeId}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#0f242e] border border-[#234759]/60 text-cyan-300">
                CR80 • 85.6 × 54 MM
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BACK FACE (CR80 Standard: 85.6 × 54 mm)                  */}
          {/* ======================================================== */}
          <div 
            ref={backCardRef}
            className="absolute inset-0 backface-hidden rotate-y-180 rounded-[20px] sm:rounded-[22px] overflow-hidden bg-[#132c37] text-white shadow-2xl border border-[#264c5d] flex flex-col justify-between p-4 sm:p-5"
          >
            {/* BACK TOP HEADER */}
            <div className="flex items-center justify-between border-b border-[#234759]/40 pb-2.5">
              <div className="flex items-center gap-2.5">
                <WeeHurLogo variant="stacked" className="h-8 w-auto shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-white leading-tight">
                  CONSTRUCTION
                </span>
              </div>

              <span 
                className={`px-2.5 py-0.5 rounded-md text-white font-black text-[9px] tracking-wider uppercase shadow-xs ${
                  isResigned ? 'bg-red-600' : 'bg-[#00C853]'
                }`}
              >
                {isResigned ? 'RESIGNED' : 'ACTIVE ID'}
              </span>
            </div>

            {/* INSTRUCTIONS & BARCODE */}
            <div className="my-auto py-1">
              <h4 className="text-[10.5px] font-black uppercase tracking-wider text-[#3B82F6] mb-1.5">
                GENERAL INSTRUCTIONS
              </h4>
              <div className="space-y-1 text-[9.5px] sm:text-[10px] text-[#cbd5e1] leading-relaxed">
                <p>
                  1. This card remains company property and must be surrendered upon termination.
                </p>
                <p>
                  2. This card must be worn and clearly displayed at all times on site.
                </p>
                <p>
                  3. Strictly non-transferable or loanable to another person.
                </p>
                <p>
                  4. Report loss immediately to Human Resource Department.
                </p>
              </div>

              {/* White Barcode Box */}
              <div className="bg-white rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center max-w-[240px] w-full mx-auto shadow-md mt-2.5">
                <Barcode 
                  value={employee.employeeId} 
                  height={32} 
                  showText={true} 
                  barColor="#000000"
                  textColor="#000000"
                  className="w-full"
                />
              </div>

              {/* Return Information */}
              <div className="text-center space-y-0.5 mt-2 text-[8.5px] text-[#7a9aa9]">
                <div className="font-bold text-slate-300">
                  If found, please return to:
                </div>
                <div>
                  Wee Hur Building, 39 Kim Keat Road, Singapore 328814
                </div>
                <div>
                  Tel: +65 6258 1002 | Email: hr@weehur.com.sg
                </div>
              </div>
            </div>

            {/* BACK FOOTER */}
            <div className="border-t border-[#234759]/60 pt-1.5 text-center text-[9px] font-black text-[#7a9aa9] uppercase tracking-widest">
              WEE HUR DIGITAL ID • CR80 (85.6 × 54 MM)
            </div>
          </div>
        </div>
      </div>

      {/* HINT BELOW BADGE */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-2.5 font-medium">
        <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
        <span>Click card to flip between Front and Back</span>
      </div>

      {/* ACTION BUTTON CONTROLS */}
      <div className="mt-3.5 w-full max-w-[340px] sm:max-w-[350px] flex flex-col gap-2">
        {/* Primary Action: Print CR80 (85.6 × 54 mm) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPrintModal(true);
          }}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-red-950/40 active:scale-98 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print ID Card (CR80 • 85.6 × 54 mm)</span>
        </button>

        {/* Secondary Actions: Flip | Download PNG | Save VCF */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Flip Card */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsFlipped(!isFlipped);
            }}
            className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Flip Face</span>
          </button>

          {/* 2. Download Badge */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            disabled={downloading}
            className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[11px] font-bold rounded-xl shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{downloading ? 'Saving...' : 'PNG'}</span>
          </button>

          {/* 3. Save Contact (vCard) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadVCardFile(employee);
            }}
            className="flex items-center justify-center gap-1 px-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-xs active:scale-98 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Save VCF</span>
          </button>
        </div>
      </div>

      {/* CR80 PRINT MODAL */}
      <CR80PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        employee={employee}
      />

    </div>
  );
}

