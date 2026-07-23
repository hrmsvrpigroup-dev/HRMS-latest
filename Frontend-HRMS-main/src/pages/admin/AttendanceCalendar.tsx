import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Users, UserCheck, UserX, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin.api'

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AdminAttendanceCalendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [summaryData, setSummaryData] = useState<Record<string, { activeCount: number; leaveCount: number }>>({})
  const [loading, setLoading] = useState(false)
  const today = new Date()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await adminApi.getAttendanceSummary(year, month)
        setSummaryData(data)
      } catch (err) {
        console.error('Failed to fetch attendance summary', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, month])

  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const prevMonthDays = new Date(year, month - 1, 0).getDate()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i)

  const handleDateClick = (day: number) => setSelectedDate(new Date(year, month - 1, day))

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const selectedDayData = summaryData[selectedDateStr] || { activeCount: 0, leaveCount: 0 }
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
  const isSelected = (day: number) => selectedDate.getDate() === day && selectedDate.getMonth() === month - 1 && selectedDate.getFullYear() === year

  // Get day dots for calendar (which days have attendance data)
  const getDayDot = (day: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const d = summaryData[key]
    if (!d) return null
    if (d.activeCount > 0) return '#22c55e'
    if (d.leaveCount > 0) return '#a855f7'
    return null
  }

  const selectedDayLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .hr-cal * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .hr-cal { background: #f1f5f9; min-height: 100vh; padding: 32px; }

        .hr-cal-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%);
          border-radius: 24px;
          padding: 36px 40px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .hr-cal-hero::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 300px; height: 300px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .hr-cal-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 30%;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .hr-cal-hero-left { position: relative; z-index: 1; }
        .hr-cal-hero-title {
          font-size: 32px; font-weight: 900; color: #fff; letter-spacing: -0.5px;
          margin: 0 0 6px;
        }
        .hr-cal-hero-subtitle { color: rgba(255,255,255,0.65); font-size: 15px; font-weight: 500; }

        .hr-cal-hero-nav {
          display: flex; align-items: center; gap: 16px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          padding: 12px 20px;
          position: relative; z-index: 1;
        }
        .hr-cal-nav-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }
        .hr-cal-nav-btn:hover { background: rgba(255,255,255,0.2); }
        .hr-cal-month-label { font-size: 18px; font-weight: 800; color: #fff; min-width: 140px; text-align: center; }

        .hr-cal-body {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }

        /* Calendar Card */
        .hr-cal-card {
          background: #fff;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          border: 1px solid #e8ecf4;
        }

        .hr-cal-grid-header {
          display: grid; grid-template-columns: repeat(7,1fr);
          margin-bottom: 12px;
        }
        .hr-cal-dow {
          text-align: center;
          font-size: 11px; font-weight: 800;
          color: #94a3b8; letter-spacing: 0.06em;
          padding: 8px 0;
        }
        .hr-cal-dow.weekend { color: #c4b5fd; }

        .hr-cal-grid-body {
          display: grid; grid-template-columns: repeat(7,1fr);
          row-gap: 4px;
        }

        .hr-day-cell {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          height: 52px; position: relative;
        }

        .hr-day-btn {
          width: 40px; height: 40px; border-radius: 12px;
          border: none; background: transparent;
          font-size: 14px; font-weight: 600;
          cursor: pointer; position: relative;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
          color: #0f172a;
        }
        .hr-day-btn:hover:not(.hr-day-selected):not(.hr-day-today) {
          background: #f1f5f9;
        }
        .hr-day-today {
          background: #e0e7ff;
          color: #4338ca;
          font-weight: 800;
        }
        .hr-day-selected {
          background: linear-gradient(135deg, #7c3aed, #6366f1) !important;
          color: #fff !important;
          box-shadow: 0 8px 24px -4px rgba(124,58,237,0.55);
          transform: scale(1.08);
          font-weight: 800;
        }
        .hr-day-empty {
          color: #d1d5db; font-size: 13px; font-weight: 500;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
        }
        .hr-day-dot {
          width: 5px; height: 5px; border-radius: 50%;
        }

        /* Side Panel */
        .hr-cal-side { display: flex; flex-direction: column; gap: 16px; }

        .hr-cal-date-card {
          background: linear-gradient(135deg, #312e81, #4338ca);
          border-radius: 20px;
          padding: 24px;
          color: #fff;
          box-shadow: 0 8px 32px rgba(67,56,202,0.3);
        }
        .hr-cal-date-day { font-size: 48px; font-weight: 900; line-height: 1; }
        .hr-cal-date-month { font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.7); margin-top: 4px; }
        .hr-cal-date-weekday { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

        .hr-stat-card {
          background: #fff;
          border-radius: 16px;
          padding: 18px 20px;
          border: 1px solid #e8ecf4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex; align-items: center; gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .hr-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          border-color: #c7d2fe;
        }
        .hr-stat-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .hr-stat-info { flex: 1; }
        .hr-stat-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .hr-stat-value { font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1.1; margin-top: 2px; }
        .hr-stat-arrow { color: #94a3b8; font-size: 18px; }

        .hr-cal-legend {
          background: #fff; border-radius: 16px; padding: 18px 20px;
          border: 1px solid #e8ecf4;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .hr-cal-legend-title { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
        .hr-cal-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .hr-cal-legend-dot { width: 10px; height: 10px; border-radius: 3px; }

        .hr-cal-loading { opacity: 0.5; pointer-events: none; }
      `}</style>

      <div className="hr-cal">
        {/* Hero Header */}
        <div className="hr-cal-hero">
          <div className="hr-cal-hero-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px', borderRadius: 12 }}>
                <CalendarDays size={22} color="#c7d2fe" />
              </div>
              <span style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Attendance Calendar
              </span>
            </div>
            <div className="hr-cal-hero-title">{MONTH_NAMES[currentDate.getMonth()]} {year}</div>
            <div className="hr-cal-hero-subtitle">Track and monitor your team's daily attendance</div>
          </div>

          <div className="hr-cal-hero-nav">
            <button className="hr-cal-nav-btn" onClick={prevMonth}>
              <ChevronLeft size={18} />
            </button>
            <div className="hr-cal-month-label">
              {MONTH_NAMES[currentDate.getMonth()].slice(0, 3)} {year}
            </div>
            <button className="hr-cal-nav-btn" onClick={nextMonth}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Body: Calendar + Side Panel */}
        <div className="hr-cal-body">

          {/* Calendar Grid */}
          <div className={`hr-cal-card ${loading ? 'hr-cal-loading' : ''}`}>
            {/* Days of Week */}
            <div className="hr-cal-grid-header">
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} className={`hr-cal-dow ${i >= 5 ? 'weekend' : ''}`}>{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="hr-cal-grid-body">
              {blanks.map((_, i) => (
                <div key={`b-${i}`} className="hr-day-cell">
                  <div className="hr-day-empty">{prevMonthDays - blanks.length + i + 1}</div>
                </div>
              ))}

              {days.map(day => {
                const dot = getDayDot(day)
                const selected = isSelected(day)
                const todayDay = isToday(day)
                return (
                  <div key={day} className="hr-day-cell">
                    <button
                      onClick={() => handleDateClick(day)}
                      className={`hr-day-btn ${selected ? 'hr-day-selected' : todayDay ? 'hr-day-today' : ''}`}
                    >
                      <span>{day}</span>
                      {dot && !selected && (
                        <span className="hr-day-dot" style={{ background: dot }} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'linear-gradient(135deg,#7c3aed,#6366f1)', display: 'inline-block' }} />
                Selected day
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#e0e7ff', display: 'inline-block' }} />
                Today
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Has attendance
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
                Has leaves
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="hr-cal-side">

            {/* Date Display Card */}
            <div className="hr-cal-date-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div className="hr-cal-date-weekday">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className="hr-cal-date-day">{selectedDate.getDate()}</div>
                  <div className="hr-cal-date-month">
                    {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 14 }}>
                  <CalendarDays size={28} color="rgba(255,255,255,0.9)" />
                </div>
              </div>

              {isToday(selectedDate.getDate()) && selectedDate.getMonth() === currentDate.getMonth() && (
                <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#c7d2fe' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  Today
                </div>
              )}
            </div>

            {/* Active Employees */}
            <div className="hr-stat-card" onClick={() => navigate(`/admin/attendance/details?date=${selectedDateStr}&type=active`)}>
              <div className="hr-stat-icon" style={{ background: '#dcfce7' }}>
                <UserCheck size={20} color="#16a34a" />
              </div>
              <div className="hr-stat-info">
                <div className="hr-stat-label">Active Employees</div>
                <div className="hr-stat-value" style={{ color: '#16a34a' }}>{selectedDayData.activeCount || 0}</div>
              </div>
              <div className="hr-stat-arrow">›</div>
            </div>

            {/* On Leave */}
            <div className="hr-stat-card" onClick={() => navigate(`/admin/attendance/details?date=${selectedDateStr}&type=leave`)}>
              <div className="hr-stat-icon" style={{ background: '#ede9fe' }}>
                <Users size={20} color="#7c3aed" />
              </div>
              <div className="hr-stat-info">
                <div className="hr-stat-label">On Leave</div>
                <div className="hr-stat-value" style={{ color: '#7c3aed' }}>{selectedDayData.leaveCount || 0}</div>
              </div>
              <div className="hr-stat-arrow">›</div>
            </div>

            {/* Inactive / Absent */}
            <div className="hr-stat-card" onClick={() => navigate(`/admin/attendance/details?date=${selectedDateStr}&type=inactive`)}>
              <div className="hr-stat-icon" style={{ background: '#fee2e2' }}>
                <UserX size={20} color="#dc2626" />
              </div>
              <div className="hr-stat-info">
                <div className="hr-stat-label">Inactive / Absent</div>
                <div className="hr-stat-value" style={{ color: '#dc2626' }}>—</div>
              </div>
              <div className="hr-stat-arrow">›</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
