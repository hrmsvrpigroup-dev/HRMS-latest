import { google } from 'googleapis'
import { prisma } from '../config/database'

/**
 * Synchronizes attendance details to Google Sheets.
 * Tab Name = Shift Date (e.g. YYYY-MM-DD)
 * Header Columns:
 * Code | Employee Name | Shift Date | Clock In | Clock Out | Total Hours | Active Hours | Idle Time | Status | Continue | Actions
 */
export async function syncAttendanceToGoogleSheet(attendanceId: string): Promise<void> {
  try {
    const record = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        employee: true,
      },
    })

    if (!record || !record.employee) {
      console.warn(`[GOOGLE_SHEET_SYNC] Attendance record or employee not found for ID: ${attendanceId}`)
      return
    }

    const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL
    const spreadsheetId = process.env.GOOGLE_SHEET_ID
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    let privateKey = process.env.GOOGLE_PRIVATE_KEY

    // Derive date string for sheet tab name (e.g. "2026-08-20")
    const shiftDateObj = record.date ? new Date(record.date) : new Date()
    const shiftDateTabName = shiftDateObj.toISOString().split('T')[0]

    // Formatted details
    const code = record.employee.employeeCode || 'N/A'
    const empName = `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim()
    const shiftDateFormatted = shiftDateObj.toLocaleDateString('en-US')
    const clockInStr = record.clockIn ? new Date(record.clockIn).toLocaleTimeString('en-US') : '--'
    const clockOutStr = record.clockOut ? new Date(record.clockOut).toLocaleTimeString('en-US') : '--'
    const totalHoursStr = record.totalHours != null ? `${record.totalHours} hrs` : '--'

    // Compute Active Hours
    let activeHrsVal: number | null = null
    if (record.totalHours != null) {
      activeHrsVal = Math.max(0, record.totalHours - (record.idleMinutes / 60))
    } else if (record.clockIn && !record.clockOut) {
      const diffMs = new Date().getTime() - new Date(record.clockIn).getTime()
      const elapsedHrs = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
      activeHrsVal = Math.max(0, elapsedHrs - (record.idleMinutes / 60))
    }
    const activeHoursStr = activeHrsVal != null ? `${activeHrsVal.toFixed(2)} hrs` : '--'

    const idleTimeStr = record.idleMinutes > 0 ? `${record.idleMinutes} min` : '--'
    const statusStr = record.status || 'PRESENT'
    const continueStr = record.clockOut ? '--' : (record.clockIn ? 'In Progress' : '--')
    const actionsStr = record.clockIn ? 'ACTIVE' : '--'

    const rowData = [
      code,
      empName,
      shiftDateFormatted,
      clockInStr,
      clockOutStr,
      totalHoursStr,
      activeHoursStr,
      idleTimeStr,
      statusStr,
      continueStr,
      actionsStr,
    ]

    // 1. Google Apps Script Webhook Sync (if GOOGLE_SHEET_WEBHOOK_URL is provided)
    if (webhookUrl && webhookUrl.trim().length > 0) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upsert_attendance',
            tabName: shiftDateTabName,
            employeeCode: code,
            row: rowData,
          }),
        })
        console.log(`[GOOGLE_SHEET_WEBHOOK] Synced employee ${code} for tab ${shiftDateTabName}, status: ${response.status}`)
      } catch (webhookErr: any) {
        console.error(`[GOOGLE_SHEET_WEBHOOK_ERROR] ${webhookErr.message}`)
      }
    }

    // 2. Google Sheets API Service Account Sync (if GOOGLE_SHEET_ID, EMAIL, and KEY are provided)
    if (spreadsheetId && clientEmail && privateKey) {
      try {
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n')
        }

        const auth = new google.auth.JWT(
          clientEmail,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/spreadsheets']
        )

        const sheets = google.sheets({ version: 'v4', auth })

        // Check existing tabs
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
        const existingSheets = spreadsheet.data.sheets || []
        const sheetExists = existingSheets.some(
          (s: any) => s.properties?.title === shiftDateTabName
        )

        const headers = [
          'Code',
          'Employee Name',
          'Shift Date',
          'Clock In',
          'Clock Out',
          'Total Hours',
          'Active Hours',
          'Idle Time',
          'Status',
          'Continue',
          'Actions',
        ]

        // Automatically create tab for today's date if it does not exist yet
        if (!sheetExists) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: shiftDateTabName,
                    },
                  },
                },
              ],
            },
          })

          // Add Header Row
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${shiftDateTabName}'!A1:K1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [headers],
            },
          })
          console.log(`[GOOGLE_SHEET_SYNC] Created tab '${shiftDateTabName}' with headers.`)
        }

        // Fetch existing rows in tab to check if employee row already exists
        const readRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `'${shiftDateTabName}'!A:K`,
        })

        const rows = readRes.data.values || []
        let existingRowIndex = -1

        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === code) {
            existingRowIndex = i + 1 // 1-indexed row number
            break
          }
        }

        if (existingRowIndex > 0) {
          // Update existing row
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${shiftDateTabName}'!A${existingRowIndex}:K${existingRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [rowData],
            },
          })
          console.log(`[GOOGLE_SHEET_SYNC] Updated employee ${code} row ${existingRowIndex} in tab '${shiftDateTabName}'.`)
        } else {
          // Append new row
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${shiftDateTabName}'!A:K`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
              values: [rowData],
            },
          })
          console.log(`[GOOGLE_SHEET_SYNC] Appended employee ${code} to tab '${shiftDateTabName}'.`)
        }
      } catch (apiErr: any) {
        console.error(`[GOOGLE_SHEETS_API_ERROR] ${apiErr.message}`)
      }
    }
  } catch (error: any) {
    console.error(`[GOOGLE_SHEETS_SYNC_GLOBAL_ERROR] ${error.message}`)
  }
}
