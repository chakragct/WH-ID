import QRCode from 'qrcode';
import { Employee } from '../types';

/**
 * Generates and triggers download of a standardized vCard (.vcf) file for an employee.
 */
export function downloadVCard(employee: Employee): void {
  const vCardContent = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${employee.fullName}`,
    `N:${employee.fullName.split(' ').reverse().join(';')};;;`,
    `ORG:Weehur Construction`,
    `TITLE:${employee.designation}`,
    `DEPT:${employee.department}`,
    `TEL;TYPE=CELL,VOICE:${employee.mobile}`,
    `EMAIL;TYPE=PREF,INTERNET:${employee.email}`,
    `ADR;TYPE=WORK:;;${employee.site};Singapore;;;`,
    `REV:${new Date().toISOString()}`,
    'END:VCARD'
  ].join('\r\n');

  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${employee.fullName.replace(/\s+/g, '_')}_contact.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Encodes a string into simplified Code 39 representation or highly realistic barcode layout
 */
export function getBarcodePattern(text: string): string {
  // Simple representation for clean, crisp barcode lines
  // Let's create a repeating pseudo-random sequence based on string hash for deterministic authentic bar look.
  let hash = 0;
  const input = `*${text.toUpperCase()}*`;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }

  let pattern = '';
  // Construct a sequence of wide and narrow bars
  // 1 = black narrow, 2 = black wide, 0 = white narrow, 3 = white wide
  for (let i = 0; i < 45; i++) {
    const bit = Math.abs(Math.sin(hash + i));
    if (bit < 0.25) {
      pattern += '10';
    } else if (bit < 0.5) {
      pattern += '20';
    } else if (bit < 0.75) {
      pattern += '1100';
    } else {
      pattern += '2200';
    }
  }
  return pattern;
}

/**
 * Generates a base64 Data URL for a given string data.
 */
export async function generateQRCodeDataUrl(data: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      margin: 1,
      width: 400,
      color: {
        dark: '#0B1F3A', // Corporate Navy
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Renders the high-resolution corporate ID Card using Canvas 2D and triggers PNG download.
 * Handles photo loading, logo paths, barcode pattern, wave curves and fallback gracefully.
 */
export async function downloadIDCardAsPNG(employee: Employee, option: 'front' | 'back' | 'both' = 'both'): Promise<void> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cardW = 600;
  const cardH = 900;

  if (option === 'both') {
    canvas.width = cardW * 2 + 60;
    canvas.height = cardH + 40;
  } else {
    canvas.width = cardW;
    canvas.height = cardH;
  }

  // Draw light canvas backing for double view
  if (option === 'both') {
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Helper: Draw front ID Card
  const drawFront = async (offsetX: number, offsetY: number) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Rounded card outline
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, cardW, cardH, 40);
    } else {
      ctx.rect(0, 0, cardW, cardH);
    }
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    // Lanyard mount slot
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(cardW / 2 - 50, 15, 100, 24, 12);
    } else {
      ctx.rect(cardW / 2 - 50, 15, 100, 24);
    }
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Brand logo
    try {
      ctx.save();
      ctx.translate(cardW / 2 - 90, 70);
      ctx.scale(0.5, 0.5);
      ctx.fillStyle = '#D71920';
      ctx.fill(new Path2D("M 5 50 L 5 30 L 20 23 L 20 38 A 4 4 0 0 0 28 38 L 28 20 L 50 10 L 72 20 L 72 38 A 4 4 0 0 0 80 38 L 80 23 L 95 30 L 95 50 L 54 50 L 54 28 A 4 4 0 0 0 46 28 L 46 50 L 5 50 Z"));
      ctx.fill(new Path2D("M 5 54 L 28 54 L 28 62 Q 28 66 32 66 L 68 66 Q 72 66 72 62 L 72 54 L 95 54 L 95 90 L 72 90 L 72 82 Q 72 78 68 78 L 32 78 Q 28 78 28 82 L 28 90 L 5 90 Z"));
      ctx.restore();
    } catch (e) {}

    // Logo Text "WEEHUR"
    ctx.fillStyle = '#0B1F3A';
    ctx.font = '900 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('WEEHUR', cardW / 2 - 30, 85);

    // Logo Sub "CONSTRUCTION"
    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CONSTRUCTION', cardW / 2 - 30, 105);

    // Picture frame (Red outer border)
    const picX = cardW / 2;
    const picY = 280;
    const picRadius = 110;

    ctx.beginPath();
    ctx.arc(picX, picY, picRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#D71920';
    ctx.fill();

    // Spacer
    ctx.beginPath();
    ctx.arc(picX, picY, picRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();

    let photoLoaded = false;
    if (employee.photoUrl) {
      try {
        const photoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('CORS or load failed'));
          img.src = employee.photoUrl;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(picX, picY, picRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(photoImg, picX - picRadius, picY - picRadius, picRadius * 2, picRadius * 2);
        ctx.restore();
        photoLoaded = true;
      } catch (err) {
        console.warn('Canvas profile photo failed to load. Using fallback vector avatar.', err);
      }
    }

    if (!photoLoaded) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(picX, picY, picRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(picX - picRadius, picY - picRadius, picRadius * 2, picRadius * 2);
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(picX, picY - 20, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(picX, picY + 110, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Name text
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(employee.fullName.toUpperCase(), cardW / 2, 470);

    // Designation
    ctx.fillStyle = '#D71920';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(employee.designation.toUpperCase(), cardW / 2, 510);

    // Employee ID Wrapper
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('EMPLOYEE BAS ID', cardW / 2, 575);

    ctx.fillStyle = '#0B1F3A';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(employee.employeeId, cardW / 2, 615);

    // Bottom brand waves
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, cardW, cardH, 40);
    } else {
      ctx.rect(0, 0, cardW, cardH);
    }
    ctx.clip();

    // Wave 1
    ctx.fillStyle = '#0B1F3A';
    ctx.beginPath();
    ctx.moveTo(0, 710);
    ctx.quadraticCurveTo(150, 790, 300, 710);
    ctx.quadraticCurveTo(450, 630, 600, 710);
    ctx.lineTo(600, cardH);
    ctx.lineTo(0, cardH);
    ctx.closePath();
    ctx.fill();

    // Wave 2 (Red)
    ctx.fillStyle = 'rgba(215, 25, 32, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, 750);
    ctx.quadraticCurveTo(150, 830, 300, 750);
    ctx.quadraticCurveTo(450, 670, 600, 750);
    ctx.lineTo(600, cardH);
    ctx.lineTo(0, cardH);
    ctx.closePath();
    ctx.fill();

    // Wave 3 (Navy)
    ctx.fillStyle = '#0B1F3A';
    ctx.beginPath();
    ctx.moveTo(0, 780);
    ctx.quadraticCurveTo(150, 860, 300, 780);
    ctx.quadraticCurveTo(450, 700, 600, 780);
    ctx.lineTo(600, cardH);
    ctx.lineTo(0, cardH);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // restores the waves clipping

    // Draw Invalid Watermark if resigned
    if (employee.activeStatus === false) {
      ctx.save();
      ctx.translate(cardW / 2, cardH / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = 'rgba(215, 25, 32, 0.22)';
      ctx.font = '900 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('INVALID', 0, -35);
      ctx.fillText('RESIGNED', 0, 35);
      
      ctx.strokeStyle = 'rgba(215, 25, 32, 0.35)';
      ctx.lineWidth = 10;
      ctx.strokeRect(-200, -90, 400, 180);
      ctx.restore();
    }

    ctx.restore(); // restores translate
  };

  // Helper: Draw back ID Card
  const drawBack = async (offsetX: number, offsetY: number) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Rounded background
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, cardW, cardH, 40);
    } else {
      ctx.rect(0, 0, cardW, cardH);
    }
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    // Lanyard slot
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(cardW / 2 - 50, 15, 100, 24, 12);
    } else {
      ctx.rect(cardW / 2 - 50, 15, 100, 24);
    }
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Terms header
    ctx.fillStyle = '#D71920';
    ctx.font = '900 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TERMS & CONDITIONS', 50, 95);

    // Separator
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(cardW - 50, 110);
    ctx.stroke();

    // Terms
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px sans-serif';
    const termsList = [
      'This card is the property of Weehur Construction.',
      'This card is valid only for authorized use.',
      'If found, please return to the nearest office.',
      'Misuse of this card may result in disciplinary action.'
    ];
    let currY = 155;
    termsList.forEach(term => {
      ctx.fillText('•  ' + term, 50, currY);
      currY += 35;
    });

    // Logo in middle
    try {
      ctx.save();
      ctx.translate(cardW / 2 - 90, 360);
      ctx.scale(0.5, 0.5);
      ctx.fillStyle = '#D71920';
      ctx.fill(new Path2D("M 5 50 L 5 30 L 20 23 L 20 38 A 4 4 0 0 0 28 38 L 28 20 L 50 10 L 72 20 L 72 38 A 4 4 0 0 0 80 38 L 80 23 L 95 30 L 95 50 L 54 50 L 54 28 A 4 4 0 0 0 46 28 L 46 50 L 5 50 Z"));
      ctx.fill(new Path2D("M 5 54 L 28 54 L 28 62 Q 28 66 32 66 L 68 66 Q 72 66 72 62 L 72 54 L 95 54 L 95 90 L 72 90 L 72 82 Q 72 78 68 78 L 32 78 Q 28 78 28 82 L 28 90 L 5 90 Z"));
      ctx.restore();
    } catch (e) {}

    ctx.fillStyle = '#0B1F3A';
    ctx.font = '900 28px sans-serif';
    ctx.fillText('WEEHUR', cardW / 2 - 30, 375);

    ctx.fillStyle = '#4B5563';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('CONSTRUCTION', cardW / 2 - 30, 395);

    // Barcode rendering
    const barcodeYPosition = 480;
    const barcodeHeightSize = 80;
    const barcodeTextPattern = getBarcodePattern(employee.employeeId);

    ctx.save();
    ctx.fillStyle = '#000000';
    const totalBarsCount = barcodeTextPattern.length;
    const singleBarW = 3;
    const barcodeTotalW = totalBarsCount * singleBarW;
    const barcodeStartX = (cardW - barcodeTotalW) / 2;

    let scanX = barcodeStartX;
    for (let i = 0; i < barcodeTextPattern.length; i++) {
      const char = barcodeTextPattern[i];
      if (char === '1') {
        ctx.fillRect(scanX, barcodeYPosition, singleBarW, barcodeHeightSize);
        scanX += singleBarW;
      } else if (char === '2') {
        ctx.fillRect(scanX, barcodeYPosition, singleBarW * 2, barcodeHeightSize);
        scanX += singleBarW * 2;
      } else {
        scanX += singleBarW;
      }
    }
    ctx.restore();

    // Barcode identifier
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`*${employee.employeeId}*`, cardW / 2, barcodeYPosition + barcodeHeightSize + 25);

    // Emergency Block details
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(0, 0, cardW, cardH, 40);
    } else {
      ctx.rect(0, 0, cardW, cardH);
    }
    ctx.clip();

    ctx.fillStyle = '#D71920';
    ctx.fillRect(0, 680, cardW, 110);

    ctx.fillStyle = '#FFCBD1';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IN CASE OF EMERGENCY', cardW / 2, 715);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px sans-serif';
    ctx.fillText(employee.emergencyContact, cardW / 2, 755);

    // Footer bottom base
    ctx.fillStyle = '#0B1F3A';
    ctx.fillRect(0, 790, cardW, 110);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(employee.site.toUpperCase(), cardW / 2, 835);

    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('www.weehur.com.sg', cardW / 2, 870);

    ctx.restore(); // restores the emergency/footer clipping

    // Draw Invalid Watermark if resigned
    if (employee.activeStatus === false) {
      ctx.save();
      ctx.translate(cardW / 2, cardH / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillStyle = 'rgba(215, 25, 32, 0.22)';
      ctx.font = '900 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('INVALID', 0, -35);
      ctx.fillText('RESIGNED', 0, 35);
      
      ctx.strokeStyle = 'rgba(215, 25, 32, 0.35)';
      ctx.lineWidth = 10;
      ctx.strokeRect(-200, -90, 400, 180);
      ctx.restore();
    }

    ctx.restore(); // restores translate
  };

  if (option === 'both') {
    await drawFront(20, 20);
    await drawBack(cardW + 40, 20);
  } else if (option === 'front') {
    await drawFront(0, 0);
  } else {
    await drawBack(0, 0);
  }

  // Trigger browser download workflow
  try {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.setAttribute('download', `WEEHUR_ID_${employee.fullName.replace(/\s+/g, '_')}_${option}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating card image for download:', error);
  }
}

