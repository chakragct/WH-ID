import React from 'react';
import { 
  WEE_HUR_LOGO_DATA, 
  WEE_HUR_EMBLEM_DATA, 
  WEE_HUR_HORIZONTAL_DATA 
} from '../assets/logoData';

export interface WeeHurLogoProps {
  className?: string;
  variant?: 'stacked' | 'emblem' | 'horizontal';
  color?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Wee Hur Corporate Identity Logo Component
 * Exactly matches the official Wee Hur identity emblem and typography.
 * Supports:
 * - 'stacked': Official crest on top + bold 'WEE HUR' below (Matches attached brand spec)
 * - 'emblem': Red architectural crest alone
 * - 'horizontal': Horizontal lockup (crest + 'WEE HUR' to the right)
 */
export const WeeHurLogo: React.FC<WeeHurLogoProps> = ({ 
  className = "h-10 w-auto", 
  variant = "stacked",
  color,
  style,
  alt = "Wee Hur Logo"
}) => {
  let src = WEE_HUR_LOGO_DATA;
  let fallbackSrc = '/weehur-logo.png';

  if (variant === 'emblem') {
    src = WEE_HUR_EMBLEM_DATA;
    fallbackSrc = '/weehur-emblem.png';
  } else if (variant === 'horizontal') {
    src = WEE_HUR_HORIZONTAL_DATA;
    fallbackSrc = '/weehur-horizontal.png';
  }

  // Handle color override (e.g., if rendering in white on dark background)
  const isWhite = color === 'white' || color === '#ffffff' || color === '#fff';
  const combinedStyle: React.CSSProperties = {
    display: 'inline-block',
    objectFit: 'contain',
    ...(isWhite ? { filter: 'brightness(0) invert(1)' } : {}),
    ...style
  };

  return (
    <img
      src={src}
      onError={(e) => {
        // Fallback to public folder path if data URI encounters any issues
        const target = e.currentTarget;
        if (target.src !== fallbackSrc) {
          target.src = fallbackSrc;
        }
      }}
      alt={alt}
      className={className}
      style={combinedStyle}
      draggable={false}
      loading="eager"
    />
  );
};
