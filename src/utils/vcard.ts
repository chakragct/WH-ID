import { Employee } from '../types';

export function buildVCardString(employee: Employee): string {
  const fullName = (employee.fullName || '').trim();
  const nameParts = fullName.split(/\s+/);
  
  let lastName = '';
  let firstName = '';
  
  if (nameParts.length > 1) {
    lastName = nameParts[nameParts.length - 1];
    firstName = nameParts.slice(0, nameParts.length - 1).join(' ');
  } else {
    firstName = fullName;
    lastName = '';
  }

  const company = (employee.company || 'Wee Hur Construction Pte Ltd').trim();
  const title = (employee.designation || '').trim();
  const phone = (employee.phone || '').trim();
  const email = (employee.email || '').trim();
  const sites = employee.workSites && employee.workSites.length > 0 ? employee.workSites.join(', ') : '';
  const noteParts = [`Staff ID: ${employee.employeeId || 'N/A'}`];
  if (sites) noteParts.push(`Assigned Sites: ${sites}`);
  if (employee.status) noteParts.push(`Status: ${employee.status}`);
  const note = noteParts.join(' | ');

  const vCardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName}`,
    `N:${lastName};${firstName};;;`,
    `ORG:${company}`,
    `TITLE:${title}`,
    'ADR;TYPE=WORK:;;39 Kim Keat Rd;Singapore;;328814;Singapore',
  ];

  if (phone) {
    // Sanitize and format phone number
    vCardLines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
  }

  if (email) {
    vCardLines.push(`EMAIL;TYPE=INTERNET,WORK:${email}`);
  }

  if (note) {
    vCardLines.push(`NOTE:${note}`);
  }

  vCardLines.push('END:VCARD');

  return vCardLines.join('\r\n');
}

export function downloadVCardFile(employee: Employee): void {
  const vcardText = buildVCardString(employee);
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (employee.fullName || 'Contact').replace(/[^a-zA-Z0-9]/g, '_');
  link.href = url;
  link.download = `${safeName}_vCard.vcf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
