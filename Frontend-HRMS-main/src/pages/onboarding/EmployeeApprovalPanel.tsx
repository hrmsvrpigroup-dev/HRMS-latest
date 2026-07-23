import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Download,
  Eye,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
  FileText,
} from 'lucide-react'

import { onboardingApi, type OnboardingDocument, type OnboardingInvite } from '../../api/onboarding.api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  message: string
}

type InviteFilter = 'ready' | 'approved' | 'all'

type ApprovalResult = Awaited<ReturnType<typeof onboardingApi.approveInvite>>

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return 'badge-success'
    case 'approved':
      return 'badge-info'
    case 'rejected':
    case 'expired':
      return 'badge-danger'
    case 'under_review':
    case 'submitted':
      return 'badge-warning'
    default:
      return 'badge-info'
  }
}

const filterInvites = (invites: OnboardingInvite[], filter: InviteFilter) => {
  if (filter === 'all') return invites
  if (filter === 'approved') return invites.filter((invite) => invite.status === 'approved')
  return invites.filter((invite) => invite.status === 'verified')
}

export default function EmployeeApprovalPanel() {
  const navigate = useNavigate()
  const [invites, setInvites] = useState<OnboardingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<InviteFilter>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewDocument, setPreviewDocument] = useState<OnboardingDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (tone: ToastTone, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, tone, title, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4200)
  }

  const loadInvites = async () => {
    try {
      setLoading(true)
      const data = await onboardingApi.listInvites()
      setInvites(data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employee approval queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvites()
  }, [])

  const filteredInvites = useMemo(() => {
    const scoped = filterInvites(invites, filter)
    if (!searchTerm.trim()) return scoped
    const term = searchTerm.toLowerCase().trim()
    return scoped.filter(
      (invite) =>
        `${invite.firstName} ${invite.lastName}`.toLowerCase().includes(term) ||
        invite.personalEmail.toLowerCase().includes(term) ||
        invite.department.toLowerCase().includes(term) ||
        invite.designation.toLowerCase().includes(term)
    )
  }, [filter, invites, searchTerm])

  useEffect(() => {
    if (!filteredInvites.length) {
      setSelectedInviteId(null)
      return
    }
    if (!selectedInviteId || !filteredInvites.some((invite) => invite.id === selectedInviteId)) {
      setSelectedInviteId(filteredInvites[0].id)
    }
  }, [filteredInvites, selectedInviteId])

  const selectedInvite = filteredInvites.find((invite) => invite.id === selectedInviteId) || null

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const openPreview = async (document: OnboardingDocument) => {
    try {
      setPreviewLoading(true)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      const blob = await onboardingApi.downloadDocument(document.id, false)
      const nextUrl = URL.createObjectURL(blob)
      setPreviewDocument(document)
      setPreviewUrl(nextUrl)
    } catch (err: any) {
      addToast('error', 'Preview failed', err.response?.data?.message || 'Unable to preview document.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const downloadFile = async (doc: OnboardingDocument) => {
    try {
      const blob = await onboardingApi.downloadDocument(doc.id, true)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = doc.originalName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      addToast('success', 'Download started', `${doc.originalName} is downloading.`)
    } catch (err: any) {
      addToast('error', 'Download failed', err.response?.data?.message || 'Unable to download document.')
    }
  }

  const approveInvite = async () => {
    if (!selectedInvite) return

    try {
      setApprovingId(selectedInvite.id)
      const result = await onboardingApi.approveInvite(selectedInvite.id)
      setApprovalResult(result)
      addToast('success', 'Onboarding approved', `${selectedInvite.firstName} ${selectedInvite.lastName} now has employee access.`)
      await loadInvites()
      navigate(`/admin/onboarding/welcome/${selectedInvite.id}`, { state: { approval: result } })
    } catch (err: any) {
      addToast('error', 'Approval failed', err.response?.data?.message || 'Unable to approve the onboarding request.')
    } finally {
      setApprovingId(null)
    }
  }

  const stats = useMemo(() => {
    const ready = invites.filter((invite) => invite.status === 'verified').length
    const approved = invites.filter((invite) => invite.status === 'approved').length
    const pending = invites.filter((invite) => ['submitted', 'under_review'].includes(invite.status)).length
    const rejected = invites.filter((invite) => invite.status === 'rejected').length
    return { ready, approved, pending, rejected }
  }, [invites])

  if (loading && !invites.length) {
    return <LoadingSpinner />
  }

  if (error && !invites.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Approval panel unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={loadInvites} className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Employee Approval Panel</h1>
          <p>Review HR verification, activate accounts, and deliver secure welcome credentials.</p>
        </div>
        <Button variant="outline" onClick={loadInvites}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Ready For Approval</span>
            <span className="stat-value">{stats.ready}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--success)' }}>
            <ShieldCheck />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Approved</span>
            <span className="stat-value">{stats.approved}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--primary)' }}>
            <CheckCircle2 />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Pending HR</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--warning)' }}>
            <Users />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Rejected</span>
            <span className="stat-value">{stats.rejected}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--error)' }}>
            <XCircle />
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="form-grid" style={{ marginBottom: '1rem' }}>
              <label style={{ gridColumn: '1 / -1' }}>
                Search
                <div style={{ position: 'relative' }}>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by candidate, department, or role"
                    className="pl-10"
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(['ready', 'approved', 'all'] as InviteFilter[]).map((option) => (
                <Button key={option} variant={filter === option ? 'default' : 'outline'} onClick={() => setFilter(option)}>
                  {option === 'ready' ? 'Ready to Approve' : option === 'approved' ? 'Approved' : 'All Invites'}
                </Button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {filteredInvites.map((invite) => (
                <button
                  key={invite.id}
                  onClick={() => {
                    setSelectedInviteId(invite.id)
                    setApprovalResult(null)
                    setPreviewDocument(null)
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl)
                      setPreviewUrl(null)
                    }
                  }}
                  style={{
                    textAlign: 'left',
                    border: invite.id === selectedInviteId ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(148,163,184,0.15)',
                    background: invite.id === selectedInviteId ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.7)',
                    borderRadius: '1rem',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'start' }}>
                    <div>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {invite.firstName} {invite.lastName}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{invite.personalEmail}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        {invite.department} - {invite.designation}
                      </p>
                    </div>
                    <span className={`badge ${getStatusBadge(invite.status)}`}>{invite.status}</span>
                  </div>
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{invite.documents?.length || 0} Docs</span>
                    <span className="badge badge-info">{formatDate(invite.joiningDate)}</span>
                    <span className="badge badge-info">{formatCurrency(invite.baseSalary)}</span>
                  </div>
                </button>
              ))}

              {!filteredInvites.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                  No onboarding invites match the current filter.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Employee Approval Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedInvite ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-grid">
                    <label>
                      Candidate
                      <Input value={`${selectedInvite.firstName} ${selectedInvite.lastName}`} readOnly />
                    </label>
                    <label>
                      Status
                      <Input value={selectedInvite.status} readOnly />
                    </label>
                    <label>
                      Reporting Contact
                      <Input
                        value={selectedInvite.createdBy ? `${selectedInvite.createdBy.firstName} ${selectedInvite.createdBy.lastName}` : 'System'}
                        readOnly
                      />
                    </label>
                    <label>
                      Submitted At
                      <Input value={selectedInvite.submittedAt ? formatDate(selectedInvite.submittedAt) : 'Pending'} readOnly />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      Department
                      <Input value={selectedInvite.department} readOnly />
                    </label>
                    <label>
                      Designation
                      <Input value={selectedInvite.designation} readOnly />
                    </label>
                    <label>
                      Joining Date
                      <Input value={formatDate(selectedInvite.joiningDate)} readOnly />
                    </label>
                    <label>
                      Base Salary
                      <Input value={formatCurrency(selectedInvite.baseSalary)} readOnly />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Document Summary
                    </p>
                    {selectedInvite.documents?.map((document) => (
                      <div
                        key={document.id}
                        style={{
                          border: '1px solid rgba(148,163,184,0.16)',
                          borderRadius: '1rem',
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.7)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'start' }}>
                          <div>
                            <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{document.documentType}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {document.originalName}
                            </p>
                          </div>
                          <span className={`badge ${getStatusBadge(document.status)}`}>{document.status}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                          <Button variant="outline" onClick={() => openPreview(document)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                          <Button variant="outline" onClick={() => downloadFile(document)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Approval Outcome
                    </p>
                    {selectedInvite.status === 'verified' ? (
                      <Button onClick={approveInvite} disabled={approvingId === selectedInvite.id}>
                        {approvingId === selectedInvite.id ? 'Approving...' : 'Approve Employee Onboarding'}
                      </Button>
                    ) : selectedInvite.status === 'approved' ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                        <p style={{ fontWeight: 800, color: 'var(--success)' }}>Employee already approved</p>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          Employee portal access and welcome email were already generated for this invitation.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                        <p style={{ fontWeight: 800, color: 'var(--warning)' }}>Waiting for HR verification</p>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          Final admin approval is available only after all documents are verified.
                        </p>
                      </div>
                    )}
                  </div>

                  {approvalResult ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Latest Approval Payload</p>
                      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <p>Employee Code: {approvalResult.credentials.employeeCode}</p>
                        <p>Login Email: {approvalResult.credentials.loginEmail}</p>
                        <p>Username: {approvalResult.credentials.username}</p>
                        <p>Temporary Password: {approvalResult.credentials.temporaryPassword}</p>
                        <p>Portal URL: {approvalResult.credentials.portalUrl}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                  Select a verified invite to activate the employee account.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                  Loading preview...
                </div>
              ) : previewDocument && previewUrl ? (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{previewDocument.documentType}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{previewDocument.originalName}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (previewUrl) {
                          URL.revokeObjectURL(previewUrl)
                        }
                        setPreviewUrl(null)
                        setPreviewDocument(null)
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  {previewDocument.mimeType.startsWith('image/') ? (
                    <img src={previewUrl} alt={previewDocument.originalName} style={{ width: '100%', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.15)' }} />
                  ) : (
                    <iframe
                      src={previewUrl}
                      title={previewDocument.originalName}
                      style={{ width: '100%', height: '420px', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '1rem' }}
                    />
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                  Preview a document from the approval card to inspect its contents here.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
    </div>
  )
}
