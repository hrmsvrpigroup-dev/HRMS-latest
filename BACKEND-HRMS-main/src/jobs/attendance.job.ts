import { prisma } from '../config/database'
import { syncAttendanceToGoogleSheet } from '../services/googleSheets.service'

export const runAttendanceJob = async () => {
  console.log('[JOBS] Checking for auto clock-out shifts (> 10 hours)...')
  const now = new Date()
  const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000)

  try {
    // Find all attendance records where clockIn is more than 10 hours ago AND clockOut is null
    const recordsToClockOut = await prisma.attendance.findMany({
      where: {
        clockIn: {
          lt: tenHoursAgo,
        },
        clockOut: null,
      },
    })

    console.log(`[JOBS] Found ${recordsToClockOut.length} records that exceed 10 hours limit.`)

    for (const record of recordsToClockOut) {
      if (record.clockIn) {
        const autoClockOutTime = new Date(new Date(record.clockIn).getTime() + 10 * 60 * 60 * 1000)
        
        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            clockOut: autoClockOutTime,
            totalHours: 10.00, // Exactly 10 hours
          },
        })
        console.log(`[JOBS] Auto clocked-out record ID: ${record.id} for employee ID: ${record.employeeId}`)

        // Sync auto clock-out to Google Sheet
        await syncAttendanceToGoogleSheet(record.id).catch((err) => {
          console.error(`[GOOGLE_SHEETS_SYNC_ERROR] Auto clock-out sync failed for ${record.id}: ${err.message}`)
        })
      }
    }

    return {
      executedAt: now.toISOString(),
      status: 'success',
      autoClockedOutCount: recordsToClockOut.length,
    }
  } catch (error: any) {
    console.error('[JOBS] Auto clock-out job failed:', error)
    return {
      executedAt: now.toISOString(),
      status: 'failed',
      error: error.message,
    }
  }
}

