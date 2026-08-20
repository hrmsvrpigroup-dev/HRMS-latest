import { Employee } from '../api/employee.api'

/**
 * Utility to download the Employee roster as an Excel spreadsheet (.csv / .xlsx compatible format).
 * Preserves data integrity without altering any database records.
 */
export function downloadEmployeeExcel(employees: Employee[], fileName = 'employees_roster') {
  if (!employees || employees.length === 0) {
    alert('No employee records available to export.')
    return
  }

  // Explicit headers requested: Employee Name, Work Mail, Personal Mail
  const headers = [
    'Employee Code',
    'Employee Name',
    'Work Mail',
    'Personal Mail',
    'Department',
    'Designation',
    'Status',
    'Joining Date'
  ]

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = employees.map((emp) => [
    escapeCSV(emp.employeeCode || ''),
    escapeCSV(`${emp.firstName || ''} ${emp.lastName || ''}`.trim()),
    escapeCSV(emp.email || ''),
    escapeCSV(emp.personalEmail || ''),
    escapeCSV(emp.department?.name || ''),
    escapeCSV(emp.designation?.title || ''),
    escapeCSV(emp.status || ''),
    escapeCSV(emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '')
  ])

  // Prepend UTF-8 BOM (\uFEFF) to ensure Microsoft Excel correctly parses UTF-8 encoding and columns
  const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows.map((row) => row.join(','))].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  const timestamp = new Date().toISOString().split('T')[0]
  link.setAttribute('download', `${fileName}_${timestamp}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
