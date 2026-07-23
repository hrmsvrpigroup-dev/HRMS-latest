import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi, Company } from '../../api/superadmin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

export default function PendingRegistrations() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const data = await superAdminApi.getCompanies()
      // Filter out only pending companies
      const pending = data.filter((c) => c.status === 'PENDING')
      setCompanies(pending)
    } catch {
      setError('Could not retrieve enquiries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const handleApprove = async (company: Company) => {
    try {
      await superAdminApi.toggleCompanyStatus(company.id, 'ACTIVE')
      setCompanies((prev) => prev.filter((c) => c.id !== company.id))
      navigate('/superadmin/companies/add')
    } catch {
      alert('Could not approve company.')
    }
  }

  const handleReject = async (company: Company) => {
    if (!window.confirm('Are you sure you want to reject this enquiry?')) return
    try {
      await superAdminApi.toggleCompanyStatus(company.id, 'REJECTED')
      setCompanies((prev) => prev.filter((c) => c.id !== company.id))
    } catch {
      alert('Could not reject company.')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="page-header">
        <div className="page-header-title">
          <h1>Enquire Follow Up</h1>
          <p>Manage and follow up on new enquiries and company sign-ups.</p>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
          {error}
        </div>
      ) : (
        <div className="card table-container">
          {companies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No new enquiries at the moment.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Enquired Person Details</th>
                  <th>Documents</th>
                  <th>Enquiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const adminUser = company.users?.[0]
                  const hasDocs = company.registrationDocs && company.registrationDocs.length > 0
                  const docDataUrl = hasDocs ? company.registrationDocs![0] : ''
                  
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
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <select
                            className="input-field"
                            style={{ padding: '0.25rem 0.5rem', width: 'auto', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.85rem' }}
                            defaultValue={hasDocs ? "RECEIVED" : "NOT_RECEIVED"}
                          >
                            <option value="NOT_RECEIVED">Not Received</option>
                            <option value="RECEIVED">Received</option>
                          </select>
                          {hasDocs && (
                            <a 
                              href={docDataUrl} 
                              download={`${company.subdomain}_document`}
                              target="_blank" 
                              rel="noreferrer"
                              className="badge badge-info" 
                              style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
                            >
                              📄 View File
                            </a>
                          )}
                        </div>
                      </td>
                      <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                      <td>
                        <select
                          value={company.status === 'ACTIVE' ? 'ACCEPTED' : company.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            let apiStatus = newStatus;
                            if (newStatus === 'ACCEPTED') apiStatus = 'ACTIVE';

                            if (newStatus === 'REJECTED') {
                              if (!window.confirm('Are you sure you want to reject this enquiry?')) return;
                            } else if (newStatus === 'ACCEPTED') {
                              if (!window.confirm('Are you sure you want to accept this enquiry?')) return;
                            }

                            superAdminApi.toggleCompanyStatus(company.id, apiStatus)
                              .then(() => {
                                if (apiStatus !== 'PENDING') {
                                  setCompanies((prev) => prev.filter((c) => c.id !== company.id));
                                } else {
                                  setCompanies((prev) => prev.map(c => c.id === company.id ? { ...c, status: apiStatus } : c));
                                }
                                if (apiStatus === 'ACTIVE') {
                                  navigate('/superadmin/companies/add');
                                }
                              })
                              .catch(() => alert(`Could not change status to ${newStatus}.`));
                          }}
                          className="input-field"
                          style={{ padding: '0.25rem 0.5rem', width: 'auto', minWidth: '100px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
