import { useEffect, useState } from 'react'
import { creditApi } from '../../api/credit.api'
import { superAdminApi, Company } from '../../api/superadmin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

type Transaction = {
  id: string
  tenantId: string
  type: 'CREDIT' | 'DEBIT'
  amount: number
  description: string
  balanceAfter: number
  createdAt: string
  tenant?: {
    name: string
    subdomain: string
  }
}

export default function CreditManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const txResponse = await creditApi.list()
      setTransactions(txResponse.data.data)
    } catch {
      setError('Could not retrieve transaction history.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])



  if (loading) return <LoadingSpinner />

  return (
    <div>
      <div className="page-header">
        <div className="page-header-title">
          <h1>SaaS Credit Command</h1>
          <p>Award operational resources and monitor transactional ledgers across tenants.</p>
        </div>


      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)' }}>
          {error}
        </div>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          {/* Recent Transactions Ledger */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>System-Wide Transaction Log</h2>
            
            <div className="table-container" style={{ marginTop: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Tenant Company</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {tx.tenant?.name || 'Unknown Company'}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {tx.tenant?.subdomain}.hrms.com
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${tx.type === 'CREDIT' ? 'badge-success' : 'badge-danger'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: tx.type === 'CREDIT' ? 'var(--success)' : 'var(--error)' }}>
                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 500 }}>🪙 {tx.balanceAfter.toLocaleString()}</td>
                      <td>{tx.description}</td>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No transactions logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
