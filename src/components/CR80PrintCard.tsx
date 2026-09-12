import React from 'react';
import { Shield } from 'lucide-react';
import { Employee } from '../types';
import { WeeHurLogo } from './WeeHurLogo';
import { Barcode } from './Barcode';
import { formatDateValue } from '../utils/dateUtils';

interface CR80PrintCardProps {
  employee: Employee;
  side: 'front' | 'back';
  /**
   * 'screen': preview scaled with CSS aspect ratio
   * 'print-mm': exact physical 54mm × 85.6mm for direct card printing / A4 paper
   * 'export-300dpi': fixed 638px × 1011px for 300 DPI high-res image generation
   */
  mode?: 'screen' | 'print-mm' | 'export-300dpi';
  className?: string;
}

export const CR80PrintCard: React.FC<CR80PrintCardProps> = ({
  employee,
  side,
  mode = 'screen',
  className = ''
}) => {
  const isResigned = employee.status === 'Resigned';
  const employmentDate = formatDateValue(employee.dateJoined) || '2026-07-21';
  const siteJoinedDate = formatDateValue(employee.dateJoinedProject) || formatDateValue(employee.dateJoined) || '2026-07-21';
  const siteName = (employee.workSites && employee.workSites.length > 0) ? employee.workSites.join(', ') : 'MVFPC';

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

  // Dimensions based on mode:
  // Standard CR80 is 85.60 mm × 53.98 mm (portrait: 54 mm × 85.6 mm, corner radius 3.18 mm)
  // At 300 DPI: 53.98 mm = 638 px, 85.60 mm = 1011 px
  let containerStyle: React.CSSProperties = {};
  let containerClasses = '';

  if (mode === 'print-mm') {
    containerStyle = {
      width: '54mm',
      height: '85.6mm',
      borderRadius: '3.18mm',
      boxSizing: 'border-box',
      overflow: 'hidden',
      backgroundColor: '#132c37',
      color: '#ffffff',
      padding: '3.5mm',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      pageBreakInside: 'avoid',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
      border: '0.4mm solid #264c5d'
    };
  } else if (mode === 'export-300dpi') {
    containerStyle = {
      width: '638px',
      height: '1011px',
      borderRadius: '38px', // ~3.18mm at 300 DPI
      boxSizing: 'border-box',
      overflow: 'hidden',
      backgroundColor: '#132c37',
      color: '#ffffff',
      padding: '42px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      border: '4px solid #264c5d'
    };
  } else {
    containerClasses = `w-full max-w-[340px] sm:max-w-[350px] aspect-[54/85.6] rounded-[20px] sm:rounded-[22px] overflow-hidden bg-[#132c37] text-white shadow-2xl border border-[#264c5d] flex flex-col justify-between p-5 sm:p-6 ${className}`;
  }

  // -------------------------------------------------------------
  // 1. PRINT MM MODE (True 54mm × 85.6mm Physical Card Dimensions)
  // -------------------------------------------------------------
  if (mode === 'print-mm') {
    if (side === 'front') {
      return (
        <div style={containerStyle} className="cr80-card-print select-none">
          {/* Top Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
              <WeeHurLogo variant="stacked" style={{ height: '7mm', width: 'auto' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '2mm', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1mm', lineHeight: '2.2mm', color: '#ffffff' }}>
                  CONSTRUCTION
                </span>
                <span style={{ fontSize: '1.3mm', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25mm', color: '#7a9aa9', marginTop: '0.2mm' }}>
                  DIGITAL IDENTITY
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8mm', padding: '0.5mm 1.5mm', borderRadius: '10mm', backgroundColor: '#0f242e', border: '0.2mm solid #264c5d' }}>
              <Shield style={{ width: '2.2mm', height: '2.2mm', color: '#38BDF8' }} />
              <span style={{ fontSize: '1.4mm', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.1mm' }}>
                SECURE
              </span>
            </div>
          </div>

          {/* Center: Photo, Name, Designation */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0', padding: '1mm 0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ padding: '0.6mm', borderRadius: '50%', background: 'linear-gradient(135deg, #f43f5e, #8b5cf6, #06b6d4)' }}>
                <div style={{ width: '21mm', height: '21mm', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {employee.photoUrl ? (
                    <img 
                      src={employee.photoUrl} 
                      alt={employee.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1b3d4d, #0d212b)', color: '#ffffff', fontSize: '5mm', fontWeight: 900 }}>
                      {getInitials(employee.fullName)}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Dot */}
              <div style={{
                position: 'absolute',
                bottom: '0.4mm',
                right: '0.8mm',
                width: '3.2mm',
                height: '3.2mm',
                borderRadius: '50%',
                border: '0.4mm solid #132c37',
                backgroundColor: isResigned ? '#ef4444' : '#00E676'
              }} />
            </div>

            <h3 style={{ fontSize: '3.0mm', fontWeight: 900, color: '#ffffff', textAlign: 'center', marginTop: '1.8mm', lineHeight: '3.5mm', textTransform: 'uppercase', letterSpacing: '0.1mm', maxHeight: '7.2mm', overflow: 'hidden' }}>
              {employee.fullName}
            </h3>

            <p style={{ fontSize: '1.9mm', fontWeight: 700, color: '#FF5C5C', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.3mm', marginTop: '0.5mm' }}>
              {employee.designation}
            </p>
          </div>

          {/* Details Box */}
          <div style={{ backgroundColor: 'rgba(13, 33, 43, 0.85)', border: '0.3mm solid rgba(35, 71, 89, 0.6)', borderRadius: '2mm', padding: '1.8mm 2.2mm', display: 'flex', flexDirection: 'column', gap: '1.2mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5mm', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>EMAIL</span>
              <span style={{ fontSize: '1.7mm', fontWeight: 700, color: '#ffffff', maxWidth: '28mm', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {employee.email}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5mm', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>SITE</span>
              <span style={{ fontSize: '1.7mm', fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase' }}>
                {siteName}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5mm', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>DATE JOINED</span>
              <span style={{ fontSize: '1.7mm', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                {employmentDate}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5mm', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>PROJECT DATE</span>
              <span style={{ fontSize: '1.7mm', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                {siteJoinedDate}
              </span>
            </div>
          </div>

          {/* Front Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.5mm', fontWeight: 800, color: '#7a9aa9', textTransform: 'uppercase', fontFamily: 'monospace', paddingTop: '1mm' }}>
            <span>ID: {employee.employeeId}</span>
            <span>CR80 • 85.6 × 54 MM</span>
          </div>
        </div>
      );
    }

    // Back face (Print MM)
    return (
      <div style={containerStyle} className="cr80-card-print select-none">
        {/* Back Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.3mm solid rgba(35, 71, 89, 0.5)', paddingBottom: '1.5mm' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
            <WeeHurLogo variant="stacked" style={{ height: '6.5mm', width: 'auto' }} />
            <span style={{ fontSize: '2mm', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1mm', color: '#ffffff' }}>
              CONSTRUCTION
            </span>
          </div>

          <span style={{ padding: '0.5mm 1.5mm', borderRadius: '1mm', color: '#ffffff', fontWeight: 900, fontSize: '1.5mm', textTransform: 'uppercase', backgroundColor: isResigned ? '#dc2626' : '#00C853' }}>
            {isResigned ? 'RESIGNED' : 'ACTIVE ID'}
          </span>
        </div>

        {/* Instructions & Barcode */}
        <div style={{ margin: 'auto 0', padding: '1mm 0' }}>
          <div style={{ fontSize: '1.8mm', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15mm', color: '#3B82F6', marginBottom: '1.2mm' }}>
            GENERAL INSTRUCTIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1mm', fontSize: '1.5mm', color: '#cbd5e1', lineHeight: '2.1mm' }}>
            <div>1. Surrender card upon termination of service.</div>
            <div>2. Must be worn and displayed at all times on site.</div>
            <div>3. Strictly non-transferable to any other person.</div>
            <div>4. Report loss immediately to Human Resource Dept.</div>
          </div>

          {/* Barcode Box */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '2mm', padding: '1.5mm 2mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '42mm', margin: '2mm auto 0', boxShadow: '0 1mm 2mm rgba(0,0,0,0.2)' }}>
            <Barcode 
              value={employee.employeeId} 
              height={26} 
              showText={true} 
              barColor="#000000"
              textColor="#000000"
              className="w-full"
            />
          </div>

          {/* Return Info */}
          <div style={{ textAlign: 'center', marginTop: '2mm', fontSize: '1.3mm', color: '#7a9aa9', lineHeight: '1.7mm' }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0' }}>If found, please return to:</div>
            <div>Wee Hur Building, 39 Kim Keat Road, Singapore 328814</div>
            <div>Tel: +65 6258 1002 | Email: hr@weehur.com.sg</div>
          </div>
        </div>

        {/* Back Footer */}
        <div style={{ borderTop: '0.3mm solid rgba(35, 71, 89, 0.6)', paddingTop: '1mm', textAlign: 'center', fontSize: '1.5mm', fontWeight: 900, color: '#7a9aa9', textTransform: 'uppercase', letterSpacing: '0.2mm' }}>
          WEE HUR DIGITAL ID • CR80 (85.6 × 54 MM)
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. 300 DPI EXPORT MODE (638px × 1011px for PVC Card Software)
  // -------------------------------------------------------------
  if (mode === 'export-300dpi') {
    if (side === 'front') {
      return (
        <div style={containerStyle} className="select-none">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <WeeHurLogo variant="stacked" style={{ height: '70px', width: 'auto' }} />
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '22px' }}>
                  CONSTRUCTION
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#7a9aa9', marginTop: '2px' }}>
                  DIGITAL IDENTITY
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '9999px', backgroundColor: '#0f242e', border: '2px solid #264c5d' }}>
              <Shield style={{ width: '18px', height: '18px', color: '#38BDF8' }} />
              <span style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                SECURE
              </span>
            </div>
          </div>

          {/* Center */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ padding: '5px', borderRadius: '50%', background: 'linear-gradient(135deg, #f43f5e, #8b5cf6, #06b6d4)' }}>
                <div style={{ width: '190px', height: '190px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {employee.photoUrl ? (
                    <img 
                      src={employee.photoUrl} 
                      alt={employee.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1b3d4d, #0d212b)', color: '#ffffff', fontSize: '42px', fontWeight: 900 }}>
                      {getInitials(employee.fullName)}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '3px solid #132c37',
                backgroundColor: isResigned ? '#ef4444' : '#00E676'
              }} />
            </div>

            <h3 style={{ fontSize: '28px', fontWeight: 900, textAlign: 'center', marginTop: '16px', lineHeight: '34px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {employee.fullName}
            </h3>

            <p style={{ fontSize: '17px', fontWeight: 700, color: '#FF5C5C', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>
              {employee.designation}
            </p>
          </div>

          {/* Details Box */}
          <div style={{ backgroundColor: 'rgba(13, 33, 43, 0.85)', border: '2px solid rgba(35, 71, 89, 0.6)', borderRadius: '20px', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>EMAIL</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{employee.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>SITE</span>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase' }}>{siteName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>DATE JOINED</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>{employmentDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7a9aa9', textTransform: 'uppercase' }}>PROJECT DATE</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>{siteJoinedDate}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 800, color: '#7a9aa9', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            <span>ID: {employee.employeeId}</span>
            <span>CR80 • 85.6 × 54 MM (300 DPI)</span>
          </div>
        </div>
      );
    }

    // Back face (300 DPI)
    return (
      <div style={containerStyle} className="select-none">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid rgba(35, 71, 89, 0.5)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <WeeHurLogo variant="stacked" style={{ height: '64px', width: 'auto' }} />
            <span style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
              CONSTRUCTION
            </span>
          </div>

          <span style={{ padding: '6px 14px', borderRadius: '8px', color: '#ffffff', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', backgroundColor: isResigned ? '#dc2626' : '#00C853' }}>
            {isResigned ? 'RESIGNED' : 'ACTIVE ID'}
          </span>
        </div>

        <div style={{ margin: 'auto 0' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B82F6', marginBottom: '12px' }}>
            GENERAL INSTRUCTIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#cbd5e1', lineHeight: '20px' }}>
            <div>1. Surrender card upon termination of service.</div>
            <div>2. Must be worn and displayed at all times while on corporate premises and project sites.</div>
            <div>3. Under no circumstances should this identity card be transferred or loaned to another person.</div>
            <div>4. Loss of card must be reported immediately to the Human Resource Department.</div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '16px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '420px', margin: '24px auto 0', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            <Barcode 
              value={employee.employeeId} 
              height={38} 
              showText={true} 
              barColor="#000000"
              textColor="#000000"
              className="w-full"
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#7a9aa9', lineHeight: '18px' }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '13px' }}>If found, please return to:</div>
            <div>Wee Hur Building, 39 Kim Keat Road, Singapore 328814</div>
            <div>Tel: +65 6258 1002 | Email: hr@weehur.com.sg</div>
          </div>
        </div>

        <div style={{ borderTop: '2px solid rgba(35, 71, 89, 0.6)', paddingTop: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 900, color: '#7a9aa9', textTransform: 'uppercase', letterSpacing: '2px' }}>
          WEE HUR DIGITAL ID • CR80 (85.6 × 54 MM)
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. SCREEN RESPONSIVE MODE (Uses CSS aspect ratio 54/85.6)
  // -------------------------------------------------------------
  if (side === 'front') {
    return (
      <div className={containerClasses}>
        {/* Top Header */}
        <div className="flex items-center justify-between">
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

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0f242e]/90 border border-[#264c5d] text-slate-200 shadow-xs">
            <Shield className="w-3 h-3 text-[#38BDF8]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-white">SECURE</span>
          </div>
        </div>

        {/* Center: Photo, Name, Designation */}
        <div className="flex flex-col items-center my-auto py-1">
          <div className="relative">
            <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-[#f43f5e] via-[#8b5cf6] to-[#06b6d4] shadow-md">
              <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                {employee.photoUrl ? (
                  <img 
                    src={employee.photoUrl} 
                    alt={employee.fullName}
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

            <div 
              className={`absolute bottom-0.5 right-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#132c37] ${
                isResigned ? 'bg-red-500' : 'bg-[#00E676]'
              }`}
              title={isResigned ? 'Resigned' : 'Active'}
            />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white text-center mt-2.5 leading-tight tracking-wide uppercase px-2 line-clamp-2">
            {employee.fullName}
          </h3>

          <p className="text-[11px] sm:text-xs font-bold text-[#FF5C5C] text-center uppercase tracking-widest mt-0.5">
            {employee.designation}
          </p>
        </div>

        {/* Details Box */}
        <div className="bg-[#0d212b]/80 border border-[#234759]/60 rounded-xl p-3 space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">EMAIL</span>
            <span className="font-bold text-white tracking-wide truncate max-w-[170px]" title={employee.email}>
              {employee.email}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">SITE</span>
            <span className="font-extrabold text-[#38BDF8] uppercase tracking-wider">
              {siteName}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">DATE JOINED</span>
            <span className="font-bold text-white font-mono">{employmentDate}</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[9.5px] font-bold text-[#7a9aa9] uppercase tracking-wider">PROJECT DATE</span>
            <span className="font-bold text-white font-mono">{siteJoinedDate}</span>
          </div>
        </div>

        {/* Front Footer */}
        <div className="pt-1 flex items-center justify-between text-[9px] font-extrabold text-[#7a9aa9] tracking-wider uppercase font-mono">
          <span>ID: {employee.employeeId}</span>
          <span className="text-[8.5px] bg-[#0f242e] px-2 py-0.5 rounded border border-[#234759]/60 text-cyan-300">
            CR80 • 85.6 × 54 MM
          </span>
        </div>
      </div>
    );
  }

  // Back Face Screen Mode
  return (
    <div className={containerClasses}>
      {/* Back Top Header */}
      <div className="flex items-center justify-between border-b border-[#234759]/40 pb-3">
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

      {/* Instructions & Barcode */}
      <div className="my-auto py-1">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#3B82F6] mb-1.5">
          GENERAL INSTRUCTIONS
        </h4>
        <div className="space-y-1.5 text-[9.5px] text-[#cbd5e1] leading-relaxed">
          <p>1. Surrender card upon termination of service.</p>
          <p>2. Must be worn and displayed at all times on site.</p>
          <p>3. Strictly non-transferable to another person.</p>
          <p>4. Report loss immediately to HR Department.</p>
        </div>

        {/* White Barcode Box */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center max-w-[240px] w-full mx-auto shadow-md mt-3">
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
        <div className="text-center space-y-0.5 mt-2.5 text-[8.5px] text-[#7a9aa9]">
          <div className="font-bold text-slate-300">If found, please return to:</div>
          <div>Wee Hur Building, 39 Kim Keat Road, Singapore 328814</div>
          <div>Tel: +65 6258 1002 | Email: hr@weehur.com.sg</div>
        </div>
      </div>

      {/* Back Footer */}
      <div className="border-t border-[#234759]/60 pt-2 text-center text-[9px] font-black text-[#7a9aa9] uppercase tracking-widest">
        WEE HUR DIGITAL ID • CR80 (85.6 × 54 MM)
      </div>
    </div>
  );
};
