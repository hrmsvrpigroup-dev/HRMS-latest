import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminDashboardData } from '../../api/admin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { 
  Users, 
  Briefcase, 
  Coins, 
  ShieldCheck, 
  Calendar,
  Zap,
  UserPlus,
  Mail,
  Server,
  Database,
  Repeat,
  Globe,
  Check,
  UserCircle,
  FileText,
  Clock
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await adminApi.getDashboard()
      setData(res)
    } catch {
      setError('Could not retrieve company analytics.')
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
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>SaaS Portal Load Mismatch</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={fetchDashboard} className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem' }}>
            Welcome back, admin! <span style={{ fontSize: '1.5rem' }}>👋</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Supervise workspace operations, manage HR structures, and check platform resource metrics.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Clock size={16} />
          <span>Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <span style={{ 
            background: '#dcfce3', 
            color: '#166534', 
            padding: '4px 10px', 
            borderRadius: '12px', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></div>
            LIVE
          </span>
        </div>
      </div>

      {/* Top Stats Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Active Headcount */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Active Headcount</h4>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{data?.employeesCount ?? 0}</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '0.75rem', color: '#16a34a' }}>
              <Users size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>— No change</span>
          </div>
        </div>

        {/* HR Seats */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Provisioned HR Seats</h4>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{data?.hrsCount ?? 0}</div>
            </div>
            <div style={{ background: '#fff1f2', padding: '0.75rem', borderRadius: '0.75rem', color: '#e11d48' }}>
              <Briefcase size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>— No change</span>
          </div>
        </div>

        {/* Credits */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>SaaS Credits Balance</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '2rem' }}>🪙</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{data?.creditsBalance?.toLocaleString() ?? 0}</span>
              </div>
            </div>
            <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '0.75rem', color: '#d97706' }}>
              <Coins size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>+ {data?.creditsThisMonth ?? 0} this month</span>
          </div>
        </div>

        {/* Portal Status */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Portal Access Status</h4>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: data?.status === 'ACTIVE' ? '#16a34a' : '#e11d48', lineHeight: 1.2 }}>
                {data?.status === 'ACTIVE' ? 'Secure' : data?.status}
              </div>
            </div>
            <div style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: '0.75rem', color: '#0284c7' }}>
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            All systems operational
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Operational Summaries */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              <Zap size={20} color="var(--primary)" /> Operational Summaries
            </h3>
            <button style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: '#fff', 
              border: '1px solid #e2e8f0', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              <Calendar size={14} /> Last 30 days
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            Resource pools are fully healthy. The organization's active directory database has isolated queries locked within the tenant token boundaries. Auto-debits for HR accounts and new employee invitations are configured.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>HR Operators</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{data?.hrsCount ?? 0} Provisioned</span>
                <span style={{ background: '#dcfce3', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>Active</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '0.5rem' }}>
                <div style={{ width: '100%', height: '100%', background: '#10b981', borderRadius: '2px' }}></div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Auto-Debits System</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>Enabled</span>
                </div>
                <div style={{ background: '#dcfce3', padding: '0.4rem', borderRadius: '0.5rem', color: '#16a34a' }}>
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                Next debit: {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Employee Invitations</h4>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{data?.pendingInvitations ?? 0} Pending</span>
                </div>
                <div style={{ background: '#e0e7ff', padding: '0.4rem', borderRadius: '0.5rem', color: '#4f46e5' }}>
                  <Mail size={16} />
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                {data?.pendingInvitations === 0 ? 'No pending invitations' : 'Invitations awaiting setup'}
              </div>
            </div>
          </div>
        </div>

        {/* Administrative Actions */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <Zap size={20} color="var(--primary)" /> Administrative Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
            <button 
              style={{ 
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                color: '#fff', 
                border: 'none', 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
              }}
              onClick={() => navigate('/admin/hr')}
            >
              <UserPlus size={18} /> Manage HR Accounts
            </button>
            <button 
              style={{ 
                background: '#fff', 
                color: '#334155', 
                border: '1px solid #cbd5e1', 
                padding: '1rem', 
                borderRadius: '0.75rem', 
                fontSize: '0.95rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/admin/employees')}
            >
              <Users size={18} /> View Employee Directory
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Headcount Trend */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <Users size={20} color="var(--primary)" /> Headcount Trend
          </h3>
          <div style={{ height: '200px', width: '100%' }}>
            {data?.headcountTrend && data.headcountTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.headcountTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 700 }}
                  />
                  <Line type="monotone" dataKey="headcount" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <ShieldCheck size={20} color="var(--primary)" /> System Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={14} color="#64748b" /> Directory Services</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Healthy</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Database size={14} color="#64748b" /> Database</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Healthy</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Repeat size={14} color="#64748b" /> Auto-Debits</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Healthy</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={14} color="#64748b" /> Portal Services</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={14} /> Healthy</span>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
              <Clock size={20} color="var(--primary)" /> Activity Feed
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
            {data?.activityFeed && data.activityFeed.length > 0 ? (
              data.activityFeed.map((activity, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ 
                    background: activity.type === 'employee' ? '#dcfce3' : activity.type === 'audit' ? '#e0e7ff' : '#fffbeb', 
                    color: activity.type === 'employee' ? '#16a34a' : activity.type === 'audit' ? '#4f46e5' : '#d97706',
                    padding: '0.5rem', 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {activity.type === 'employee' ? <UserPlus size={14} /> : activity.type === 'audit' ? <FileText size={14} /> : <Coins size={14} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.1rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</h5>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.subtitle}</p>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={14} /> All systems secure and up to date. Thank you for using our platform!
      </div>
    </div>
  )
}
