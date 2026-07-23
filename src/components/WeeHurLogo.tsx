import React from 'react';

interface WeeHurLogoProps {
  className?: string;
  color?: string;
}

export const WeeHurLogo: React.FC<WeeHurLogoProps> = ({ 
  className = "w-12 h-12", 
  color = "#E2231A" 
}) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 120 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top piece (W shape with center-bottom cutout and top notches) */}
      <path 
        d="M 5,52 L 55,52 L 55,28 L 65,28 L 65,52 L 115,52 L 115,30 L 95,15 L 95,32 L 85,32 L 85,20 L 60,5 L 35,20 L 35,32 L 25,32 L 25,15 L 5,30 Z" 
        fill={color} 
      />
      {/* Bottom piece (H shape) */}
      <path 
        d="M 5,58 L 25,58 L 25,68 L 95,68 L 95,58 L 115,58 L 115,95 L 95,95 L 95,80 L 25,80 L 25,95 L 5,95 Z" 
        fill={color} 
      />
    </svg>
  );
};
