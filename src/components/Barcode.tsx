import React, { useMemo } from 'react';
import { generateBarcodeSVG } from '../utils/barcode';

interface BarcodeProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  textColor?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 36,
  showText = true,
  className = "w-full h-auto",
  barColor = "#0f172a",
  textColor = "#0f172a",
}) => {
  const barcodeData = useMemo(() => {
    return generateBarcodeSVG({
      value,
      height,
      showText,
      barColor,
      textColor
    });
  }, [value, height, showText, barColor, textColor]);

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox={barcodeData.viewBox}
        className="w-full h-full max-h-[44px]"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        {barcodeData.elements.map((el, index) => (
          <rect
            key={index}
            x={el.x}
            y={0}
            width={el.width}
            height={barcodeData.barHeight}
            fill={barColor}
          />
        ))}
        {showText && (
          <text
            x={barcodeData.totalWidth / 2}
            y={height}
            textAnchor="middle"
            fontFamily="monospace, Courier, sans-serif"
            fontSize="9.5"
            fontWeight="700"
            letterSpacing="2"
            fill={textColor}
          >
            {barcodeData.cleanValue.startsWith('*') ? barcodeData.cleanValue : `*${barcodeData.cleanValue}*`}
          </text>
        )}
      </svg>
    </div>
  );
};
