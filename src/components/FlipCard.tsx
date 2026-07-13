import React, { useState, useEffect } from 'react';
import { RefreshCw, QrCode } from 'lucide-react';
import { generateQRCodeDataUrl } from '../lib/cardUtils';

interface FlipCardProps {
  photoUrl: string;
  fullName: string;
  qrValue: string;
}

export default function FlipCard({ photoUrl, fullName, qrValue }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    let active = true;
    async function loadQR() {
      const url = await generateQRCodeDataUrl(qrValue);
      if (active) {
        setQrCodeUrl(url);
      }
    }
    loadQR();
    return () => {
      active = false;
    };
  }, [qrValue]);

  return (
    <div className="flex flex-col items-center select-none" id="flip-card-wrapper">
      {/* 3D Flip Container */}
      <div
        className="relative w-64 h-64 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
        id="flip-card-click-zone"
      >
        <div
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          id="flip-card-inner"
        >
          {/* FRONT SIDE (Employee Photo) */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden flex items-center justify-center rounded-full border-[6px] border-[#D71920] shadow-xl overflow-hidden bg-white"
            id="flip-card-front"
          >
            <img
              src={photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80'}
              alt={fullName}
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80';
              }}
            />
            {/* Soft Overlay Label Hint */}
            <div className="absolute bottom-2 bg-black/60 text-white text-[10px] py-1 px-3 rounded-full flex items-center gap-1 backdrop-blur-sm">
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              <span>Tap to Flip</span>
            </div>
          </div>

          {/* BACK SIDE (QR Code) */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 flex items-center justify-center rounded-full border-[6px] border-[#0B1F3A] bg-white shadow-xl p-6"
            id="flip-card-back"
          >
            {qrCodeUrl ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center p-3">
                <img
                  src={qrCodeUrl}
                  alt="Employee ID QR Code"
                  className="w-4/5 h-4/5 object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <QrCode className="w-12 h-12 mb-2 animate-pulse" />
                <span className="text-xs font-semibold">Generating QR...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-label matching photo / QR state */}
      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className="mt-4 flex items-center gap-2 text-sm font-semibold transition-colors active:scale-95 duration-150"
        style={{ color: isFlipped ? '#D71920' : '#4B5563' }}
        id="flip-toggle-text-button"
      >
        <span>{isFlipped ? 'Tap Again' : 'Tap Photo'}</span>
        <span className="text-xs text-gray-500 font-normal">
          {isFlipped ? 'to show Photo' : 'to view QR Code'}
        </span>
      </button>
    </div>
  );
}
