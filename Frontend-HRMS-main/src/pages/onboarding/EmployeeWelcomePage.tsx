import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Copy, ShieldCheck, Mail, UserRound, BriefcaseBusiness, ArrowRight } from 'lucide-react'

import { onboardingApi, type OnboardingInvite } from '../../api/onboarding.api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatDate } from '../../utils/formatDate'

type ApprovalResult = Awaited<ReturnType<typeof onboardingApi.approveInvite>>

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  message: string
}

type LocationState = {
  approval?: ApprovalResult
}

export default function EmployeeWelcomePage() {
  const navigate = useNavigate()
  const { inviteId } = useParams<{ inviteId: string }>()
  const location = useLocation()
  const state = (location.state || {}) as LocationState
  const [invite, setInvite] = useState<OnboardingInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (tone: ToastTone, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, tone, title, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4200)
  }

  useEffect(() => {
    const loadInvite = async () => {
      if (!inviteId) {
        setError('Missing invite identifier.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await onboardingApi.getInviteById(inviteId)
        setInvite(data)
        setError('')
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load welcome summary.')
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [inviteId])

  const approval = state.approval
  const credentials = approval?.credentials || invite?.credentialsAudit

  const securityChecklist = useMemo(
    () => [
      'Log in and change the temporary password immediately.',
      'Keep your credentials confidential and do not share them with anyone.',
      'Review portal policies and enable extra security options when available.',
    ],
    []
  )

  if (loading) {
    return <LoadingSpinner />
  }

  if (error || !invite) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Welcome page unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'The employee summary could not be loaded.'}</p>
        <button onClick={() => navigate('/admin/onboarding')} className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Back to Approval Panel
        </button>
      </div>
    )
  }

  const loginEmail = credentials && 'loginEmail' in credentials ? credentials.loginEmail : invite.credentialsAudit?.loginEmail ?? invite.workEmail ?? invite.personalEmail
  const username = credentials && 'username' in credentials ? credentials.username : invite.credentialsAudit?.username ?? invite.username ?? loginEmail
  const employeeCode = credentials && 'employeeCode' in credentials ? credentials.employeeCode : invite.credentialsAudit?.employeeCode ?? invite.employeeId ?? 'Pending'
  const temporaryPassword = credentials && 'temporaryPassword' in credentials ? credentials.temporaryPassword : null
  const portalUrl = credentials && 'portalUrl' in credentials ? credentials.portalUrl : '/login'
  const resetRequired = invite.credentialsAudit?.passwordResetRequired ?? true

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      addToast('success', `${label} copied`, `${label} copied to clipboard.`)
    } catch {
      addToast('error', 'Copy failed', `Unable to copy ${label.toLowerCase()}.`)
    }
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '2rem' }}>
      <div className="auth-glow-sphere-1" />
      <div className="auth-glow-sphere-2" />
      <div className="auth-grid-overlay" />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1180px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-title">
            <h1>Welcome to the Company Portal</h1>
            <p>Your employee account has been created and the portal access details are ready.</p>
          </div>
          <div className="badge badge-success">Account Ready</div>
        </div>

        <div className="dashboard-grid" style={{ alignItems: 'start' }}>
          <Card>
            <CardHeader>
              <CardTitle>Welcome Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-6">
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '999px',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(16,185,129,0.1)',
                        color: 'var(--success)',
                      }}
                    >
                      <CheckCircle2 />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--success)', fontWeight: 800 }}>
                        Approval complete
                      </p>
                      <h2 style={{ marginTop: '0.35rem', fontSize: '1.4rem' }}>
                        {invite.firstName} {invite.lastName}
                      </h2>
                      <p style={{ marginTop: '0.35rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        Your employee portal access has been created. Please sign in once and change your temporary password immediately after login.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    Employee ID
                    <input value={employeeCode} readOnly />
                  </label>
                  <label>
                    Login Email
                    <input value={loginEmail} readOnly />
                  </label>
                  <label>
                    Username
                    <input value={username} readOnly />
                  </label>
                  <label>
                    Joining Date
                    <input value={formatDate(invite.joiningDate)} readOnly />
                  </label>
                  <label>
                    Department
                    <input value={invite.department} readOnly />
                  </label>
                  <label>
                    Designation
                    <input value={invite.designation} readOnly />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <Card>
              <CardHeader>
                <CardTitle>Portal Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Login Button
                    </p>
                    <div style={{ marginTop: '0.75rem' }}>
                      <Button onClick={() => navigate('/login')}>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Open Secure Login
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Temporary Password
                    </p>
                    <p style={{ marginTop: '0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {temporaryPassword || 'Shared securely by email only'}
                    </p>
                    <p style={{ marginTop: '0.4rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                      {resetRequired
                        ? 'A password reset will be required on the first sign-in.'
                        : 'Your password reset has already been completed.'}
                    </p>
                    {temporaryPassword ? (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <Button variant="outline" onClick={() => copyToClipboard(temporaryPassword, 'Temporary password')}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Password
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Security
                    </p>
                    <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.55rem', color: 'var(--text-secondary)' }}>
                      {securityChecklist.map((item) => (
                        <div key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                          <p style={{ lineHeight: 1.6 }}>{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <UserRound className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <div>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>HR Contact</p>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {invite.createdBy ? `${invite.createdBy.firstName} ${invite.createdBy.lastName}` : 'HR Team'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <Mail className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <div>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Contact Email</p>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {invite.createdBy?.email || 'hr@company.com'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-indigo-600" />
                    <div>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Role</p>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{invite.department} - {invite.designation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {approval?.credentials ? (
          <Card style={{ marginTop: '1.5rem' }}>
            <CardHeader>
              <CardTitle>Secure Credential Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="form-grid">
                <label>
                  Portal URL
                  <input value={portalUrl} readOnly />
                </label>
                <label>
                  Temporary Password
                  <input value={temporaryPassword || ''} readOnly />
                </label>
                <label>
                  Reset Requirement
                  <input value={resetRequired ? 'Required on first login' : 'Already completed'} readOnly />
                </label>
                <label>
                  Employee ID
                  <input value={employeeCode} readOnly />
                </label>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="fixed right-6 top-6 z-50 flex w-[360px] max-w-[90vw] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border bg-white p-4 shadow-2xl"
            style={{
              borderColor:
                toast.tone === 'success'
                  ? 'rgba(16,185,129,0.2)'
                  : toast.tone === 'error'
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(37,99,235,0.2)',
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  toast.tone === 'success'
                    ? 'var(--success)'
                    : toast.tone === 'error'
                    ? 'var(--error)'
                    : 'var(--primary)',
              }}
            >
              {toast.title}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{toast.message}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
