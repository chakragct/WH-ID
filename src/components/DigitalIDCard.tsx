import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Mail, Award, Download, Loader2 } from 'lucide-react';
import { Employee } from '../types';
import { WeeHurLogo } from './WeeHurLogo';
import { toBlob } from 'html-to-image';

interface DigitalIDCardProps {
  employee: Employee;
}

const getSafePhotoDataUrl = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (e) {
        console.warn("Failed to convert image to base64", e);
      }
      resolve(null);
    };
    img.onerror = () => {
      console.warn("Image load failed for getSafePhotoDataUrl, using native fallback");
      resolve(null);
    };
    
    // Add cache-busting to bypass cached non-CORS responses in browsers
    try {
      const busterUrl = url.includes('?') 
        ? `${url}&cb=${Date.now()}` 
        : `${url}?cb=${Date.now()}`;
      img.src = busterUrl;
    } catch {
      img.src = url;
    }
  });
};

export default function DigitalIDCard({ employee }: DigitalIDCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const isRealPhotoUrl = (url?: string | null) => Boolean(url && url.trim() !== '' && !url.includes('unsplash.com'));

  const [safePhotoUrl, setSafePhotoUrl] = useState<string | null>(
    employee.photoUrl && employee.photoUrl.startsWith('data:') 
      ? employee.photoUrl 
      : null
  );

  useEffect(() => {
    let active = true;
    const loadSafePhoto = async () => {
      if (!isRealPhotoUrl(employee.photoUrl)) {
        setSafePhotoUrl(null);
        return;
      }
      try {
        const base64 = await getSafePhotoDataUrl(employee.photoUrl!);
        if (active) {
          setSafePhotoUrl(base64);
        }
      } catch (err) {
        if (active) {
          setSafePhotoUrl(null);
        }
      }
    };
    loadSafePhoto();
    return () => {
      active = false;
    };
  }, [employee.photoUrl]);

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Resigned':
      default:
        return 'bg-red-600';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-600';
      case 'Resigned':
      default:
        return 'bg-red-600';
    }
  };

  const handleDownloadCombinedCard = async () => {
    const elementId = `export-combined-card-${employee.employeeId}`;
    const element = document.getElementById(elementId);
    if (!element) {
      alert('Error: Export template not found in DOM.');
      return;
    }

    setDownloading(true);

    try {
      // Small timeout to guarantee DOM is ready and styled
      await new Promise((resolve) => setTimeout(resolve, 250));

      const blob = await toBlob(element, {
        cacheBust: true,
        backgroundColor: '#0b1329', // Match corporate background plate
        pixelRatio: 2.0, // Clean, high-resolution scale
        style: {
          transform: 'none',
          position: 'relative',
          top: '0',
          left: '0',
          margin: '0',
        }
      });

      if (!blob) {
        alert('Failed to generate image file.');
        setDownloading(false);
        return;
      }

      try {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const safeName = employee.fullName.replace(/[^a-zA-Z0-9]/g, '_');
        
        link.download = `${safeName}_Digital_ID_Card.png`;
        link.href = blobUrl;
        
        // Append to document to ensure triggers work perfectly inside all frame contexts
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 150);
      } catch (err) {
        console.error('Trigger download failed:', err);
        alert('Failed to automatically download. Please right-click and save if possible, or open in a new tab.');
      } finally {
        setDownloading(false);
      }

    } catch (error: any) {
      console.error('Error generating card image:', error);
      alert(`Failed to render ID card image: ${error?.message || error || 'Unknown error'}. If you are inside the preview frame, click "Open in New Tab" at the top right to download perfectly!`);
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center select-none" id={`digital-id-container-${employee.employeeId}`}>
      {/* CARD VIEWPORT FLIP CONTAINER */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-[320px] h-[480px] perspective-1000 cursor-pointer relative group transition-transform duration-350"
      >
        <div 
          className={`w-full h-full relative transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE */}
          <div className="absolute inset-0 backface-hidden rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-150 bg-gradient-to-b from-[#0F2027] via-[#203A43] to-[#2C5364] text-white flex flex-col justify-between p-6">
            
            {/* Top Corporate Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WeeHurLogo className="w-8 h-8 shrink-0" />
                <div className="leading-tight">
                  <h4 className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {employee.company || 'WeeHur Construction'}
                  </h4>
                  <p className="text-[7px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">
                    Digital Identity
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                <Shield className="w-2.5 h-2.5 text-blue-400" />
                <span>SECURE</span>
              </div>
            </div>

            {/* Employee Main Profile Photo Section */}
            <div className="flex flex-col items-center my-4">
              <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-red-600 to-blue-500 shadow-lg flex items-center justify-center">
                {safePhotoUrl ? (
                  <img 
                    src={safePhotoUrl} 
                    alt={employee.fullName}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1e293b] flex items-center justify-center text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-slate-400">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${getStatusColorClass(employee.status)}`} title={employee.status} />
              </div>

              <h3 className="text-lg font-black tracking-tight text-white mt-3 text-center uppercase">
                {employee.fullName}
              </h3>
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mt-0.5">
                {employee.designation}
              </p>
            </div>

            {/* Grid Stats Card Info */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 space-y-1.5 border border-white/5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Email</span>
                <span className="font-extrabold truncate max-w-[160px]">{employee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Site</span>
                <span className="font-extrabold text-blue-400 truncate max-w-[160px]" title={employee.workSites ? employee.workSites.join(', ') : 'None'}>
                  {employee.workSites && employee.workSites.length > 0 ? employee.workSites.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Date of Employment</span>
                <span className="font-extrabold">{employee.dateJoined}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Joined Site Date</span>
                <span className="font-extrabold">{employee.dateJoinedProject || 'N/A'}</span>
              </div>
              {employee.remarks && (
                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                  <span className="text-slate-400 font-bold uppercase">Remarks</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[160px]" title={employee.remarks}>{employee.remarks}</span>
                </div>
              )}
            </div>

            {/* Click Instructions Bottom Bar */}
            <div className="text-center pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-[7px] text-slate-300 font-bold uppercase tracking-wider">
                {employee.status === 'Resigned' 
                  ? `Resigned: ${employee.lastDateOfWork || '-'}` 
                  : `ID: ${employee.employeeId}`}
              </span>
              <span className="text-[8px] text-red-400 animate-pulse font-black uppercase tracking-wider">
                Click to Flip →
              </span>
            </div>

          </div>

          {/* BACK SIDE (NORMAL PHYSICAL ID BACK SIDE) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-150 bg-[#0F172A] text-white flex flex-col justify-between p-6">
            
            {/* Back Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5">
                <WeeHurLogo className="w-5 h-5 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">
                  {employee.company || 'WeeHur Construction'}
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusBadgeClass(employee.status)}`}>
                {employee.status} ID
              </div>
            </div>

            {/* Professional Card Instructions & Terms */}
            <div className="my-2 space-y-2.5 text-left">
              <h5 className="text-[9px] font-black tracking-wider uppercase text-blue-400 border-b border-white/5 pb-1">
                General Instructions
              </h5>
              <ol className="list-decimal list-inside space-y-2 text-[8px] leading-relaxed text-slate-300 font-medium">
                <li>This card remains the property of the company and must be surrendered upon termination of service.</li>
                <li>This card must be worn and clearly displayed at all times while on corporate premises and project sites.</li>
                <li>Under no circumstances should this identity card be transferred or loaned to another person.</li>
                <li>Loss of card must be reported immediately to the Human Resource Department.</li>
              </ol>
            </div>

            {/* Barcode & Return Instructions Section */}
            <div className="space-y-3">
              {/* Sleek CSS-drawn 1D Barcode */}
              <div className="flex flex-col items-center justify-center bg-white py-2 px-4 rounded-xl shadow-inner max-w-[190px] mx-auto w-full border border-slate-200">
                <div className="flex items-center justify-center gap-[1.5px] h-7 w-full overflow-hidden opacity-90">
                  <div className="w-[2.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[4px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[4.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[1.5px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[2.5px] h-full bg-slate-950"></div>
                  <div className="w-[4px] h-full bg-slate-950"></div>
                </div>
                <span className="text-[7px] text-slate-800 font-mono tracking-widest mt-1 font-bold">
                  *{employee.employeeId || 'WH-ADMIN'}*
                </span>
              </div>

              {/* Corporate Office details */}
              <div className="text-[7.5px] text-slate-400 text-center leading-normal pt-1 border-t border-white/5">
                <p className="font-bold text-slate-300">
                  If found, please return to:
                </p>
                <p>39 Kim Chuan Drive, Wee Hur Building, Singapore 537011</p>
                <p className="text-slate-500 mt-1 font-bold">
                  Tel: +65 6258 1002 | Email: hr@weehur.com.sg
                </p>
              </div>
            </div>

            {/* Return To Face Hint */}
            <div className="text-center pt-2 border-t border-white/10 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              ← Click to view badge face
            </div>

          </div>

        </div>
      </div>

      {/* SINGLE DOWNLOAD / SAVE ID CARD BUTTON */}
      <div className="mt-6 w-full max-w-[320px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadCombinedCard();
          }}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4.5 h-4.5" />
          )}
          <span>{downloading ? 'Generating ID...' : 'Download ID Card'}</span>
        </button>
        <p className="text-[10px] text-center text-slate-400 mt-2 font-medium">
          Note: This downloads a high-resolution image showing both sides side-by-side.
        </p>
      </div>

      {/* PERFECT PRINT/SAVE EXPORT CONTAINER (Positioned off-screen, keeping visibility high so html-to-image renders perfectly) */}
      <div className="fixed top-0 left-[-9999px] w-[720px] h-[544px] pointer-events-none overflow-hidden">
        <div 
          id={`export-combined-card-${employee.employeeId}`}
          className="relative flex gap-8 p-8 bg-[#0b1329] text-white w-[720px] h-[544px] items-center justify-center rounded-[32px]"
        >
          {/* Flat Front Export Plate */}
          <div className="w-[320px] h-[480px] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#0F2027] via-[#203A43] to-[#2C5364] text-white flex flex-col justify-between p-6 shrink-0 shadow-xl">
            {/* Top Corporate Branding */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WeeHurLogo className="w-8 h-8 shrink-0" />
                <div className="leading-tight">
                  <h4 className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {employee.company || 'WeeHur Construction'}
                  </h4>
                  <p className="text-[7px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">
                    Digital Identity
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
                <Shield className="w-2.5 h-2.5 text-blue-400" />
                <span>SECURE</span>
              </div>
            </div>

            {/* Employee Main Profile Photo Section */}
            <div className="flex flex-col items-center my-4">
              <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-red-600 to-blue-500 shadow-lg flex items-center justify-center">
                {safePhotoUrl ? (
                  <img 
                    src={safePhotoUrl} 
                    alt={employee.fullName}
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1e293b] flex items-center justify-center text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-slate-400">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
                <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${getStatusColorClass(employee.status)}`} />
              </div>

              <h3 className="text-lg font-black tracking-tight text-white mt-3 text-center uppercase">
                {employee.fullName}
              </h3>
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mt-0.5">
                {employee.designation}
              </p>
            </div>

            {/* Grid Stats Card Info */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3.5 space-y-1.5 border border-white/5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Email</span>
                <span className="font-extrabold truncate max-w-[160px]">{employee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Site</span>
                <span className="font-extrabold text-blue-400 truncate max-w-[160px]">
                  {employee.workSites && employee.workSites.length > 0 ? employee.workSites.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Date of Employment</span>
                <span className="font-extrabold">{employee.dateJoined}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Joined Site Date</span>
                <span className="font-extrabold">{employee.dateJoinedProject || 'N/A'}</span>
              </div>
              {employee.remarks && (
                <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                  <span className="text-slate-400 font-bold uppercase">Remarks</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[160px]">{employee.remarks}</span>
                </div>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="text-center pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-[7px] text-slate-300 font-bold uppercase tracking-wider">
                {employee.status === 'Resigned' 
                  ? `Resigned: ${employee.lastDateOfWork || '-'}` 
                  : `ID: ${employee.employeeId}`}
              </span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                WEE HUR DIGITAL IDENTITY
              </span>
            </div>
          </div>

          {/* Flat Back Export Plate */}
          <div className="w-[320px] h-[480px] rounded-3xl overflow-hidden border border-white/10 bg-[#0F172A] text-white flex flex-col justify-between p-6 shrink-0 shadow-xl">
            {/* Back Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5">
                <WeeHurLogo className="w-5 h-5 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">
                  {employee.company || 'WeeHur Construction'}
                </span>
              </div>
              <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${getStatusBadgeClass(employee.status)}`}>
                {employee.status} ID
              </div>
            </div>

            {/* Instructions */}
            <div className="my-2 space-y-2.5 text-left">
              <h5 className="text-[9px] font-black tracking-wider uppercase text-blue-400 border-b border-white/5 pb-1">
                General Instructions
              </h5>
              <ol className="list-decimal list-inside space-y-2 text-[8px] leading-relaxed text-slate-300 font-medium">
                <li>This card remains the property of the company and must be surrendered upon termination of service.</li>
                <li>This card must be worn and clearly displayed at all times while on corporate premises and project sites.</li>
                <li>Under no circumstances should this identity card be transferred or loaned to another person.</li>
                <li>Loss of card must be reported immediately to the Human Resource Department.</li>
              </ol>
            </div>

            {/* Barcode & Return Details */}
            <div className="space-y-3">
              {/* Sleek CSS Barcode */}
              <div className="flex flex-col items-center justify-center bg-white py-2 px-4 rounded-xl shadow-inner max-w-[190px] mx-auto w-full border border-slate-200">
                <div className="flex items-center justify-center gap-[1.5px] h-7 w-full overflow-hidden opacity-90">
                  <div className="w-[2.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[4px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[4.5px] h-full bg-slate-950"></div>
                  <div className="w-[1px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[2px] h-full bg-slate-950"></div>
                  <div className="w-[1.5px] h-full bg-slate-950"></div>
                  <div className="w-[3px] h-full bg-slate-950"></div>
                  <div className="w-[2.5px] h-full bg-slate-950"></div>
                  <div className="w-[4px] h-full bg-slate-950"></div>
                </div>
                <span className="text-[7px] text-slate-800 font-mono tracking-widest mt-1 font-bold">
                  *{employee.employeeId || 'WH-ADMIN'}*
                </span>
              </div>

              {/* Company Info */}
              <div className="text-[7.5px] text-slate-400 text-center leading-normal pt-1 border-t border-white/5">
                <p className="font-bold text-slate-300">
                  If found, please return to:
                </p>
                <p>39 Kim Chuan Drive, Wee Hur Building, Singapore 537011</p>
                <p className="text-slate-500 mt-1 font-bold">
                  Tel: +65 6258 1002 | Email: hr@weehur.com.sg
                </p>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-white/10 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              WEE HUR DIGITAL ID
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
