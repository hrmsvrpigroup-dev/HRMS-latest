import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, UserCheck, Users, UserX, Search, Building2 } from 'lucide-react'
import { hrApi } from '../../api/hr.api'

type EmpType = 'active' | 'leave' | 'inactive'

const CONFIG: Record<EmpType, {
  icon: React.ReactNode
  label: string
  color: string
  bg: string
  dot: string
}> = {
  active: {
    icon: <UserCheck size={22} />,
    label: 'Active Employees',
    color: '#16a34a',
    bg: '#dcfce7',
    dot: '#22c55e',
  },
  leave: {
    icon: <Users size={22} />,
    label: 'Employees On Leave',
    color: '#7c3aed',
    bg: '#ede9fe',
    dot: '#a855f7',
  },
  inactive: {
    icon: <UserX size={22} />,
    label: 'Inactive / Absent',
    color: '#dc2626',
    bg: '#fee2e2',
    dot: '#ef4444',
  },
}

export default function HRAttendanceDetails() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const dateStr = searchParams.get('date') || ''
  const type = (searchParams.get('type') || 'active') as EmpType

  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const cfg = CONFIG[type]

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true)
        if (dateStr && type) {
          const data = await hrApi.getAttendanceDetails(dateStr, type)
          setEmployees(data)
        }
      } catch (err) {
        console.error('Failed to load attendance details', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [dateStr, type])

  const getDisplayDate = () => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const filtered = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.employeeCode} ${emp.department?.name || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .att-det * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .att-det { background: #f1f5f9; min-height: 100vh; }

        .att-det-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%);
          padding: 36px 40px 60px;
          position: relative;
          overflow: hidden;
        }
        .att-det-hero::before {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 320px; height: 320px; border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .att-det-hero::after {
          content: '';
          position: absolute; bottom: -60px; left: 40%;
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(255,255,255,0.04);
        }

        .att-det-back {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.85);
          padding: 8px 16px; border-radius: 10px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          margin-bottom: 28px; position: relative; z-index: 2;
          transition: all 0.2s ease;
          backdrop-filter: blur(6px);
        }
        .att-det-back:hover { background: rgba(255,255,255,0.2); }

        .att-det-hero-body { position: relative; z-index: 2; display: flex; align-items: center; gap: 20px; }
        .att-det-hero-icon {
          width: 60px; height: 60px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          flex-shrink: 0;
        }
        .att-det-hero-title { font-size: 28px; font-weight: 900; color: #fff; margin: 0 0 4px; letter-spacing: -0.5px; }
        .att-det-hero-date { font-size: 14px; color: rgba(255,255,255,0.6); font-weight: 500; }

        .att-det-count-badge {
          margin-left: auto;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          padding: 10px 24px;
          text-align: center;
          backdrop-filter: blur(8px);
          flex-shrink: 0;
        }
        .att-det-count-num { font-size: 36px; font-weight: 900; color: #fff; line-height: 1; }
        .att-det-count-label { font-size: 11px; color: rgba(255,255,255,0.6); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }

        .att-det-content {
          padding: 0 32px 32px;
          margin-top: -32px;
          position: relative; z-index: 5;
        }

        .att-det-search-bar {
          background: #fff;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
          border: 1px solid #e8ecf4;
        }
        .att-det-search-input {
          flex: 1; border: none; outline: none;
          font-size: 14px; font-weight: 500; color: #0f172a;
          background: transparent;
        }
        .att-det-search-input::placeholder { color: #94a3b8; }

        .att-det-table-wrap {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          border: 1px solid #e8ecf4;
          overflow: hidden;
        }

        .att-det-table { width: 100%; border-collapse: collapse; }
        .att-det-th {
          padding: 14px 20px;
          text-align: left;
          font-size: 11px; font-weight: 800;
          color: #64748b; text-transform: uppercase; letter-spacing: 0.07em;
          background: #f8fafc;
          border-bottom: 1px solid #f1f5f9;
        }
        .att-det-th:last-child { text-align: right; }

        .att-det-tr {
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s ease;
        }
        .att-det-tr:last-child { border-bottom: none; }
        .att-det-tr:hover { background: #fafbff; }

        .att-det-td { padding: 16px 20px; }
        .att-det-td:last-child { text-align: right; }

        .att-det-avatar {
          width: 44px; height: 44px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900; color: #fff;
          flex-shrink: 0; overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .att-det-emp-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .att-det-emp-email { font-size: 12px; color: #94a3b8; font-weight: 500; margin-top: 1px; }

        .att-det-code-badge {
          display: inline-flex;
          padding: 5px 12px; border-radius: 8px;
          font-size: 12px; font-weight: 800;
          background: #f1f5f9; color: #475569;
          letter-spacing: 0.04em; font-family: 'Courier New', monospace;
        }

        .att-det-dept {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: #64748b; font-weight: 500;
        }

        .att-det-view-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 700;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
          transition: all 0.2s ease;
        }
        .att-det-view-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99,102,241,0.4);
        }

        .att-det-empty { padding: 80px 20px; text-align: center; }
        .att-det-empty-icon {
          width: 72px; height: 72px; border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .att-det-empty-title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .att-det-empty-sub { font-size: 14px; color: #94a3b8; font-weight: 500; }

        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .att-det-loading { animation: shimmer 1.5s ease-in-out infinite; }
      `}</style>

      <div className="att-det">
        <div className="att-det-hero">
          <button className="att-det-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Back
          </button>

          <div className="att-det-hero-body">
            <div className="att-det-hero-icon" style={{ color: cfg.dot }}>
              {cfg.icon}
            </div>
            <div>
              <div className="att-det-hero-title">{cfg.label}</div>
              <div className="att-det-hero-date">{getDisplayDate()}</div>
            </div>
            {!loading && (
              <div className="att-det-count-badge">
                <div className="att-det-count-num">{employees.length}</div>
                <div className="att-det-count-label">Total</div>
              </div>
            )}
          </div>
        </div>

        <div className="att-det-content">
          <div className="att-det-search-bar">
            <Search size={18} color="#94a3b8" />
            <input
              className="att-det-search-input"
              placeholder="Search by name, code, or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="att-det-table-wrap">
            {loading ? (
              <div className="att-det-empty">
                <div className="att-det-loading" style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>
                  Loading employees...
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="att-det-empty">
                <div className="att-det-empty-icon" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div className="att-det-empty-title">No employees found</div>
                <div className="att-det-empty-sub">
                  {search ? 'Try a different search term' : 'No employees in this category for the selected date'}
                </div>
              </div>
            ) : (
              <table className="att-det-table">
                <thead>
                  <tr>
                    <th className="att-det-th">Employee</th>
                    <th className="att-det-th">Emp Code</th>
                    <th className="att-det-th">Department</th>
                    <th className="att-det-th">Clock In</th>
                    <th className="att-det-th">Clock Out</th>
                    <th className="att-det-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((emp, idx) => {
                    const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`
                    const gradients = [
                      'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      'linear-gradient(135deg,#0891b2,#0e7490)',
                      'linear-gradient(135deg,#059669,#047857)',
                      'linear-gradient(135deg,#d97706,#b45309)',
                      'linear-gradient(135deg,#dc2626,#b91c1c)',
                    ]
                    const grad = gradients[idx % gradients.length]
                    return (
                      <tr key={emp.id} className="att-det-tr">
                        <td className="att-det-td">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div className="att-det-avatar" style={{ background: grad }}>
                              {emp.photo
                                ? <img src={emp.photo} alt={emp.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : initials}
                            </div>
                            <div>
                              <div className="att-det-emp-name">{emp.firstName} {emp.lastName}</div>
                              {emp.email && <div className="att-det-emp-email">{emp.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="att-det-td">
                          <span className="att-det-code-badge">{emp.employeeCode}</span>
                        </td>
                        <td className="att-det-td">
                          <div className="att-det-dept">
                            <Building2 size={13} color="#94a3b8" />
                            {emp.department?.name || '—'}
                          </div>
                        </td>
                        <td className="att-det-td">
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {emp.clockIn ? new Date(emp.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </td>
                        <td className="att-det-td">
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                            {emp.clockOut ? new Date(emp.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </td>
                        <td className="att-det-td">
                          <button
                            className="att-det-view-btn"
                            onClick={() => navigate(`/hr/employees/${emp.id}/portfolio`)}
                          >
                            <Eye size={14} /> View Portfolio
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
