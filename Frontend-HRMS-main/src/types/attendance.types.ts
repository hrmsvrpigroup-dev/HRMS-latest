export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: string
  clockIn?: string
  clockOut?: string
}
