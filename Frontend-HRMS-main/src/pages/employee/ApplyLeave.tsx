import { useEffect, useState } from 'react'
import { leaveApi, LeaveItem } from '../../api/leave.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { useAuthStore } from '../../store/auth.store'
import { triggerHrNotification } from '../../utils/notif'

export default function ApplyLeave() {
  const user = useAuthStore((state) => state.user)
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'An employee'
  const [requests, setRequests] = useState<LeaveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    type: 'CASUAL',
    fromDate: '',
    toDate: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const res = await leaveApi.list()
      setRequests(res.data.data)
    } catch {
      setError('Could not retrieve your leave requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormSuccess('')

    try {
      const res = await leaveApi.create(formData)
      setRequests((prev) => [res.data.data, ...prev])
      setFormSuccess('Leave request submitted successfully! Pending HR approval.')
      triggerHrNotification(`Employee ${fullName} applied for leave (${formData.type}): ${formData.reason}`)
      setFormData({
        type: 'CASUAL',
        fromDate: '',
        toDate: '',
        reason: '',
      })
      // Refetch to pull in relation objects
      const freshRes = await leaveApi.list()
      setRequests(freshRes.data.data)
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit leave request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Leave Management</h1>
          <p>Submit timeoff leave requests and audit historically processed pipelines.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Leave application form */}
        <div className="card">
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: '1.25rem' }}>
            Submit Timeoff Request
          </h3>

          {formSuccess && (
            <div
              style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: 'var(--success)',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.88rem',
              }}
            >
              ✓ {formSuccess}
            </div>
          )}

          {formError && (
            <div
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--error)',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.88rem',
              }}
            >
              ✕ {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <label>
              Leave Type Division
              <select
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                required
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick Leave</option>
                <option value="EARNED">Earned Leave</option>
                <option value="MATERNITY">Maternity Leave</option>
                <option value="PATERNITY">Paternity Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ flex: 1 }}>
                Start Date
                <input
                  type="date"
                  value={formData.fromDate}
                  onChange={(event) => setFormData({ ...formData, fromDate: event.target.value })}
                  required
                />
              </label>

              <label style={{ flex: 1 }}>
                End Date
                <input
                  type="date"
                  value={formData.toDate}
                  onChange={(event) => setFormData({ ...formData, toDate: event.target.value })}
                  required
                />
              </label>
            </div>

            <label>
              Request Reason
              <textarea
                placeholder="Explain the reason for leave request..."
                rows={4}
                value={formData.reason}
                onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                required
              />
            </label>

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Submitting Leave...' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Historic logs list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', paddingLeft: '0.5rem' }}>
            Request History Logs
          </h3>

          {error ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
              {error}
            </div>
          ) : (
            <div className="card table-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Interval</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Decision Status / Signatory</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge-info">{item.type}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {new Date(item.fromDate).toLocaleDateString()}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          to {new Date(item.toDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.days}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.reason}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === 'APPROVED'
                              ? 'badge-success'
                              : item.status === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.approvedBy && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            by {item.approvedBy.firstName}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No leave requests submitted yet. Use the form on the left to apply.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
