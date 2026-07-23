import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, HRUser } from '../../api/admin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

export default function HRManagement() {
  const navigate = useNavigate()
  const [hrs, setHrs] = useState<HRUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchHRs = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getHRs()
      setHrs(data)
    } catch {
      setError('Could not retrieve HR seat listings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHRs()
  }, [])

  const handleDeleteConfirm = async (id: string) => {
    try {
      setDeletingId(id)
      await adminApi.deleteHR(id)
      setHrs(prev => prev.filter(hr => hr.id !== id))
      setConfirmDeleteId(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete HR account.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const hrToDelete = hrs.find(hr => hr.id === confirmDeleteId)

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="page-header">
        <div className="page-header-title">
          <h1>HR Management</h1>
          <p>Provision HR console operators.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/admin/hr/provision')}>
          + Provision HR Account
        </button>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
          {error}
        </div>
      ) : (
        <div className="card table-container">
          <table>
            <thead>
              <tr>
                <th>Operator Name</th>
                <th>Operator Email</th>
                <th>Department Division</th>
                <th>Provision Date</th>
                <th>Operator Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {hrs.map((hr) => (
                <tr key={hr.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {hr.firstName} {hr.lastName}
                  </td>
                  <td>{hr.email}</td>
                  <td>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#dbeafe', color: '#1e40af', fontSize: '0.8rem', fontWeight: 600 }}>
                      {hr.hrProfile?.department || 'Human Resources'}
                    </span>
                  </td>
                  <td>{new Date(hr.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: '#dcfce3', color: '#166534', fontSize: '0.8rem', fontWeight: 600 }}>
                      ACTIVE
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => alert('Edit profile functionality coming soon!')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'rgba(59, 130, 246, 0.08)',
                        color: '#2563eb',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#2563eb'
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'
                        e.currentTarget.style.color = '#2563eb'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(hr.id)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: 'rgba(239,68,68,0.08)',
                        color: '#dc2626',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#dc2626'
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                        e.currentTarget.style.color = '#dc2626'
                      }}
                    >
                      🗑 Delete
                    </button>
                  </td>
                </tr>
              ))}
              {hrs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No HR accounts provisioned yet. Click "Provision HR Account" to add operators.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDeleteId && hrToDelete && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          display: 'grid', placeItems: 'center',
          zIndex: 200,
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: 420,
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>
                Delete HR Account
              </h2>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3',
              borderRadius: 10, padding: '1rem 1.25rem',
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#9f1239', lineHeight: 1.6 }}>
                You are about to permanently delete the HR account for{' '}
                <strong>{hrToDelete.firstName} {hrToDelete.lastName}</strong>{' '}
                (<span style={{ fontFamily: 'monospace' }}>{hrToDelete.email}</span>).
                This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleDeleteConfirm(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                style={{
                  flex: 1, padding: '0.7rem',
                  background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: 8,
                  fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', opacity: deletingId ? 0.7 : 1,
                }}
              >
                {deletingId === confirmDeleteId ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={!!deletingId}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
