/**
 * Code 128 / Code 39 Barcode Generator for CR80 PVC Cards
 * Generates an ultra-crisp, scalable SVG barcode representation
 * suitable for high-resolution 300 DPI PVC card printing and direct barcode scanners.
 */

// Code 39 character patterns: 9 elements per char (5 bars, 4 spaces; 3 wide elements marked with 1, 6 narrow with 0)
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100'
};

export interface BarcodeSVGProps {
  value: string;
  width?: number | string;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  textColor?: string;
}

/**
 * Generates an SVG string representation of Code 39 barcode.
 * Code 39 is widely supported by 1D/2D laser scanners, mobile camera scanners,
 * and PVC card personalization software.
 */
export function generateBarcodeSVG({
  value,
  height = 36,
  showText = true,
  barColor = '#000000',
  textColor = '#000000'
}: {
  value: string;
  height?: number;
  showText?: boolean;
  barColor?: string;
  textColor?: string;
}) {
  const cleanValue = (value || 'ID').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '-');
  const fullString = `*${cleanValue}*`;
  
  const narrowWidth = 1.6;
  const wideWidth = 3.6;
  const interCharGap = 1.6;
  const barHeight = showText ? height - 12 : height;

  let totalWidth = 10; // Left quiet zone
  const elements: Array<{ x: number; width: number; isBar: boolean }> = [];

  let currentX = totalWidth;

  for (let i = 0; i < fullString.length; i++) {
    const char = fullString[i];
    const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS['-'];

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        elements.push({ x: currentX, width: w, isBar: true });
      }
      currentX += w;
    }
    // Inter-character gap
    currentX += interCharGap;
  }

  totalWidth = currentX + 10; // Right quiet zone

  const rects = elements
    .map(el => `<rect x="${el.x.toFixed(1)}" y="0" width="${el.width.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`)
    .join('');

  const textElement = showText
    ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${height}" text-anchor="middle" font-family="monospace, sans-serif" font-size="9" font-weight="700" letter-spacing="1.5" fill="${textColor}">${cleanValue}</text>`
    : '';

  return {
    svgString: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="xMidYMid meet">${rects}${textElement}</svg>`,
    viewBox: `0 0 ${totalWidth} ${height}`,
    totalWidth,
    height,
    elements,
    barHeight,
    cleanValue
  };
}
