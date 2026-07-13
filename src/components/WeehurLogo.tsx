import React from 'react';

interface WeehurLogoProps {
  className?: string;
  iconOnly?: boolean;
  light?: boolean;
}

export default function WeehurLogo({ className = 'h-10', iconOnly = false, light = false }: WeehurLogoProps) {
  const brandRed = '#D71920';
  const brandNavy = light ? '#FFFFFF' : '#0B1F3A';
  const brandGray = light ? '#E2E8F0' : '#4B5563';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`} id="weehur-logo-container">
      {/* SVG Emblem matching the geometric Weehur Construction logo */}
      <svg
        className="h-full w-auto"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        id="weehur-logo-svg"
      >
        {/* Top "W" shaped roof part with custom notches and slots */}
        <path
          d="M 5 50 L 5 30 L 20 23 L 20 38 A 4 4 0 0 0 28 38 L 28 20 L 50 10 L 72 20 L 72 38 A 4 4 0 0 0 80 38 L 80 23 L 95 30 L 95 50 L 54 50 L 54 28 A 4 4 0 0 0 46 28 L 46 50 L 5 50 Z"
          fill={brandRed}
        />
        {/* Bottom "H" shaped foundation/base part with rounded inner corners */}
        <path
          d="M 5 54 L 28 54 L 28 62 Q 28 66 32 66 L 68 66 Q 72 66 72 62 L 72 54 L 95 54 L 95 90 L 72 90 L 72 82 Q 72 78 68 78 L 32 78 Q 28 78 28 82 L 28 90 L 5 90 Z"
          fill={brandRed}
        />
      </svg>

      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none" id="weehur-logo-text-container">
          <span
            className="font-black tracking-wider text-xl font-sans"
            style={{ color: brandNavy }}
          >
            WEEHUR
          </span>
          <span
            className="text-[9px] font-bold tracking-[0.25em]"
            style={{ color: brandGray }}
          >
            CONSTRUCTION
          </span>
        </div>
      )}
    </div>
  );
}
