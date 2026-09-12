import React, { useState, useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Check, 
  Layers, 
  FileText, 
  CreditCard, 
  Sparkles, 
  Info,
  Loader2,
  Maximize2
} from 'lucide-react';
import { Employee } from '../types';
import { CR80PrintCard } from './CR80PrintCard';
import { toBlob } from 'html-to-image';

interface CR80PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export const CR80PrintModal: React.FC<CR80PrintModalProps> = ({
  isOpen,
  onClose,
  employee
}) => {
  const [sides, setSides] = useState<'both' | 'front' | 'back'>('both');
  const [printLayout, setPrintLayout] = useState<'cr80' | 'a4'>('cr80');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Hidden references for high-res 300 DPI exports
  const exportFrontRef = useRef<HTMLDivElement>(null);
  const exportBackRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const safeName = (employee.fullName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_');

  // -------------------------------------------------------------
  // HIGH-RES 300 DPI EXPORT (638 × 1011 px)
  // -------------------------------------------------------------
  const handleDownload300DPI = async (targetSide: 'front' | 'back' | 'both') => {
    setIsExporting(true);
    setExportMessage('Generating 300 DPI PVC images...');

    try {
      await new Promise(r => setTimeout(r, 200));

      const downloadSide = async (ref: HTMLDivElement | null, sideLabel: string) => {
        if (!ref) return;
        const blob = await toBlob(ref, {
          cacheBust: true,
          backgroundColor: '#132c37',
          pixelRatio: 1 // Already sized at 638x1011 px (300 DPI)
        });
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `${safeName}_CR80_${sideLabel}_300DPI.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 300);
      };

      if (targetSide === 'both' || targetSide === 'front') {
        await downloadSide(exportFrontRef.current, 'Front');
      }
      if (targetSide === 'both' || targetSide === 'back') {
        await downloadSide(exportBackRef.current, 'Back');
      }

      setExportMessage('Downloaded successfully!');
      setTimeout(() => setExportMessage(null), 2500);
    } catch (err) {
      console.error('High-res export error:', err);
      setExportMessage('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // PRINT ACTION VIA CLEAN ISOLATED PRINT IFRAME
  // -------------------------------------------------------------
  const handlePrint = () => {
    // Gather front and/or back print-mm markup from the hidden print container
    const printContainer = document.getElementById('cr80-hidden-print-source');
    if (!printContainer) {
      window.print();
      return;
    }

    // Filter which sides to include
    const frontEl = printContainer.querySelector('#print-source-front');
    const backEl = printContainer.querySelector('#print-source-back');

    let contentHtml = '';

    if (printLayout === 'cr80') {
      // Direct PVC Card Printer (54mm × 85.6mm per page)
      if (sides === 'both' || sides === 'front') {
        if (frontEl) {
          contentHtml += `
            <div class="card-page">
              ${frontEl.innerHTML}
            </div>
          `;
        }
      }
      if (sides === 'both' || sides === 'back') {
        if (backEl) {
          contentHtml += `
            <div class="card-page">
              ${backEl.innerHTML}
            </div>
          `;
        }
      }
    } else {
      // A4 / Letter Paper Sheet (True 1:1 Scale with cut guides and fold line)
      contentHtml = `
        <div class="a4-sheet">
          <div class="a4-header">
            <h2>WEE HUR DIGITAL IDENTITY CARD — 1:1 TRUE SCALE CR80 TEMPLATE</h2>
            <p>CR80 Standard Size: 85.6 mm × 54.0 mm | ISO/IEC 7810 ID-1 | Corner Radius: 3.18 mm</p>
            <p class="guide-tip">Print at 100% scale (Do NOT select "Fit to Page"). Cut along the dotted guidelines and fold in half to laminate.</p>
          </div>

          <div class="cards-duo-container">
            ${(sides === 'both' || sides === 'front') && frontEl ? `
              <div class="cut-wrapper">
                <div class="cut-label">FRONT SIDE (54 × 85.6 MM)</div>
                <div class="card-boundary">
                  ${frontEl.innerHTML}
                </div>
              </div>
            ` : ''}

            ${sides === 'both' ? `
              <div class="fold-divider">
                <div class="fold-line"></div>
                <div class="fold-text">FOLD LINE</div>
                <div class="fold-line"></div>
              </div>
            ` : ''}

            ${(sides === 'both' || sides === 'back') && backEl ? `
              <div class="cut-wrapper">
                <div class="cut-label">BACK SIDE (54 × 85.6 MM)</div>
                <div class="card-boundary">
                  ${backEl.innerHTML}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="a4-footer">
            <span>Staff Name: <strong>${employee.fullName}</strong></span>
            <span>Employee ID: <strong>${employee.employeeId}</strong></span>
            <span>Site: <strong>${(employee.workSites || []).join(', ') || 'HQ'}</strong></span>
          </div>
        </div>
      `;
    }

    // Create hidden printing iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    const pageRule = printLayout === 'cr80' 
      ? '@page { size: 54mm 85.6mm; margin: 0; }' 
      : '@page { size: A4 portrait; margin: 8mm; }';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print CR80 ID - ${employee.fullName}</title>
          <style>
            ${pageRule}
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #ffffff;
            }
            .card-page {
              width: 54mm;
              height: 85.6mm;
              page-break-after: always;
              page-break-inside: avoid;
              overflow: hidden;
            }
            .a4-sheet {
              width: 190mm;
              margin: 0 auto;
              padding-top: 5mm;
            }
            .a4-header {
              border-bottom: 1.5px solid #0f172a;
              padding-bottom: 4mm;
              margin-bottom: 8mm;
            }
            .a4-header h2 {
              font-size: 14px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 0.5px;
            }
            .a4-header p {
              font-size: 10px;
              color: #475569;
              margin-top: 1.5mm;
            }
            .guide-tip {
              font-weight: 700;
              color: #0284c7 !important;
            }
            .cards-duo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10mm;
              margin: 8mm 0;
            }
            .cut-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .cut-label {
              font-size: 9px;
              font-weight: 900;
              color: #64748b;
              margin-bottom: 2mm;
              letter-spacing: 0.5px;
            }
            .card-boundary {
              border: 1px dashed #94a3b8;
              padding: 2mm;
              border-radius: 4.5mm;
              background: #f8fafc;
            }
            .fold-divider {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2mm;
              height: 85.6mm;
              justify-content: center;
            }
            .fold-line {
              width: 1px;
              flex: 1;
              border-left: 1.5px dashed #0284c7;
            }
            .fold-text {
              font-size: 8px;
              font-weight: 900;
              color: #0284c7;
              transform: rotate(-90deg);
              white-space: nowrap;
              letter-spacing: 1px;
            }
            .a4-footer {
              margin-top: 8mm;
              padding-top: 4mm;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
            .a4-footer strong {
              color: #0f172a;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    doc.close();

    // Trigger print after styles render
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      
      {/* MODAL CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* MODAL TOP HEADER */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  CR80 ID Card Printing & Production
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wider uppercase font-mono">
                  85.6 × 54 MM (CR80)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard ISO/IEC 7810 ID-1 specification for PVC card printers and laminating sheets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* 1. CONFIGURATION SELECTORS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* SIDES SELECTOR */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Card Faces to Print</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Select faces</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSides('both')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    sides === 'both'
                      ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {sides === 'both' && <Check className="w-3 h-3" />}
                    <span>Both Sides</span>
                  </div>
                  <span className="text-[9px] opacity-75 font-normal">Front + Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSides('front')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    sides === 'front'
                      ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {sides === 'front' && <Check className="w-3 h-3" />}
                    <span>Front Only</span>
                  </div>
                  <span className="text-[9px] opacity-75 font-normal">Identity Face</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSides('back')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    sides === 'back'
                      ? 'bg-blue-600 text-white shadow-md border border-blue-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {sides === 'back' && <Check className="w-3 h-3" />}
                    <span>Back Only</span>
                  </div>
                  <span className="text-[9px] opacity-75 font-normal">Barcode & Rules</span>
                </button>
              </div>
            </div>

            {/* PRINT TARGET TYPE SELECTOR */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-red-400" />
                  <span>Printer Output Format</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Output target</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrintLayout('cr80')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    printLayout === 'cr80'
                      ? 'bg-red-600 text-white shadow-md border border-red-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div className="font-black text-xs leading-tight">CR80 PVC Printer</div>
                    <div className="text-[9.5px] opacity-80 font-normal">Direct 54 × 85.6 mm card</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintLayout('a4')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    printLayout === 'a4'
                      ? 'bg-red-600 text-white shadow-md border border-red-400/50'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div className="font-black text-xs leading-tight">A4 / Letter Paper</div>
                    <div className="text-[9.5px] opacity-80 font-normal">1:1 scale with cut guides</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* 2. SPECIFICATION PILL BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 border border-slate-800/80 px-4 py-3 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-medium">
                Standard CR80 dimensions: <strong className="text-white">85.60 mm × 53.98 mm</strong> (3.370 × 2.125 in) • Radius: <strong className="text-white">3.18 mm</strong> (1/8 in)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold">
                RATIO: 54:85.6
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
                300 DPI READY
              </span>
            </div>
          </div>

          {/* 3. LIVE CR80 CARD PREVIEW */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-5 flex items-center gap-2">
              <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
              <span>CR80 Physical Dimension Preview (Scale Proportional)</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 w-full">
              {/* FRONT PREVIEW */}
              {(sides === 'both' || sides === 'front') && (
                <div className="flex flex-col items-center">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Front Face (54 × 85.6 mm)</span>
                  </div>
                  <div className="relative p-2 bg-slate-900/60 border border-dashed border-slate-700 rounded-[26px]">
                    <CR80PrintCard employee={employee} side="front" mode="screen" />
                    {/* Dimension markers */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                      Width: 54.0 mm
                    </div>
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 -rotate-90 bg-slate-800 text-slate-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                      85.6 mm
                    </div>
                  </div>
                </div>
              )}

              {/* BACK PREVIEW */}
              {(sides === 'both' || sides === 'back') && (
                <div className="flex flex-col items-center">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-300 mb-2 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Back Face (54 × 85.6 mm)</span>
                  </div>
                  <div className="relative p-2 bg-slate-900/60 border border-dashed border-slate-700 rounded-[26px]">
                    <CR80PrintCard employee={employee} side="back" mode="screen" />
                    {/* Dimension markers */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                      Width: 54.0 mm
                    </div>
                    <div className="absolute top-1/2 -right-3 -translate-y-1/2 rotate-90 bg-slate-800 text-slate-300 text-[9px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
                      85.6 mm
                    </div>
                  </div>
                </div>
              )}
            </div>

            {printLayout === 'a4' && (
              <div className="mt-5 text-center text-xs text-blue-300 bg-blue-950/40 border border-blue-800/40 px-4 py-2 rounded-xl">
                ✦ <strong>Paper Mode Active:</strong> Card will print at true 1:1 scale (54 × 85.6 mm) with cutting trim lines and center fold line on standard A4/Letter paper.
              </div>
            )}
          </div>

        </div>

        {/* MODAL BOTTOM ACTION BAR */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2">
            {exportMessage && (
              <div className="text-xs font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{exportMessage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Download 300 DPI */}
            <button
              type="button"
              onClick={() => handleDownload300DPI(sides)}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <Download className="w-4 h-4 text-emerald-400" />
              )}
              <span>Download 300 DPI PVC</span>
            </button>

            {/* Print Now */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-950/50 cursor-pointer active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print CR80 (85.6 × 54 mm)</span>
            </button>
          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* HIDDEN CONTAINERS FOR PRINT MARKUP & 300 DPI GENERATION        */}
      {/* ============================================================== */}
      
      {/* 1. Exact Physical Millimeter Components for Printing (54mm × 85.6mm) */}
      <div id="cr80-hidden-print-source" style={{ display: 'none' }}>
        <div id="print-source-front">
          <CR80PrintCard employee={employee} side="front" mode="print-mm" />
        </div>
        <div id="print-source-back">
          <CR80PrintCard employee={employee} side="back" mode="print-mm" />
        </div>
      </div>

      {/* 2. Exact 300 DPI Components (638px × 1011px) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={exportFrontRef}>
          <CR80PrintCard employee={employee} side="front" mode="export-300dpi" />
        </div>
        <div ref={exportBackRef}>
          <CR80PrintCard employee={employee} side="back" mode="export-300dpi" />
        </div>
      </div>

    </div>
  );
};
