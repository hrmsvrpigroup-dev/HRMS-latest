import React, { useState, useEffect } from 'react'
import { employeeApi, Employee } from '../../api/employee.api'
import { attendanceApi } from '../../api/attendance.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

export default function ManualAttendance() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [clockInTime, setClockInTime] = useState<string>('')
  const [status, setStatus] = useState<string>('PRESENT')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await employeeApi.list()
      setEmployees(res.data.data.filter(e => e.status === 'ACTIVE'))
    } catch (err: any) {
      setMessage({ text: 'Failed to load employees list.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleManualClockIn = async () => {
    if (!selectedEmployeeId) {
      setMessage({ text: 'Please select an employee first.', type: 'error' })
      return
    }

    try {
      setSubmitting(true)
      setMessage(null)
      await attendanceApi.manualClockIn({
        employeeId: selectedEmployeeId,
        date: date || undefined,
        clockInTime: clockInTime || undefined,
        status: status || 'PRESENT',
        notes: notes || undefined,
      })
      setMessage({ text: 'Manual clock-in recorded successfully!', type: 'success' })
      setSelectedEmployeeId('')
      setNotes('')
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to manually clock in employee'
      setMessage({ text: errorMsg, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-header-title">
          <h1>Manual Attendance</h1>
          <p>Force clock-in or record attendance for an employee manually.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Manual Attendance Entry</h3>

        {message && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '0.5rem',
            background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.type === 'success' ? '#10b981' : '#ef4444',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            fontWeight: 600,
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Employee *
          </label>
          <select 
            value={selectedEmployeeId} 
            onChange={e => setSelectedEmployeeId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.5)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          >
            <option value="">-- Select an Employee --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} ({emp.employeeCode})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Shift Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.5)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Clock-In Time (Optional)
            </label>
            <input
              type="time"
              value={clockInTime}
              onChange={e => setClockInTime(e.target.value)}
              placeholder="e.g. 09:30"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.5)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Attendance Status
          </label>
          <select 
            value={status} 
            onChange={e => setStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.5)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          >
            <option value="PRESENT">PRESENT</option>
            <option value="LATE">LATE</option>
            <option value="HALF_DAY">HALF_DAY</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Notes / Reason (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for manual clock-in..."
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.5)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
        </div>

        <button 
          onClick={handleManualClockIn}
          disabled={submitting || !selectedEmployeeId}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: submitting || !selectedEmployeeId ? 'not-allowed' : 'pointer',
            opacity: submitting || !selectedEmployeeId ? 0.7 : 1,
            transition: 'var(--transition)'
          }}
        >
          {submitting ? 'Processing...' : 'Force Clock In'}
        </button>
      </div>
    </div>
  )
}
