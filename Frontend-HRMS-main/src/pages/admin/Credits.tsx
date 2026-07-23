import { useEffect, useState } from 'react'
import { creditApi, CreditTransaction, CreditBalance } from '../../api/credit.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { Wallet, TrendingUp, TrendingDown, Users, UserPlus, Calendar, Info } from 'lucide-react'

export default function Credits() {
  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [balanceRes, transactionsRes] = await Promise.all([
        creditApi.getBalance(),
        creditApi.list(),
      ])
      setBalance(balanceRes.data.data)
      setTransactions(transactionsRes.data.data)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error Loading Credits</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button onClick={fetchData} className="btn-primary" style={{ marginTop: '1.5rem' }}>
          Retry
        </button>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`
  }

  return (
    <div className="credits-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Wallet</h1>
          <p>Monitor your credit balance, transaction history, and resource costs</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="balance-hero-card">
        <div className="balance-hero-left">
          <div className="balance-icon-wrapper">
            <Wallet size={32} />
          </div>
          <div>
            <p className="balance-label">Current Credit Balance</p>
            <h2 className="balance-amount">
              🪙 {balance?.balance.toLocaleString('en-IN') || 0} Credits
            </h2>
            <p className="balance-rupees">
              Equivalent to {formatCurrency(balance?.balanceInRupees || 0)}
            </p>
          </div>
        </div>
        <div className="balance-hero-right">
          <div className="balance-info-box">
            <Info size={16} />
            <span>1 Credit = ₹1 INR</span>
          </div>
          <p className="balance-company">{balance?.companyName}</p>
        </div>
      </div>

      {/* Cost Breakdown Cards */}
      <div className="cost-grid">

        <div className="cost-card">
          <div className="cost-card-header">
            <div className="cost-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
              <Users size={20} />
            </div>
            <h3>Employee Onboarding</h3>
          </div>
          <div className="cost-amount">
            {balance?.costRules.employeeCreation || 37} Credits
          </div>
          <p className="cost-desc">
            Charged when HR adds a new employee to the system
          </p>
        </div>

        <div className="cost-card">
          <div className="cost-card-header">
            <div className="cost-icon" style={{ background: '#faf5ff', color: '#7c3aed' }}>
              <Calendar size={20} />
            </div>
            <h3>Monthly Plan Costs</h3>
          </div>
          <div className="plan-costs">
            <div className="plan-cost-row">
              <span>Starter</span>
              <strong>{balance?.costRules.planMonthly.Starter || 100} cr</strong>
            </div>
            <div className="plan-cost-row">
              <span>Professional</span>
              <strong>{balance?.costRules.planMonthly.Professional || 250} cr</strong>
            </div>
            <div className="plan-cost-row">
              <span>Enterprise</span>
              <strong>{balance?.costRules.planMonthly.Enterprise || 500} cr</strong>
            </div>
            <div className="plan-cost-row">
              <span>Custom</span>
              <strong>{balance?.costRules.planMonthly.Custom || 100} cr</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="card-header-flex">
          <h2>Transaction History</h2>
          <span className="transaction-count">
            {transactions.length} {transactions.length === 1 ? 'Transaction' : 'Transactions'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            <Wallet size={48} style={{ color: '#cbd5e1' }} />
            <p>No transactions yet</p>
            <span>Credit transactions will appear here</span>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((txn) => (
              <div key={txn.id} className="transaction-row">
                <div className="transaction-icon">
                  {txn.type === 'CREDIT' ? (
                    <TrendingUp size={20} style={{ color: '#10b981' }} />
                  ) : (
                    <TrendingDown size={20} style={{ color: '#ef4444' }} />
                  )}
                </div>
                <div className="transaction-details">
                  <p className="transaction-desc">{txn.description}</p>
                  <p className="transaction-date">{formatDate(txn.createdAt)}</p>
                </div>
                <div className="transaction-amount-col">
                  <div
                    className={`transaction-amount ${
                      txn.type === 'CREDIT' ? 'credit' : 'debit'
                    }`}
                  >
                    {txn.type === 'CREDIT' ? '+' : '-'}
                    {txn.amount.toLocaleString('en-IN')} cr
                  </div>
                  <div className="transaction-balance">
                    Balance: {txn.balanceAfter.toLocaleString('en-IN')} cr
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .credits-page {
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Balance Hero Card */
        .balance-hero-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
          color: white;
          flex-wrap: wrap;
          gap: 24px;
        }

        .balance-hero-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .balance-icon-wrapper {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .balance-label {
          font-size: 0.9rem;
          opacity: 0.9;
          margin: 0 0 8px;
          font-weight: 500;
        }

        .balance-amount {
          font-size: 2.5rem;
          font-weight: 800;
          margin: 0 0 4px;
          line-height: 1;
        }

        .balance-rupees {
          font-size: 0.95rem;
          opacity: 0.85;
          margin: 0;
        }

        .balance-hero-right {
          text-align: right;
        }

        .balance-info-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 12px;
          backdrop-filter: blur(10px);
        }

        .balance-company {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          opacity: 0.95;
        }

        /* Cost Grid */
        .cost-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .cost-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.2s;
        }

        .cost-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }

        .cost-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .cost-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cost-card-header h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .cost-amount {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 8px;
        }

        .cost-desc {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .plan-costs {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .plan-cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 0.88rem;
        }

        .plan-cost-row span {
          color: #475569;
          font-weight: 500;
        }

        .plan-cost-row strong {
          color: #0f172a;
          font-weight: 700;
        }

        /* Card Header */
        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
        }

        .card-header-flex h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .transaction-count {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 600;
          background: #f8fafc;
          padding: 6px 12px;
          border-radius: 6px;
        }

        /* Empty State */
        .empty-state {
          padding: 64px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-state p {
          font-size: 1rem;
          font-weight: 600;
          color: #475569;
          margin: 0;
        }

        .empty-state span {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        /* Transaction List */
        .transaction-list {
          display: flex;
          flex-direction: column;
        }

        .transaction-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 24px;
          border-bottom: 1px solid #f8fafc;
          transition: background 0.15s;
        }

        .transaction-row:last-child {
          border-bottom: none;
        }

        .transaction-row:hover {
          background: #fafbff;
        }

        .transaction-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .transaction-details {
          flex: 1;
          min-width: 0;
        }

        .transaction-desc {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 4px;
        }

        .transaction-date {
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
        }

        .transaction-amount-col {
          text-align: right;
        }

        .transaction-amount {
          font-size: 1rem;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .transaction-amount.credit {
          color: #10b981;
        }

        .transaction-amount.debit {
          color: #ef4444;
        }

        .transaction-balance {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .balance-hero-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .balance-hero-right {
            text-align: left;
            width: 100%;
          }

          .balance-amount {
            font-size: 2rem;
          }

          .cost-grid {
            grid-template-columns: 1fr;
          }

          .transaction-row {
            flex-wrap: wrap;
          }

          .transaction-amount-col {
            width: 100%;
            text-align: left;
            margin-top: 8px;
          }
        }
      `}</style>
    </div>
  )
}
