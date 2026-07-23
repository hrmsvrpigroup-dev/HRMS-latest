import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, User, Briefcase, Clock, CheckCircle2,
  XCircle, AlertCircle, Calendar, TrendingUp, Award, Activity,
  BarChart2, Target, Coffee, Zap, FileText, Mail, Phone, Building2, MapPin
} from 'lucide-react'
import { adminApi } from '../../api/admin.api'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function RadialProgress({ percent, size = 100, stroke = 8, color = '#6366f1', bg = '#e0e7ff' }: {
  percent: number; size?: number; stroke?: number; color?: string; bg?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '20px 24px',
      border: '1px solid #e8ecf4',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: { month: string; present: number; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total || 1), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
            <div style={{
              width: '60%',
              height: `${(d.total / max) * 100}%`,
              background: '#e0e7ff',
              borderRadius: '4px 4px 0 0',
              minHeight: 4
            }} />
            <div style={{
              width: '60%',
              height: `${(d.present / max) * 100}%`,
              background: 'linear-gradient(180deg, #818cf8, #6366f1)',
              borderRadius: '4px 4px 0 0',
              minHeight: d.present > 0 ? 4 : 0
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{d.month}</div>
        </div>
      ))}
    </div>
  )
}

function TaskBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    DONE: { bg: '#dcfce7', color: '#16a34a', label: 'Done' },
    IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb', label: 'In Progress' },
    PENDING: { bg: '#fef9c3', color: '#ca8a04', label: 'Pending' },
  }
  const c = configs[status] || { bg: '#f1f5f9', color: '#64748b', label: status }
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color
    }}>{c.label}</span>
  )
}

export default function EmployeePortfolio() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const portfolioRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    adminApi.getEmployeePortfolio(id)
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #e0e7ff', borderTop: '4px solid #6366f1', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#64748b', fontWeight: 600 }}>Loading portfolio...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div style={{ color: '#64748b' }}>Portfolio not found.</div>
    </div>
  )

  const { employee: emp, attendanceStats: att, taskStats: task, leaveStats: leave, payrollHistory } = data
  const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`
  const fullName = `${emp.firstName} ${emp.lastName}`
  const joiningDate = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  // Score: blend attendance % and task completion
  const performanceScore = Math.round((att.attendancePercent * 0.6) + (task.taskCompletionRate * 0.4))
  const scoreColor = performanceScore >= 80 ? '#16a34a' : performanceScore >= 60 ? '#d97706' : '#dc2626'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .portfolio-page * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          .portfolio-page { padding: 0 !important; }
          .portfolio-card { box-shadow: none !important; border: 1px solid #e8ecf4 !important; break-inside: avoid; }
        }
      `}</style>

      <div className="portfolio-page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
        {/* Header bar */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
            fontWeight: 600, color: '#374151', cursor: 'pointer', fontSize: 14
          }}>
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={handlePrint} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10, color: '#fff',
            fontWeight: 700, cursor: 'pointer', fontSize: 14,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
          }}>
            <Download size={16} /> Export PDF
          </button>
        </div>

        <div ref={portfolioRef} style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* ===== HERO CARD ===== */}
          <div className="portfolio-card" style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
            borderRadius: 24,
            padding: '36px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative blobs */}
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 250, height: 250, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)'
            }} />
            <div style={{
              position: 'absolute', bottom: -40, right: 100,
              width: 160, height: 160, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)'
            }} />

            {/* Avatar */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 900, color: '#fff', flexShrink: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: '3px solid rgba(255,255,255,0.2)',
              overflow: 'hidden'
            }}>
              {emp.photo ? <img src={emp.photo} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{fullName}</div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: 500 }}>
                {emp.designation || 'Employee'} {emp.department ? `· ${emp.department}` : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16 }}>
                {emp.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    <Mail size={13} /> {emp.email}
                  </div>
                )}
                {emp.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    <Phone size={13} /> {emp.phone}
                  </div>
                )}
                {emp.branch && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    <MapPin size={13} /> {emp.branch}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  <Calendar size={13} /> Joined {joiningDate}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#e0e7ff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {emp.employeeCode}
                </span>
                <span style={{
                  background: emp.status === 'ACTIVE' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  color: emp.status === 'ACTIVE' ? '#4ade80' : '#f87171',
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700
                }}>
                  {emp.status}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', color: '#c7d2fe', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {emp.employmentType?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Performance Score */}
            <div style={{
              background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
              borderRadius: 20, padding: '24px 32px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0
            }}>
              <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto' }}>
                <RadialProgress percent={performanceScore} size={100} stroke={8} color={scoreColor} bg="rgba(255,255,255,0.15)" />
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexDirection: 'column'
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{performanceScore}%</div>
                </div>
              </div>
              <div style={{ color: '#c7d2fe', fontSize: 12, fontWeight: 700, marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                Performance
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>Overall Score</div>
            </div>
          </div>

          {/* ===== QUICK STATS ROW ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <StatCard icon={<CheckCircle2 size={22} />} label="Days Present" value={att.presentDays} sub={`of ${att.totalDays} recorded`} color="#16a34a" />
            <StatCard icon={<XCircle size={22} />} label="Days Absent" value={att.absentDays} color="#dc2626" />
            <StatCard icon={<Target size={22} />} label="Tasks Completed" value={task.doneTasks} sub={`of ${task.totalTasks} total`} color="#6366f1" />
            <StatCard icon={<Award size={22} />} label="Attendance Rate" value={`${att.attendancePercent}%`} color="#d97706" />
          </div>

          {/* ===== ATTENDANCE & TASK SECTION ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

            {/* Attendance Analytics */}
            <div className="portfolio-card" style={{
              background: '#fff', borderRadius: 20, padding: 28,
              border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ background: '#e0e7ff', padding: 8, borderRadius: 10, color: '#6366f1' }}>
                  <Activity size={18} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Attendance Analytics</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  <RadialProgress percent={att.attendancePercent} size={130} stroke={10} color="#6366f1" />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{att.attendancePercent}%</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Attendance</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Present', value: att.presentDays, color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Absent', value: att.absentDays, color: '#dc2626', bg: '#fee2e2' },
                  { label: 'On Leave', value: att.leaveDays, color: '#7c3aed', bg: '#ede9fe' },
                  { label: 'Late Days', value: att.lateDays, color: '#d97706', bg: '#fef3c7' },
                  { label: 'Late Logins', value: att.lateLogins, color: '#ea580c', bg: '#ffedd5' },
                  { label: 'Early Logins', value: att.earlyLogins, color: '#0891b2', bg: '#cffafe' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: item.bg, borderRadius: 10
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 16, padding: '12px 16px',
                background: '#f8fafc', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1' }}>
                  <Coffee size={16} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Avg. Work Hours</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{att.avgHours}h</span>
              </div>
            </div>

            {/* Task Performance */}
            <div className="portfolio-card" style={{
              background: '#fff', borderRadius: 20, padding: 28,
              border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ background: '#fef3c7', padding: 8, borderRadius: 10, color: '#d97706' }}>
                  <Target size={18} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Task Performance</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  <RadialProgress percent={task.taskCompletionRate} size={130} stroke={10} color="#f59e0b" />
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column'
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{task.taskCompletionRate}%</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Completion</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total Tasks', value: task.totalTasks, color: '#6366f1', bg: '#e0e7ff' },
                  { label: 'Completed', value: task.doneTasks, color: '#16a34a', bg: '#dcfce7' },
                  { label: 'In Progress', value: task.inProgressTasks, color: '#2563eb', bg: '#dbeafe' },
                  { label: 'Pending', value: task.pendingTasks, color: '#d97706', bg: '#fef3c7' },
                  { label: 'On Time', value: task.onTimeTasksCount, color: '#0891b2', bg: '#cffafe' },
                  { label: 'Overdue', value: task.overdueTasksCount, color: '#dc2626', bg: '#fee2e2' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: item.bg, borderRadius: 10
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.label}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== MONTHLY ATTENDANCE CHART ===== */}
          <div className="portfolio-card" style={{
            background: '#fff', borderRadius: 20, padding: 28, marginBottom: 24,
            border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ background: '#e0e7ff', padding: 8, borderRadius: 10, color: '#6366f1' }}>
                <BarChart2 size={18} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Monthly Attendance Trend (Last 6 Months)</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e0e7ff', display: 'inline-block' }} />
                  Total Days
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(#818cf8,#6366f1)', display: 'inline-block' }} />
                  Present Days
                </span>
              </div>
            </div>
            <BarChart data={att.monthlyAttendance} />
          </div>

          {/* ===== RECENT TASKS ===== */}
          {task.recentTasks?.length > 0 && (
            <div className="portfolio-card" style={{
              background: '#fff', borderRadius: 20, padding: 28, marginBottom: 24,
              border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#fef3c7', padding: 8, borderRadius: 10, color: '#d97706' }}>
                  <FileText size={18} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Recent Tasks</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {task.recentTasks.map((t: any, i: number) => {
                  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: '#f8fafc', borderRadius: 12,
                      border: isOverdue ? '1px solid #fecdd3' : '1px solid transparent'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: t.status === 'DONE' ? '#16a34a' : t.status === 'IN_PROGRESS' ? '#2563eb' : '#d97706'
                        }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{t.title}</span>
                        {isOverdue && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 20 }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {t.dueDate && (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            Due: {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </span>
                        )}
                        <TaskBadge status={t.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ===== LEAVE & PAYROLL ===== */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

            {/* Leave Summary */}
            <div className="portfolio-card" style={{
              background: '#fff', borderRadius: 20, padding: 28,
              border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#ede9fe', padding: 8, borderRadius: 10, color: '#7c3aed' }}>
                  <Calendar size={18} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Leave Summary</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#7c3aed' }}>{leave.totalLeaveDaysTaken}</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Days Taken</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>{leave.approvedLeaves}</div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Approved</div>
                </div>
              </div>
              {leave.leaveBreakdown?.slice(0, 5).map((l: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{l.type}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>
                      {new Date(l.fromDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
                      {new Date(l.toDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: l.status === 'APPROVED' ? '#dcfce7' : l.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                    color: l.status === 'APPROVED' ? '#16a34a' : l.status === 'PENDING' ? '#d97706' : '#dc2626'
                  }}>{l.status}</span>
                </div>
              ))}
              {leave.leaveBreakdown?.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>No leave records found.</div>
              )}
            </div>

            {/* Payroll History */}
            <div className="portfolio-card" style={{
              background: '#fff', borderRadius: 20, padding: 28,
              border: '1px solid #e8ecf4', boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#dcfce7', padding: 8, borderRadius: 10, color: '#16a34a' }}>
                  <TrendingUp size={18} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Payroll History</div>
              </div>
              {payrollHistory?.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>No payroll records yet.</div>
              ) : payrollHistory?.map((p: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: i < payrollHistory.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>Basic ₹{p.basicSalary?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 14 }}>₹{p.netSalary?.toLocaleString()}</span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: p.status === 'PAID' ? '#dcfce7' : p.status === 'PROCESSED' ? '#dbeafe' : '#f1f5f9',
                      color: p.status === 'PAID' ? '#16a34a' : p.status === 'PROCESSED' ? '#2563eb' : '#64748b'
                    }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== FOOTER ===== */}
          <div style={{
            textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '16px 0',
            borderTop: '1px solid #e8ecf4'
          }}>
            Generated by HRMS · {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>
    </>
  )
}
