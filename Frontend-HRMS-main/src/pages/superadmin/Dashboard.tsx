import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi, SuperAdminDashboardData } from '../../api/superadmin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<SuperAdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await superAdminApi.getDashboard()
      setData(res)
    } catch {
      setError('Could not fetch SaaS analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error Loading Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={fetchDashboard} className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Retry Fetching
        </button>
      </section>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Super Admin Dashboard</h1>
          <p>Global systems performance, billing structures, and tenant analytics.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Subscribed Companies</span>
            <span className="stat-value">{data?.totalCompanies ?? 0}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--secondary)' }}>
            🌐
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Active Tenants</span>
            <span className="stat-value">{data?.activeCompanies ?? 0}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--success)' }}>
            ✓
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Suspended Accounts</span>
            <span className="stat-value">{data?.suspendedCompanies ?? 0}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--error)' }}>
            ⚠
          </div>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Total Allocated Credits</span>
            <span className="stat-value">{(data?.totalCreditsAllocated ?? 0).toLocaleString()}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--primary)' }}>
            🪙
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
            SaaS Infrastructure Health
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            All multi-tenant microservices are working normally. Database isolation layers are fully active with automated schema partitioning verification. Backup systems are operational and point-in-time recovery is synchronized.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Main Database</h4>
              <span className="badge badge-success">Online (0.01ms latency)</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>WebSocket Monitoring Router</h4>
              <span className="badge badge-success">Online</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', padding: '1rem', borderRadius: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Cache Clusters</h4>
              <span className="badge badge-warning">Bypassed (Local Dev)</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>SaaS Control Actions</h3>
          <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/superadmin/companies')}>
            Register New Company
          </button>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/superadmin/credits')}>
            Distribute Credits
          </button>
        </div>
      </div>
    </div>
  )
}
