import QRCode from 'qrcode';

/**
 * Generates a clean, modern base64 QR Code.
 * @param text The data text to encode in the QR code (e.g. employeeId or a verification link)
 * @returns A Promise resolving to the base64 Data URL.
 */
export async function generateEmployeeQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 256,
      color: {
        dark: '#0B1F3A', // Corporate deep blue
        light: '#FFFFFF', // High-contrast white background
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    // Return a fallback placeholder image
    return 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(text);
  }
}
