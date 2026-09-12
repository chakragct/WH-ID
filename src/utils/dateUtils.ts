/**
 * Date utility helpers to safely convert Excel date serial numbers, JS Date objects,
 * slash/dash date strings, and ISO strings into clean YYYY-MM-DD date format.
 */

export function formatDateValue(val: any): string {
  if (val === null || val === undefined || val === '' || val === 'N/A' || val === '-') {
    return '';
  }

  // Handle JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const str = String(val).trim();
  if (!str) return '';

  // Check if pure numeric Excel serial date (e.g. 41821 or 45810)
  const num = Number(str);
  if (!isNaN(num) && /^\d+(\.\d+)?$/.test(str) && num > 10000 && num < 100000) {
    // Excel base date offset (Dec 30, 1899)
    const utcDays = Math.floor(num - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const yyyy = dateObj.getUTCFullYear();
      const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY format e.g. 01/07/2014
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Handle YYYY/MM/DD or YYYY-MM-DD
  const yyyymmddMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yyyymmddMatch) {
    const [, y, m, d] = yyyymmddMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Parse ISO or standard date string
  const parsed = Date.parse(str);
  if (!isNaN(parsed) && !/^\d+$/.test(str)) {
    const d = new Date(parsed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return str;
}

export function displayFormattedDate(val: any, fallback: string = '-'): string {
  const formatted = formatDateValue(val);
  return formatted || fallback;
}
