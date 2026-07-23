import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { attendanceApi, AttendanceItem } from '../../api/attendance.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

function getIdleBadge(idleMinutes: number) {
  if (idleMinutes <= 10) {
    return { label: `${idleMinutes} min`, bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
  } else if (idleMinutes <= 30) {
    return { label: `${idleMinutes} min`, bg: 'rgba(251,191,36,0.12)', color: '#f59e0b', border: '1px solid rgba(251,191,36,0.3)' }
  } else {
    return { label: `${idleMinutes} min`, bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
  }
}

function calcActiveHours(totalHours: number | undefined, idleMinutes: number) {
  if (!totalHours) return null
  return Math.max(0, totalHours - idleMinutes / 60).toFixed(2)
}

// ── Face Photo Thumbnail ──────────────────────────────────────────────────
function FaceThumb({ photo, name, onExpand }: { photo?: string; name: string; onExpand: () => void }) {
  if (!photo) {
    return (
      <div style={{
        width: '44px', height: '44px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: '#94a3b8', border: '2px solid #e2e8f0',
        flexShrink: 0,
      }} title="No face capture for this session">
        👤
      </div>
    )
  }
  return (
    <button
      onClick={onExpand}
      title={`View face capture of ${name}`}
      style={{
        padding: 0, border: 'none', background: 'none', cursor: 'pointer',
        position: 'relative', flexShrink: 0,
      }}
    >
      <img
        src={photo}
        alt={`Face capture – ${name}`}
        style={{
          width: '44px', height: '44px', borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #10b981',
          boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
          display: 'block',
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.5)'
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.2)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      />
      {/* Verified badge */}
      <span style={{
        position: 'absolute', bottom: '-2px', right: '-2px',
        background: '#10b981', borderRadius: '50%',
        width: '16px', height: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '9px', border: '2px solid white',
        lineHeight: 1,
      }}>✓</span>
    </button>
  )
}

// ── Face Detail Modal ─────────────────────────────────────────────────────
function FaceModal({ log, onClose }: { log: AttendanceItem; onClose: () => void }) {
  const name = `${log.employee?.firstName ?? ''} ${log.employee?.lastName ?? ''}`.trim()
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f172a, #1e293b)',
          borderRadius: '24px',
          padding: '2rem',
          maxWidth: '420px',
          width: '90%',
          border: '1px solid rgba(16,185,129,0.3)',
          boxShadow: '0 0 60px rgba(16,185,129,0.15), 0 25px 60px rgba(0,0,0,0.5)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', color: '#94a3b8', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 8px #10b981',
            animation: 'facePulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Face Verified at Clock-In
          </span>
        </div>

        {/* Photo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 0 30px rgba(16,185,129,0.35)',
          }}>
            <img
              src={log.clockInPhoto}
              alt={`Face capture – ${name}`}
              style={{
                width: '260px',
                height: '260px',
                objectFit: 'cover',
                borderRadius: '16px',
                display: 'block',
              }}
            />
          </div>
        </div>

        {/* Employee Info */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>EMPLOYEE</span>
            <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem' }}>{name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>CODE</span>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {log.employee?.employeeCode}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>SHIFT DATE</span>
            <span style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>CLOCK IN</span>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
              {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
            </span>
          </div>
        </div>

        <p style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
          🔒 Captured at the moment of facial clock-in. Click outside to close.
        </p>

        <style>{`
          @keyframes facePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Attendance() {
  const [logs, setLogs] = useState<AttendanceItem[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')

  // Face preview modal state
  const [previewLog, setPreviewLog] = useState<AttendanceItem | null>(null)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await attendanceApi.list()
      setLogs(res.data.data)
      setFilteredLogs(res.data.data)
    } catch {
      setError('Could not retrieve company attendance log sheets.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (id: string) => {
    if (!window.confirm('Are you sure you want to reset this attendance record? This will delete the entry and allow the employee to clock in again.')) return
    try {
      setLoading(true)
      await attendanceApi.reset(id)
      await fetchLogs()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset attendance')
      setLoading(false)
    }
  }

  const handleContinue = async (id: string) => {
    if (!window.confirm('Are you sure you want this employee to continue their shift? This will clear their clock-out record.')) return
    try {
      setLoading(true)
      await attendanceApi.continueShift(id)
      await fetchLogs()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resume shift')
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  useEffect(() => {
    let result = [...logs]
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.employee?.firstName.toLowerCase().includes(term) ||
        item.employee?.lastName.toLowerCase().includes(term) ||
        item.employee?.employeeCode.toLowerCase().includes(term)
      )
    }
    if (statusFilter !== 'ALL') result = result.filter(item => item.status === statusFilter)
    if (dateFilter) result = result.filter(item => item.date.startsWith(dateFilter))
    setFilteredLogs(result)
  }, [searchTerm, statusFilter, dateFilter, logs])

  const totalIdleToday = filteredLogs.reduce((s, l) => s + (l.idleMinutes ?? 0), 0)
  const totalActiveHrs = filteredLogs.reduce((s, l) => {
    if (!l.totalHours) return s
    return s + Math.max(0, l.totalHours - (l.idleMinutes ?? 0) / 60)
  }, 0)
  const faceVerifiedCount = filteredLogs.filter(l => !!l.clockInPhoto).length

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Face Preview Modal */}
      {previewLog && <FaceModal log={previewLog} onClose={() => setPreviewLog(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="page-header-title">
          <h1>Workforce Attendance Sheet</h1>
          <p>Supervise chronological clocking entries, shift duration tallies, and workforce active rosters.</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => window.print()}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '160px', padding: '1.2rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Records</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{filteredLogs.length}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '160px', padding: '1.2rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Hours</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{totalActiveHrs.toFixed(1)} hrs</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '160px', padding: '1.2rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Idle</div>
          <div style={{
            fontSize: '2rem', fontWeight: 800, marginTop: '0.2rem',
            color: totalIdleToday > 60 ? '#ef4444' : totalIdleToday > 20 ? '#f59e0b' : '#10b981'
          }}>
            {totalIdleToday} min
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '160px', padding: '1.2rem 1.5rem', borderLeft: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Face Verified</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🧑‍💼</span> {faceVerifiedCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card attendance-filters no-print" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search employee by name or code..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%' }}>
            <option value="ALL">All States</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>
        <button className="btn-secondary" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setDateFilter('') }} style={{ padding: '0.8rem 1rem' }}>
          Reset Filters
        </button>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>{error}</div>
      ) : (
        <div className="card table-container" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Face</th>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Shift Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Total Hours</th>
                <th style={{ color: '#10b981' }}>Active Hours</th>
                <th>Idle Time</th>
                <th>Status</th>
                <th className="no-print">Continue</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => {
                const idle = log.idleMinutes ?? 0
                const badge = getIdleBadge(idle)
                const activeHrs = calcActiveHours(log.totalHours, idle)
                const name = `${log.employee?.firstName ?? ''} ${log.employee?.lastName ?? ''}`.trim()
                return (
                  <tr key={log.id}>
                    {/* ── Face column ── */}
                    <td style={{ textAlign: 'center' }}>
                      <FaceThumb
                        photo={log.clockInPhoto}
                        name={name}
                        onExpand={() => setPreviewLog(log)}
                      />
                    </td>

                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                      {log.employee?.employeeCode || 'N/A'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{name}</td>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                      {log.clockIn ? new Date(log.clockIn).toLocaleTimeString() : '--'}
                    </td>
                    <td style={{ color: log.clockOut ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {log.clockOut ? new Date(log.clockOut).toLocaleTimeString() : '--'}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.totalHours ? `${log.totalHours} hrs` : '--'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      {activeHrs ? `✅ ${activeHrs} hrs` : '--'}
                    </td>
                    <td>
                      {idle > 0 ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem',
                          fontWeight: 700, background: badge.bg, color: badge.color, border: badge.border,
                        }}>
                          {idle > 30 ? '🔴' : idle > 10 ? '🟡' : '🟢'} {badge.label}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        ...(
                          log.status === 'PRESENT'
                            ? { background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }
                            : log.status === 'LATE'
                            ? { background: 'rgba(251, 191, 36, 0.12)', color: '#f59e0b', border: '1px solid rgba(251, 191, 36, 0.3)' }
                            : log.status === 'ON_LEAVE'
                            ? { background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }
                            : { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
                        )
                      }}>
                        {log.status || 'ABSENT'}
                      </span>
                    </td>
                    <td className="no-print">
                      {log.clockOut ? (
                        <button 
                          onClick={() => handleContinue(log.id)}
                          className="btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#10b981', borderColor: '#10b981', background: 'transparent' }}
                          title="Continue Shift"
                        >
                          Continue
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                    <td className="no-print">
                      <button 
                        onClick={() => handleReset(log.id)}
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444', background: 'transparent' }}
                        title="Reset Shift"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No matching shift attendance records logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media print {
          .no-print,
          .sidebar,
          .mobile-header,
          .mobile-overlay,
          .shell-topbar,
          .attendance-filters,
          th:last-child,
          td:last-child {
            display: none !important;
          }

          body {
            background: white !important;
            color: black !important;
          }

          .app-shell {
            display: block !important;
          }

          main.content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
          }

          .table-container {
            overflow: visible !important;
            margin-top: 1rem !important;
          }

          table {
            border: 1px solid #cbd5e1 !important;
            width: 100% !important;
          }

          th {
            background: #f1f5f9 !important;
            color: #0f172a !important;
            border-bottom: 2px solid #cbd5e1 !important;
          }

          td {
            border-bottom: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  )
}
