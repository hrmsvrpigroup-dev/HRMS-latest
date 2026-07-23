import React, { useState, useEffect } from 'react'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Moon, Info } from 'lucide-react'
import { attendanceApi, AttendanceItem } from '../../api/attendance.api'
import { employeeApi } from '../../api/employee.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

interface DayStatus {
  dayNum: number
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE' | 'WEEKEND' | 'NONE'
  checkIn?: string
  checkOut?: string
}

export default function MyAttendance() {
  const todayDate = new Date()
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth()) 
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [attendanceList, setAttendanceList] = useState<AttendanceItem[]>([])
  const [joiningDate, setJoiningDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [profileRes, attendanceRes] = await Promise.all([
          employeeApi.getProfile(),
          attendanceApi.list()
        ])
        setJoiningDate(profileRes.data.data?.joiningDate || null)
        setAttendanceList(attendanceRes.data.data || [])
      } catch (err) {
        console.error('Failed to load attendance logs', err)
        setError('Failed to fetch real-time clock logs.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Helper to construct calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const dateObj = new Date(isoString)
    if (isNaN(dateObj.getTime())) return ''
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const daysCount = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  const calendarCells: DayStatus[] = []

  // Add empty slots for days of prev month
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push({ dayNum: 0, status: 'NONE' })
  }

  const today = new Date()
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Populate actual days
  for (let d = 1; d <= daysCount; d++) {
    const cellDate = new Date(currentYear, currentMonth, d)
    const isFuture = cellDate > todayNoTime
    const isToday = cellDate.getTime() === todayNoTime.getTime()

    // Find if there's a match in our database list
    const match = attendanceList.find(item => {
      const dObj = new Date(item.date)
      return dObj.getFullYear() === currentYear &&
             dObj.getMonth() === currentMonth &&
             dObj.getDate() === d
    })

    if (match) {
      let status: DayStatus['status'] = 'NONE'
      if (match.status === 'PRESENT') status = 'PRESENT'
      else if (match.status === 'LATE') status = 'LATE'
      else if (match.status === 'ABSENT') status = 'ABSENT'
      else if (match.status === 'ON_LEAVE' || match.status === 'HALF_DAY') status = 'LEAVE'
      else if (match.status === 'HOLIDAY') status = 'WEEKEND'

      calendarCells.push({
        dayNum: d,
        status,
        checkIn: formatTime(match.clockIn),
        checkOut: formatTime(match.clockOut)
      })
    } else {
      const dayOfWeekIndex = (firstDay + d - 1) % 7
      const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6

      if (isFuture) {
        calendarCells.push({ dayNum: d, status: 'NONE' })
      } else if (isWeekend) {
        calendarCells.push({ dayNum: d, status: 'WEEKEND' })
      } else if (isToday) {
        calendarCells.push({ dayNum: d, status: 'NONE' })
      } else {
        // Past weekday without checkin record
        // Verify against joining date if available
        const isBeforeJoining = joiningDate && cellDate < new Date(joiningDate)
        if (isBeforeJoining) {
          calendarCells.push({ dayNum: d, status: 'NONE' })
        } else {
          calendarCells.push({ dayNum: d, status: 'ABSENT' })
        }
      }
    }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // Stats calculation
  const totalWorkdays = calendarCells.filter(c => c.dayNum > 0 && c.status !== 'WEEKEND' && c.status !== 'NONE').length
  const presents = calendarCells.filter(c => c.status === 'PRESENT').length
  const lates = calendarCells.filter(c => c.status === 'LATE').length
  const absents = calendarCells.filter(c => c.status === 'ABSENT').length
  const leaves = calendarCells.filter(c => c.status === 'LEAVE').length

  const onTimePercentage = totalWorkdays > 0 ? Math.round((presents / totalWorkdays) * 100) : 100

  if (loading) return <LoadingSpinner />

  return (
    <div className="attendance-calendar-page">
      <div className="calendar-header-section">
        <div className="header-title">
          <h1>My Attendance Calendar</h1>
          <p>Visually audit shift consistency, leaves, and arrivals on a calendar grid.</p>
        </div>
      </div>

      {/* Calendar Stats Grid */}
      <div className="stats-row">
        <div className="mini-stat">
          <span className="stat-num text-green">{presents}</span>
          <span className="stat-lbl">Present Days</span>
        </div>
        <div className="mini-stat">
          <span className="stat-num text-orange">{lates}</span>
          <span className="stat-lbl">Late Arrivals</span>
        </div>
        <div className="mini-stat">
          <span className="stat-num text-red">{absents}</span>
          <span className="stat-lbl">Unexcused Absences</span>
        </div>
        <div className="mini-stat">
          <span className="stat-num text-blue">{leaves}</span>
          <span className="stat-lbl">Leaves Taken</span>
        </div>
        <div className="mini-stat">
          <span className="stat-num text-purple">{onTimePercentage}%</span>
          <span className="stat-lbl">On-Time Rate</span>
        </div>
      </div>

      <div className="calendar-card">
        {/* Month Selector bar */}
        <div className="month-selector-bar">
          <button className="nav-arrow" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
          <div className="selected-date-label">
            <CalIcon size={20} className="text-blue-500" />
            <h2>{monthNames[currentMonth]} {currentYear}</h2>
          </div>
          <button className="nav-arrow" onClick={handleNextMonth}><ChevronRight size={20} /></button>
        </div>

        {/* Days labels */}
        <div className="days-label-grid">
          {daysOfWeek.map(d => <div key={d} className="day-label-item">{d}</div>)}
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {calendarCells.map((cell, idx) => {
            if (cell.status === 'NONE' || cell.dayNum === 0) {
              return <div key={`empty-${idx}`} className="calendar-cell empty"></div>
            }

            return (
              <div key={`day-${cell.dayNum}`} className={`calendar-cell day ${cell.status.toLowerCase()}`}>
                <span className="day-number">{cell.dayNum}</span>
                
                {cell.status === 'PRESENT' && (
                  <div className="day-info">
                    <span className="day-status-indicator green"></span>
                    <span className="cell-times">{cell.checkIn} - {cell.checkOut}</span>
                  </div>
                )}

                {cell.status === 'LATE' && (
                  <div className="day-info">
                    <span className="day-status-indicator orange"></span>
                    <span className="cell-times">{cell.checkIn} - {cell.checkOut}</span>
                    <span className="late-badge">LATE</span>
                  </div>
                )}

                {cell.status === 'ABSENT' && (
                  <div className="day-info">
                    <span className="day-status-indicator red"></span>
                    <span className="cell-times">NO SHOW</span>
                  </div>
                )}

                {cell.status === 'LEAVE' && (
                  <div className="day-info">
                    <span className="day-status-indicator blue"></span>
                    <span className="cell-times">ON LEAVE</span>
                  </div>
                )}

                {cell.status === 'WEEKEND' && (
                  <div className="day-info weekend">
                    <span className="weekend-label">WEEKEND</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="calendar-info-alert">
        <Info size={16} />
        <span>Click on any day in the calendar to view additional clock logs or request regularization for punches.</span>
      </div>

      <style>{`
        .attendance-calendar-page {
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .calendar-header-section { margin-bottom: 24px; }
        .calendar-header-section h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .calendar-header-section p { color: #64748b; font-size: 0.9rem; margin: 0; }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .mini-stat {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.01);
        }

        .stat-num { font-size: 1.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 4px; }
        .stat-lbl { font-size: 0.72rem; font-weight: 600; color: #64748b; text-transform: uppercase; }

        .text-green { color: #22c55e; }
        .text-orange { color: #f97316; }
        .text-red { color: #ef4444; }
        .text-blue { color: #3b82f6; }
        .text-purple { color: #8b5cf6; }

        .calendar-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          margin-bottom: 24px;
        }

        .month-selector-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
        }

        .nav-arrow {
          background: none; border: 1px solid #e2e8f0; color: #64748b; cursor: pointer;
          width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .nav-arrow:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }

        .selected-date-label { display: flex; align-items: center; gap: 10px; }
        .selected-date-label h2 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; }

        .days-label-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
          margin-bottom: 12px;
          text-align: center;
        }

        .day-label-item {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 12px;
        }

        .calendar-cell {
          height: 100px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: all 0.2s;
        }

        .calendar-cell.day {
          background: #ffffff;
          cursor: pointer;
        }

        .calendar-cell.day:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          transform: translateY(-1px);
        }

        .calendar-cell.empty {
          background: #f8fafc;
          border-color: transparent;
          border-style: dashed;
        }

        .day-number {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          align-self: flex-start;
        }

        .day-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .day-status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          position: absolute;
          top: 14px; right: 14px;
        }

        .day-status-indicator.green { background: #22c55e; }
        .day-status-indicator.orange { background: #f97316; }
        .day-status-indicator.red { background: #ef4444; }
        .day-status-indicator.blue { background: #3b82f6; }

        .cell-times {
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          font-family: monospace;
        }

        .late-badge {
          font-size: 0.58rem;
          font-weight: 800;
          background: #fff7ed;
          color: #c2410c;
          padding: 1px 4px;
          border-radius: 3px;
          align-self: flex-start;
          border: 1px solid #ffd8a8;
        }

        .weekend { text-align: center; justify-content: center; }
        .weekend-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }

        /* Cell variations */
        .calendar-cell.day.present { background: #f0fdf4; border-color: #bbf7d0; }
        .calendar-cell.day.late { background: #fff7ed; border-color: #fed7aa; }
        .calendar-cell.day.absent { background: #fef2f2; border-color: #fecaca; }
        .calendar-cell.day.leave { background: #eff6ff; border-color: #bfdbfe; }
        .calendar-cell.day.weekend { background: #f8fafc; border-color: #e2e8f0; }

        .calendar-cell.day.present:hover { border-color: #86efac; }
        .calendar-cell.day.late:hover { border-color: #fdba74; }
        .calendar-cell.day.absent:hover { border-color: #fca5a5; }

        .calendar-info-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #f1f5f9;
          border-radius: 8px;
          color: #475569;
          font-size: 0.8rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
