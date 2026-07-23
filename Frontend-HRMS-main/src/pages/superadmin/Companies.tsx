import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi, Company } from '../../api/superadmin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { triggerHrNotification } from '../../utils/notif'

export default function Companies() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Quick Credit State
  const [selectedCompanyForCredits, setSelectedCompanyForCredits] = useState<Company | null>(null)
  const [creditAmount, setCreditAmount] = useState(5000)
  const [creditDescription, setCreditDescription] = useState('Super Admin top-up')
  const [creditSubmitting, setCreditSubmitting] = useState(false)

  // Delete Confirmation State
  const [selectedCompanyForDelete, setSelectedCompanyForDelete] = useState<Company | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Document Request State
  const [documentRequestLoading, setDocumentRequestLoading] = useState<string | null>(null)

  // Resend Credentials State
  const [resendCredsLoading, setResendCredsLoading] = useState<string | null>(null)

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const data = await superAdminApi.getCompanies()
      setCompanies(data)
    } catch {
      setError('Could not retrieve company listings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const handleStatusChange = async (company: Company, newStatus: string) => {
    try {
      const updated = await superAdminApi.toggleCompanyStatus(company.id, newStatus)
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, status: updated.status } : c)))
    } catch {
      alert('Could not update company status.')
    }
  }



  const handleCreditSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCompanyForCredits) return
    setCreditSubmitting(true)

    try {
      const updated = await superAdminApi.addCredits(
        selectedCompanyForCredits.id,
        creditAmount,
        creditDescription
      )
      setCompanies((prev) =>
        prev.map((c) => (c.id === selectedCompanyForCredits.id ? { ...c, credits: updated.credits } : c))
      )
      triggerHrNotification(`Super Admin granted ${creditAmount} credits to ${selectedCompanyForCredits.name}.`)
      setSelectedCompanyForCredits(null)
      setCreditAmount(5000)
      setCreditDescription('Super Admin top-up')
    } catch {
      alert('Failed to award credits.')
    } finally {
      setCreditSubmitting(false)
    }
  }

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    setSelectedCompanyForDelete(companies.find((c) => c.id === companyId) || null)
    setDeletePassword('')
    setDeleteError('')
  }

  const handleDeleteConfirm = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCompanyForDelete) return

    setDeleteSubmitting(true)
    setDeleteError('')

    try {
      await superAdminApi.deleteCompany(selectedCompanyForDelete.id, deletePassword)
      setCompanies((prev) => prev.filter((c) => c.id !== selectedCompanyForDelete.id))
      setSelectedCompanyForDelete(null)
      setDeletePassword('')
      alert(`Company "${selectedCompanyForDelete.name}" and all associated data has been permanently deleted.`)
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete company. Please check your password and try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleDownloadInvoice = async (companyId: string, companyName: string) => {
    try {
      const blob = await superAdminApi.downloadInvoice(companyId)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Invoice_${companyName.replace(/\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      alert('Failed to download invoice. It might not exist yet.')
    }
  }

  const handleDocumentRequest = async (companyId: string, companyName: string) => {
    if (!confirm(`Send document request email to ${companyName}?`)) return

    try {
      setDocumentRequestLoading(companyId)
      const response = await superAdminApi.sendDocumentRequest(companyId)
      alert(response.message || 'Document request email sent successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send document request email.')
    } finally {
      setDocumentRequestLoading(null)
    }
  }

  const handleResendCredentials = async (companyId: string, companyName: string) => {
    if (!confirm(`Are you sure you want to regenerate and resend credentials to the admin of ${companyName}? This will reset their current password.`)) return

    try {
      setResendCredsLoading(companyId)
      const response = await superAdminApi.resendCredentials(companyId)
      alert(response.message || 'Credentials resent successfully!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resend credentials.')
    } finally {
      setResendCredsLoading(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Company Roster</h1>
          <p>Register, monitor status, and allocate SaaS resource credits to tenants.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/superadmin/companies/add')}>
          + Create Company
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
                <th>Company Name</th>
                <th>Admin Details</th>
                <th>Credits Balance</th>
                <th>Status</th>
                <th>Registered Date</th>
                <th>Document Request</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const adminUser = company.users?.[0]
                return (
                  <tr key={company.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{company.name}</td>
                    <td>
                      {adminUser ? (
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                            {adminUser.firstName} {adminUser.lastName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {adminUser.email}
                          </div>
                          {adminUser.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              📞 {adminUser.phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Admin</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      🪙 {company.credits.toLocaleString()}
                    </td>
                    <td>
                      <select
                        value={company.status}
                        onChange={(e) => handleStatusChange(company, e.target.value)}
                        style={{
                          display: 'inline-block',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          cursor: 'pointer',
                          padding: '0.4rem 1.75rem 0.4rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          borderRadius: '9999px',
                          outline: 'none',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          minWidth: '120px',
                          backgroundColor:
                            company.status === 'ACTIVE'
                              ? 'rgba(16, 185, 129, 0.08)'
                              : company.status === 'SUSPENDED'
                              ? 'rgba(239, 68, 68, 0.08)'
                              : 'rgba(245, 158, 11, 0.08)',
                          color:
                            company.status === 'ACTIVE'
                              ? 'var(--success)'
                              : company.status === 'SUSPENDED'
                              ? 'var(--error)'
                              : 'var(--warning)',
                          transition: 'var(--transition)',
                        }}
                      >
                        <option value="ACTIVE" style={{ color: 'var(--success)', backgroundColor: '#fff', fontWeight: '600' }}>Approve</option>
                        <option value="SUSPENDED" style={{ color: 'var(--error)', backgroundColor: '#fff', fontWeight: '600' }}>Suspend</option>
                        <option value="PENDING" style={{ color: 'var(--warning)', backgroundColor: '#fff', fontWeight: '600' }}>Pending</option>
                      </select>
                    </td>
                    <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      {company.registrationDocs && company.registrationDocs.length > 0 ? (
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            borderColor: '#86efac',
                            fontWeight: 600,
                          }}
                          disabled
                        >
                          ✅ Received
                        </button>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.85rem',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderColor: '#fcd34d',
                            fontWeight: 600,
                          }}
                          onClick={() => handleDocumentRequest(company.id, company.name)}
                          disabled={documentRequestLoading === company.id}
                        >
                          {documentRequestLoading === company.id ? '📤 Sending...' : '📄 Request'}
                        </button>
                      )}
                    </td>
                    <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderColor: 'rgba(79, 70, 229, 0.2)' }}
                        onClick={() => navigate(`/superadmin/companies/edit/${company.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}
                        onClick={() => handleResendCredentials(company.id, company.name)}
                        disabled={resendCredsLoading === company.id}
                      >
                        {resendCredsLoading === company.id ? 'Sending...' : 'Resend Credentials'}
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => setSelectedCompanyForCredits(company)}
                      >
                        Grant Credits
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', borderColor: 'rgba(79, 70, 229, 0.2)' }}
                        onClick={() => handleDownloadInvoice(company.id, company.name)}
                      >
                        Download Invoice
                      </button>
                      <button
                        className="btn-secondary"
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--error)',
                          borderColor: 'rgba(239, 68, 68, 0.2)',
                        }}
                        onClick={() => handleDeleteCompany(company.id, company.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Password Confirmation on Delete */}
      {selectedCompanyForDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', color: 'var(--error)' }}>Confirm Deletion</h2>
              <button
                onClick={() => setSelectedCompanyForDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              You are about to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{selectedCompanyForDelete.name}</strong>. This action will delete ALL associated data including users, employees, leave requests, logs, and transactions. This action CANNOT be undone.
            </p>

            <p style={{ fontSize: '0.9rem', color: 'var(--error)', fontWeight: 600 }}>
              ⚠️ Please enter your Super Admin password to confirm this destructive action.
            </p>

            <form onSubmit={handleDeleteConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label>
                Super Admin Password
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </label>

              {deleteError && <p style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{deleteError}</p>}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, backgroundColor: 'var(--error)', borderColor: 'var(--error)' }}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCompanyForDelete(null)}
                  disabled={deleteSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Allocating Credits */}
      {selectedCompanyForCredits && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>Grant Resource Credits</h2>
              <button
                onClick={() => setSelectedCompanyForCredits(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Add credits to <strong style={{ color: 'var(--text-primary)' }}>{selectedCompanyForCredits.name}</strong>. Their current balance is 🪙 {selectedCompanyForCredits.credits.toLocaleString()}.
            </p>

            <form onSubmit={handleCreditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label>
                Credit Amount
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(Number(event.target.value))}
                  required
                />
              </label>

              <label>
                Description / Memo
                <input
                  type="text"
                  placeholder="e.g., Enterprise upgrade bonus"
                  value={creditDescription}
                  onChange={(event) => setCreditDescription(event.target.value)}
                  required
                />
              </label>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={creditSubmitting}>
                  {creditSubmitting ? 'Granting...' : 'Confirm Allocation'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCompanyForCredits(null)}
                  disabled={creditSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}    </div>
  )
}
