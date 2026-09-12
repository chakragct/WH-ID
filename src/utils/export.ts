import * as XLSX from 'xlsx';
import { Employee } from '../types';

/**
 * Exports a list of Employee profiles to an Excel (.xlsx) file, sorted by Assigned Sites.
 * Department column is removed as requested.
 * @param employees The array of Employee documents to export.
 */
export function exportEmployeesToCSV(employees: Employee[]): void {
  exportEmployeesToExcel(employees);
}

export function exportEmployeesToExcel(employees: Employee[]): void {
  // Sort staff list according to Site (Assigned Sites)
  const sortedEmployees = [...employees].sort((a, b) => {
    const siteA = (a.workSites || []).join(', ').toLowerCase();
    const siteB = (b.workSites || []).join(', ').toLowerCase();
    if (siteA !== siteB) {
      return siteA.localeCompare(siteB);
    }
    return a.fullName.localeCompare(b.fullName);
  });

  const exportData = sortedEmployees.map(emp => ({
    'Employee ID': emp.employeeId,
    'Full Name': emp.fullName,
    'Email Address': emp.email,
    'Mobile Number': emp.phone,
    'Designation': emp.designation,
    'Company': emp.company,
    'Assigned Sites': (emp.workSites || []).join(', '),
    'Status': emp.status,
    'Last Date of Work': emp.lastDateOfWork || '',
    'Date Joined': emp.dateJoined,
    'Date Joined to Site': emp.dateJoinedProject || '',
    'Role': emp.role,
    'Remarks': emp.remarks || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Set auto column widths
  const colWidths = [
    { wch: 15 }, // Employee ID
    { wch: 22 }, // Full Name
    { wch: 28 }, // Email Address
    { wch: 16 }, // Mobile Number
    { wch: 22 }, // Designation
    { wch: 24 }, // Company
    { wch: 25 }, // Assigned Sites
    { wch: 12 }, // Status
    { wch: 18 }, // Last Date of Work
    { wch: 14 }, // Date Joined
    { wch: 20 }, // Date Joined to Site
    { wch: 12 }, // Role
    { wch: 30 }, // Remarks
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Staff List");

  XLSX.writeFile(workbook, `WeeHur_Staff_List_${new Date().toISOString().split('T')[0]}.xlsx`);
}

