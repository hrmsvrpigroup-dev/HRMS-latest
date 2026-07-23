import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Search, Eye, Download, CheckCircle2, XCircle, FileText, Clock3 } from 'lucide-react'

import { onboardingApi, type OnboardingDocument, type OnboardingInvite } from '../../api/onboarding.api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatDate } from '../../utils/formatDate'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  message: string
}

type InviteFilter = 'review' | 'closed' | 'all'

const isReviewReady = (status: string) => ['submitted', 'under_review', 'verified'].includes(status)

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
  if (filter === 'closed') return invites.filter((invite) => ['approved', 'rejected', 'expired'].includes(invite.status))
  return invites.filter((invite) => isReviewReady(invite.status))
}

const fileIconLabel = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.includes('pdf')) return 'PDF'
  return 'File'
}

export default function HRVerificationPanel() {
  const [invites, setInvites] = useState<OnboardingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null)
  const [filter, setFilter] = useState<InviteFilter>('review')
  const [searchTerm, setSearchTerm] = useState('')
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [previewDocument, setPreviewDocument] = useState<OnboardingDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
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
      setError(err.response?.data?.message || 'Failed to load onboarding verification queue.')
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

  const reviewDocument = async (document: OnboardingDocument, decision: 'approved' | 'rejected') => {
    if (!selectedInvite) return

    try {
      setLoading(true)
      await onboardingApi.reviewDocument(selectedInvite.id, document.id, decision, commentDrafts[document.id]?.trim() || undefined)
      addToast('success', 'Document updated', `${document.documentType} marked as ${decision}.`)
      setCommentDrafts((prev) => ({ ...prev, [document.id]: '' }))
      await loadInvites()
    } catch (err: any) {
      addToast('error', 'Review failed', err.response?.data?.message || 'Unable to update document review.')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const reviewQueue = invites.filter((invite) => isReviewReady(invite.status)).length
    const verified = invites.filter((invite) => invite.status === 'verified').length
    const rejected = invites.filter((invite) => invite.status === 'rejected').length
    const approved = invites.filter((invite) => invite.status === 'approved').length
    return { reviewQueue, verified, rejected, approved }
  }, [invites])

  if (loading && !invites.length) {
    return <LoadingSpinner />
  }

  if (error && !invites.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Verification panel unavailable</h2>
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
          <h1>HR Verification Panel</h1>
          <p>Review candidate submissions, preview files, and capture verification comments.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={loadInvites}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Review Queue</span>
            <span className="stat-value">{stats.reviewQueue}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--primary)' }}>
            <Clock3 />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Verified</span>
            <span className="stat-value">{stats.verified}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--success)' }}>
            <CheckCircle2 />
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
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Approved</span>
            <span className="stat-value">{stats.approved}</span>
          </div>
          <div className="stat-icon" style={{ color: 'var(--secondary)' }}>
            <FileText />
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ alignItems: 'start' }}>
        <Card>
          <CardHeader>
            <CardTitle>Candidate Queue</CardTitle>
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
                    placeholder="Search by name, email, department, or role"
                    className="pl-10"
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {(['review', 'closed', 'all'] as InviteFilter[]).map((option) => (
                <Button
                  key={option}
                  variant={filter === option ? 'default' : 'outline'}
                  onClick={() => setFilter(option)}
                >
                  {option === 'review' ? 'Needs Review' : option === 'closed' ? 'Closed' : 'All Invites'}
                </Button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              {filteredInvites.map((invite) => (
                <button
                  key={invite.id}
                  onClick={() => {
                    setSelectedInviteId(invite.id)
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
                    <span className="badge badge-info">{invite.verifications?.length || 0} Reviews</span>
                    <span className="badge badge-info">{formatDate(invite.joiningDate)}</span>
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
              <CardTitle>Verification Details</CardTitle>
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
                      Submitted On
                      <Input value={selectedInvite.submittedAt ? formatDate(selectedInvite.submittedAt) : 'Pending'} readOnly />
                    </label>
                    <label>
                      Submitted By
                      <Input
                        value={selectedInvite.createdBy ? `${selectedInvite.createdBy.firstName} ${selectedInvite.createdBy.lastName}` : 'System'}
                        readOnly
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>
                      Documents
                    </p>
                    {selectedInvite.documents?.map((document) => {
                      const reviewed = document.status !== 'pending'
                      return (
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
                                {document.originalName} - {fileIconLabel(document.mimeType)} - {(document.fileSize / 1024 / 1024).toFixed(2)} MB
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

                          {reviewed ? (
                            <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(148,163,184,0.12)', paddingTop: '0.85rem' }}>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Reviewed by {document.reviewedBy ? `${document.reviewedBy.firstName} ${document.reviewedBy.lastName}` : 'HR'} on{' '}
                                {document.reviewedAt ? formatDate(document.reviewedAt) : 'N/A'}
                              </p>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                {document.reviewComment || 'No comments added.'}
                              </p>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(148,163,184,0.12)', paddingTop: '0.85rem', display: 'grid', gap: '0.75rem' }}>
                              <label>
                                Verification Comment
                                <textarea
                                  rows={3}
                                  value={commentDrafts[document.id] || ''}
                                  onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [document.id]: e.target.value }))}
                                  placeholder="Add a verification note for this document"
                                />
                              </label>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <Button onClick={() => reviewDocument(document, 'approved')}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button variant="outline" onClick={() => reviewDocument(document, 'rejected')}>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                  Select a candidate to review documents and add verification notes.
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
                    <Button variant="outline" onClick={() => {
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl)
                      }
                      setPreviewUrl(null)
                      setPreviewDocument(null)
                    }}>
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
                  Preview a document from the verification card to inspect its contents here.
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
