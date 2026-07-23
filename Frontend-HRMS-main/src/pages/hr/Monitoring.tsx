import { useEffect, useRef, useState } from 'react'
import { monitoringApi } from '../../api/monitoring.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

const POLL_INTERVAL = 15 // seconds

type ScreenshotLog = {
  id: string
  imageUrl: string
  activityScore: number
  idleTime: number
  capturedAt: string
  employee: {
    firstName: string
    lastName: string
    employeeCode: string
    email: string
  }
}

export default function Monitoring() {
  const [logs, setLogs] = useState<ScreenshotLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(POLL_INTERVAL)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = async (isManual = false) => {
    try {
      if (isManual) setLoading(true)
      const res = await monitoringApi.screenshots()
      setLogs(res.data.data)
      setLastUpdated(new Date())
      setError('')
    } catch (err: any) {
      setError('Failed to fetch screenshot metrics from the live backend.')
    } finally {
      setLoading(false)
    }
  }

  const resetPolling = () => {
    // Clear existing timers
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

    // Reset countdown
    setCountdown(POLL_INTERVAL)

    // Countdown every second
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return POLL_INTERVAL
        return c - 1
      })
    }, 1000)

    // Fetch data every POLL_INTERVAL seconds
    pollTimerRef.current = setInterval(() => {
      fetchLogs()
      setCountdown(POLL_INTERVAL)
    }, POLL_INTERVAL * 1000)
  }

  const handleManualRefresh = () => {
    fetchLogs(true)
    resetPolling()
  }

  useEffect(() => {
    fetchLogs()
    resetPolling()
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Employee Activity & Screen Monitoring</h1>
          <p>Real-time review of live user activity logs, screenshot captures, and idle metrics.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '2rem', padding: '0.4rem 0.9rem', fontSize: '0.82rem',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#10b981', boxShadow: '0 0 6px #10b981',
              display: 'inline-block',
            }} />
            <span style={{ color: '#10b981', fontWeight: 600 }}>LIVE</span>
            <span style={{ color: 'var(--text-muted)' }}>· Auto-refresh in {countdown}s</span>
          </div>
          {lastUpdated && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button className="btn-primary" onClick={handleManualRefresh}>
            ↻ Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--error)', padding: '1rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', marginBottom: '1.5rem' }}>
          Live Work Shift Screenshots
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {logs.map((log) => {
            const formattedDate = new Date(log.capturedAt).toLocaleString()
            const isIdle = log.idleTime > 0
            
            return (
              <div
                key={log.id}
                style={{
                  border: '1px solid var(--border-glass)',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: 'rgba(30, 41, 59, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Image Panel */}
                <div style={{ position: 'relative', width: '100%', height: '180px', background: '#090d16' }}>
                  <img
                    src={log.imageUrl}
                    alt={`${log.employee.firstName} screen`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      // Fallback placeholder image
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=60'
                    }}
                  />
                  
                  {/* Status Indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: isIdle ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '50px',
                      fontWeight: 700,
                    }}
                  >
                    {isIdle ? 'IDLE' : 'ACTIVE'}
                  </div>
                </div>

                {/* Details Meta */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                      {log.employee.firstName} {log.employee.lastName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.employee.employeeCode}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {log.employee.email}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '0.75rem',
                      marginTop: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Activity: </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            log.activityScore > 75
                              ? 'var(--success)'
                              : log.activityScore > 40
                              ? 'var(--secondary)'
                              : 'var(--error)',
                        }}
                      >
                        {log.activityScore}%
                      </span>
                    </div>

                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formattedDate}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {logs.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '4rem 2rem',
                color: 'var(--text-muted)',
              }}
            >
              No work screenshots captured today. Checked-in employees sharing screen frames will reflect here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
