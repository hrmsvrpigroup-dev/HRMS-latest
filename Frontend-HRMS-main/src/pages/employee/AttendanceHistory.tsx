import React, { useEffect, useState } from 'react'
import { attendanceApi, AttendanceItem } from '../../api/attendance.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { Clock, Filter, Calendar, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react'

export default function AttendanceHistory() {
  const [logs, setLogs] = useState<AttendanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await attendanceApi.list()
      setLogs(res.data.data || [])
    } catch {
      setError('Could not retrieve your attendance history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  if (loading) return <LoadingSpinner />

  const filteredLogs = logs.filter(log => {
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter
    const matchesDate = !dateFilter || new Date(log.date).toISOString().split('T')[0] === dateFilter
    return matchesStatus && matchesDate
  })

  // Calculate statistics
  const totalDays = logs.length
  const presentDays = logs.filter(l => l.status === 'PRESENT').length
  const lateDays = logs.filter(l => l.status === 'LATE').length
  const absentDays = logs.filter(l => l.status === 'ABSENT').length
  const totalHoursWorked = logs.reduce((sum, current) => sum + (current.totalHours || 0), 0)

  return (
    <div className="attendance-history-page">
      <div className="history-header">
        <div className="header-title">
          <h1>Attendance Logs & History</h1>
          <p>View and audit all shift records, total durations, and punch timings.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-details">
            <span className="stat-label">Hours Logged</span>
            <strong className="stat-value">{totalHoursWorked.toFixed(1)} hrs</strong>
            <span className="stat-desc">Total working hours</span>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-details">
            <span className="stat-label">Days Present</span>
            <strong className="stat-value">{presentDays} / {totalDays}</strong>
            <span className="stat-desc">On-time shift check-ins</span>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div className="stat-details">
            <span className="stat-label">Late Arrivals</span>
            <strong className="stat-value">{lateDays}</strong>
            <span className="stat-desc">Shift starts after 9:15 AM</span>
          </div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-details">
            <span className="stat-label">Days Absent</span>
            <strong className="stat-value">{absentDays}</strong>
            <span className="stat-desc">Missed shifts</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="toolbar-panel">
        <div className="toolbar-title">
          <Filter size={16} />
          <span>Filter Logs</span>
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Specific Date</label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            </div>
          </div>
          {(statusFilter !== 'ALL' || dateFilter) && (
            <button className="btn-clear-filter" onClick={() => { setStatusFilter('ALL'); setDateFilter(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      {error ? (
        <div className="error-card">⚠️ {error}</div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <h3>Detailed Work Logs</h3>
            <span className="results-count">Showing {filteredLogs.length} records</span>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Shift Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Active Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.date)
                  return (
                    <tr key={log.id}>
                      <td className="date-cell">
                        <span className="day-name">{dateObj.toLocaleDateString(undefined, { weekday: 'short' })},</span>
                        <span className="date-str">{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </td>
                      <td className="in-cell">
                        {log.clockIn ? (
                          <>
                            <span className="pulse-dot green"></span>
                            {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </>
                        ) : '--'}
                      </td>
                      <td className="out-cell">
                        {log.clockOut ? (
                          <>
                            <span className="pulse-dot red"></span>
                            {new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </>
                        ) : '--'}
                      </td>
                      <td className="duration-cell">
                        <strong>{log.totalHours ? `${log.totalHours.toFixed(2)} hrs` : '--'}</strong>
                      </td>
                      <td>
                        <span className={`status-badge ${log.status.toLowerCase()}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      <div className="empty-state">
                        <Search size={40} className="empty-icon" />
                        <p>No matching shift logs found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .attendance-history-page {
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .history-header {
          margin-bottom: 24px;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        .header-title p {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }

        .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .blue .stat-icon { background: #eff6ff; color: #3b82f6; }
        .green .stat-icon { background: #f0fdf4; color: #22c55e; }
        .orange .stat-icon { background: #fff7ed; color: #f97316; }
        .red .stat-icon { background: #fef2f2; color: #ef4444; }

        .stat-details {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 2px 0;
        }

        .stat-desc {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        .toolbar-panel {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .toolbar-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          color: #334155;
          margin-bottom: 16px;
        }

        .filters-row {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
        }

        .filter-group select,
        .filter-group input {
          padding: 10px 16px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          font-size: 0.85rem;
          color: #334155;
          outline: none;
          min-width: 180px;
          transition: all 0.2s;
        }

        .filter-group select:focus,
        .filter-group input:focus {
          border-color: #3b82f6;
          background: white;
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .input-with-icon input {
          padding-left: 36px;
        }

        .btn-clear-filter {
          background: #f1f5f9;
          color: #475569;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-clear-filter:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .table-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .table-header {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .table-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .results-count {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .table-responsive {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background: #f8fafc;
          padding: 14px 24px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #f1f5f9;
        }

        td {
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          color: #334155;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .date-cell {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .day-name {
          font-weight: 700;
          color: #0f172a;
        }

        .date-str {
          color: #64748b;
        }

        .in-cell, .out-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: monospace;
          font-weight: 600;
        }

        .in-cell { color: #16a34a; }
        .out-cell { color: #dc2626; }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .pulse-dot.green { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.6); }
        .pulse-dot.red { background: #ef4444; }

        .duration-cell {
          color: #0f172a;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 10px;
          font-size: 0.72rem;
          font-weight: 700;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .status-badge.present { background: #dcfce3; color: #15803d; }
        .status-badge.late { background: #fef3c7; color: #d97706; }
        .status-badge.absent { background: #fee2e2; color: #b91c1c; }

        .empty-cell {
          padding: 60px !important;
          text-align: center;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #94a3b8;
        }

        .empty-icon {
          color: #cbd5e1;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .error-card {
          padding: 24px;
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fecaca;
          border-radius: 12px;
          font-weight: 600;
          text-align: center;
        }
      `}</style>
    </div>
  )
}
