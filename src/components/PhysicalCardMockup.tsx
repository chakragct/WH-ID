import React, { useState } from 'react';
import { Phone, CheckCircle, HelpCircle, ShieldAlert } from 'lucide-react';
import { Employee } from '../types';
import WeehurLogo from './WeehurLogo';
import { getBarcodePattern } from '../lib/cardUtils';

interface PhysicalCardMockupProps {
  employee: Employee;
}

export default function PhysicalCardMockup({ employee }: PhysicalCardMockupProps) {
  const [showBack, setShowBack] = useState(false);

  // Generate simple barcode vector lines from employeeId
  const barcodePattern = getBarcodePattern(employee.employeeId);

  return (
    <div className="flex flex-col items-center py-6 select-none" id="physical-card-container">
      {/* Perspective Wrapper */}
      <div className="relative w-80 h-[480px] perspective-1000" id="card-dimension-wrapper">
        <div
          className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
            showBack ? 'rotate-y-180' : ''
          }`}
          id="physical-card-inner-rotator"
        >
          {/* PHYSICAL CARD FRONT */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col justify-between overflow-hidden"
            style={{ fontFamily: 'sans-serif' }}
            id="physical-front-card"
          >
            {/* If resigned/invalid, show visual watermark overlay */}
            {employee.activeStatus === false && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-950/10" id="resigned-front-overlay">
                <div className="absolute transform -rotate-12 bg-red-600/95 text-white font-black text-sm px-6 py-2.5 shadow-xl border-2 border-white tracking-widest uppercase rounded-lg animate-pulse">
                  INVALID / RESIGNED
                </div>
              </div>
            )}

            {/* Lanyard Clip Header Block */}
            <div className="absolute top-0 inset-x-0 h-4 flex justify-center z-20" id="lanyard-mount-point">
              <div className="w-12 h-3 bg-gray-300 rounded-b-md shadow-inner border border-gray-400" />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col items-center pt-8 px-6 text-center h-full justify-between pb-4">
              {/* Brand Logo Header */}
              <div className="mt-2" id="card-logo-header">
                <WeehurLogo className="h-8" />
              </div>

              {/* Circular Photo */}
              <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-red-500 shadow-md my-4" id="card-photo-box">
                <img
                  src={employee.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'}
                  alt={employee.fullName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Name and Designation */}
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase" id="card-fullname">
                  {employee.fullName}
                </h2>
                <p className="text-xs font-bold text-red-600 mt-0.5 tracking-wider uppercase" id="card-designation">
                  {employee.designation}
                </p>

                {/* Employee BAS ID moved below designation for ultimate visibility */}
                <div className="mt-3 flex flex-col items-center" id="card-bas-id-wrapper">
                  <span className="text-[10px] tracking-widest text-slate-500 font-extrabold uppercase">Employee BAS ID</span>
                  <span className="text-lg font-black text-[#0B1F3A] tracking-widest mt-0.5">{employee.employeeId}</span>
                </div>
              </div>

              {/* Decorative Red & Navy Wave exactly like mockup */}
              <div className="w-full relative h-28 mt-4 flex flex-col justify-end overflow-hidden" id="card-decorative-wave">
                {/* Curve SVG Background */}
                <svg className="absolute bottom-0 left-0 w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                  <path d="M0,50 Q75,100 150,50 T300,50 L300,120 L0,120 Z" fill="#0B1F3A" />
                  <path d="M0,70 Q75,120 150,70 T300,70 L300,120 L0,120 Z" fill="#D71920" opacity="0.85" />
                  <path d="M0,85 Q75,130 150,85 T300,85 L300,120 L0,120 Z" fill="#0B1F3A" />
                </svg>

                {/* Overlaid elements (Moved up) */}
                <div className="relative z-10 flex flex-col items-center pb-8 text-white">
                </div>
              </div>
            </div>
          </div>

          {/* PHYSICAL CARD BACK */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-white rounded-3xl border border-gray-200 shadow-2xl flex flex-col justify-between overflow-hidden"
            style={{ fontFamily: 'sans-serif' }}
            id="physical-back-card"
          >
            {/* If resigned/invalid, show visual watermark overlay */}
            {employee.activeStatus === false && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-950/10" id="resigned-back-overlay">
                <div className="absolute transform -rotate-12 bg-red-600/95 text-white font-black text-xs px-5 py-2 shadow-xl border-2 border-white tracking-widest uppercase rounded-lg">
                  INVALID / RESIGNED
                </div>
              </div>
            )}

            {/* Lanyard Clip Header Block */}
            <div className="absolute top-0 inset-x-0 h-4 flex justify-center z-20" id="lanyard-mount-point-back">
              <div className="w-12 h-3 bg-gray-300 rounded-b-md shadow-inner border border-gray-400" />
            </div>

            {/* Back Content */}
            <div className="flex flex-col items-center pt-8 px-6 text-center h-full justify-between pb-0">
              <div className="w-full mt-2" id="back-terms-section">
                <h3 className="text-red-600 font-extrabold text-sm uppercase tracking-wider mb-3 text-left border-b border-gray-100 pb-1">
                  TERMS & CONDITIONS
                </h3>
                <ul className="text-left text-[10px] text-gray-600 space-y-2 list-disc pl-3">
                  <li>This card is the property of Weehur Construction.</li>
                  <li>This card is valid only for authorized use.</li>
                  <li>If found, please return to the nearest office.</li>
                  <li>Misuse of this card may result in disciplinary action.</li>
                </ul>
              </div>

              {/* Logo in the center of back */}
              <div className="my-3 opacity-90 scale-95" id="back-mid-logo">
                <WeehurLogo className="h-8" />
              </div>

              {/* Emergency & Address Waves */}
              <div className="w-full flex flex-col" id="back-decorative-footer">
                {/* Emergency Block with Red bar */}
                <div className="bg-[#D71920] text-white py-2 px-4 text-center rounded-t-lg shadow-inner flex flex-col items-center">
                  <span className="text-[8px] tracking-widest text-red-100 font-semibold uppercase">IN CASE OF EMERGENCY</span>
                  <a href={`tel:${employee.emergencyContact}`} className="flex items-center gap-1.5 text-sm font-black tracking-wide hover:scale-105 transition-transform">
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>{employee.emergencyContact}</span>
                  </a>
                </div>

                {/* Navy Blue footer matching physical card */}
                <div className="bg-[#0B1F3A] text-white py-3 px-4 text-center flex flex-col items-center">
                  <span className="text-[9px] text-slate-300 font-mono tracking-wider">{employee.site}</span>
                  <a href="https://www.weehur.com.sg" target="_blank" rel="noreferrer" className="text-[10px] text-blue-300 hover:underline font-semibold mt-1">
                    www.weehur.com.sg
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Switch Button */}
      <button
        onClick={() => setShowBack(!showBack)}
        className="mt-5 px-6 py-2.5 bg-gradient-to-r from-[#0B1F3A] to-[#D71920] hover:from-[#1b3d6c] hover:to-[#eb2a32] text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 duration-150 flex items-center gap-2"
        id="mockup-flip-toggle"
      >
        <span>Flip to View {showBack ? 'Front Card' : 'Back Card'}</span>
      </button>
    </div>
  );
}
