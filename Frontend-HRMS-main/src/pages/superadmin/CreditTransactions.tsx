import { useEffect, useState } from 'react'
import { creditApi, CreditTransaction } from '../../api/credit.api'
import { superAdminApi, Company } from '../../api/superadmin.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { TrendingUp, TrendingDown, RefreshCw, Search, Filter } from 'lucide-react'

export default function CreditTransactions() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL')
  const [filterCompany, setFilterCompany] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [txRes, companyList] = await Promise.all([
        creditApi.list(),
        superAdminApi.getCompanies(),
      ])
      // txRes.data is CreditTransaction[] (axios wraps in .data)
      const txList = Array.isArray(txRes.data) ? txRes.data : (txRes.data as any)?.data ?? []
      setTransactions(txList)
      setCompanies(companyList)
    } catch {
      setError('Could not load credit transactions.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const [txRes, companyList] = await Promise.all([
        creditApi.list(),
        superAdminApi.getCompanies(),
      ])
      const txList = Array.isArray(txRes.data) ? txRes.data : (txRes.data as any)?.data ?? []
      setTransactions(txList)
      setCompanies(companyList)
    } catch {
      setError('Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Derived stats
  const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  const totalDebits  = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)
  const netFlow      = totalCredits - totalDebits

  // Filtered list
  const filtered = transactions.filter(tx => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false
    if (filterCompany !== 'ALL' && tx.tenantId !== filterCompany) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        tx.description.toLowerCase().includes(q) ||
        (tx.tenant?.name ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  if (loading) return <LoadingSpinner />

  return (
    <div className="ct-root">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Credit Transactions</h1>
          <p>Monitor every credit and debit event across all tenant companies in real time.</p>
        </div>
        <button
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--error)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* ── Summary Cards ── */}
      <div className="ct-stat-grid">
        <div className="ct-stat-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="ct-stat-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="ct-stat-label">Total Credits In</p>
            <p className="ct-stat-value" style={{ color: '#10b981' }}>+{totalCredits.toLocaleString('en-IN')} cr</p>
          </div>
        </div>

        <div className="ct-stat-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="ct-stat-icon" style={{ background: '#fff1f2', color: '#ef4444' }}>
            <TrendingDown size={22} />
          </div>
          <div>
            <p className="ct-stat-label">Total Debits Out</p>
            <p className="ct-stat-value" style={{ color: '#ef4444' }}>-{totalDebits.toLocaleString('en-IN')} cr</p>
          </div>
        </div>

        <div className="ct-stat-card" style={{ borderTop: `3px solid ${netFlow >= 0 ? '#6366f1' : '#f59e0b'}` }}>
          <div className="ct-stat-icon" style={{ background: '#eff6ff', color: '#6366f1' }}>
            🪙
          </div>
          <div>
            <p className="ct-stat-label">Net Flow</p>
            <p className="ct-stat-value" style={{ color: netFlow >= 0 ? '#6366f1' : '#f59e0b' }}>
              {netFlow >= 0 ? '+' : ''}{netFlow.toLocaleString('en-IN')} cr
            </p>
          </div>
        </div>

        <div className="ct-stat-card" style={{ borderTop: '3px solid #64748b' }}>
          <div className="ct-stat-icon" style={{ background: '#f8fafc', color: '#64748b' }}>
            📋
          </div>
          <div>
            <p className="ct-stat-label">Total Transactions</p>
            <p className="ct-stat-value" style={{ color: '#0f172a' }}>{transactions.length}</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="ct-filters">
        <div className="ct-search-wrap">
          <Search size={15} className="ct-search-icon" />
          <input
            className="ct-search"
            placeholder="Search by company or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ct-filter-group">
          <Filter size={14} style={{ color: '#64748b' }} />
          <select
            className="ct-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            <option value="CREDIT">Credits Only</option>
            <option value="DEBIT">Debits Only</option>
          </select>

          <select
            className="ct-select"
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
          >
            <option value="ALL">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <span className="ct-count">
          {filtered.length} of {transactions.length} transactions
        </span>
      </div>

      {/* ── Transaction Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>📭</p>
            <p style={{ color: '#64748b', fontWeight: 600 }}>No transactions match your filters.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Description</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                        {tx.tenant?.name ?? '—'}
                      </div>
                      {tx.tenant?.subdomain && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {tx.tenant.subdomain}.hrms.com
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: tx.type === 'CREDIT' ? '#f0fdf4' : '#fff1f2',
                          color:      tx.type === 'CREDIT' ? '#15803d' : '#be123c',
                          border:     `1px solid ${tx.type === 'CREDIT' ? '#bbf7d0' : '#fecdd3'}`,
                        }}
                      >
                        {tx.type === 'CREDIT'
                          ? <TrendingUp size={12} />
                          : <TrendingDown size={12} />}
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: tx.type === 'CREDIT' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {tx.type === 'CREDIT' ? '+' : '-'}{tx.amount.toLocaleString('en-IN')}
                        <span style={{ fontSize: '0.72rem', fontWeight: 500, marginLeft: 3, color: '#94a3b8' }}>cr</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        🪙 {tx.balanceAfter.toLocaleString('en-IN')}
                        <span style={{ fontSize: '0.72rem', fontWeight: 500, marginLeft: 3, color: '#94a3b8' }}>cr</span>
                      </span>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                        {tx.description}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#64748b' }}>
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Styles ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .ct-root { font-family: 'Inter', system-ui, sans-serif; }

        /* Stat grid */
        .ct-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .ct-stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          border: 1px solid #f1f5f9;
        }
        .ct-stat-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .ct-stat-label {
          font-size: 0.75rem; font-weight: 600;
          color: #64748b; margin: 0 0 4px;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .ct-stat-value {
          font-size: 1.4rem; font-weight: 800;
          margin: 0; line-height: 1;
        }

        /* Filters bar */
        .ct-filters {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .ct-search-wrap {
          position: relative;
          flex: 1;
          min-width: 220px;
        }
        .ct-search-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .ct-search {
          width: 100%;
          padding: 9px 12px 9px 36px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          outline: none;
          background: white;
          box-sizing: border-box;
        }
        .ct-search:focus { border-color: #6366f1; }

        .ct-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ct-select {
          padding: 9px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
          outline: none;
          cursor: pointer;
          color: #334155;
        }
        .ct-select:focus { border-color: #6366f1; }

        .ct-count {
          font-size: 0.8rem;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .ct-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .ct-stat-grid { grid-template-columns: 1fr; }
          .ct-filters { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  )
}
