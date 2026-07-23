import React, { useState, useEffect } from 'react'
import { paymentApi } from '../../api/payment.api'
import { creditApi } from '../../api/credit.api'
import { useAuthStore } from '../../store/auth.store'
import { triggerHrNotification } from '../../utils/notif'

export default function Wallet() {
  const [creditsToBuy, setCreditsToBuy] = useState<number>(1000)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [gateway, setGateway] = useState<'razorpay' | 'phonepe'>('razorpay')
  const user = useAuthStore((state) => state.user)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await creditApi.getBalance()
        // Axios returns response.data, and our backend returns { success: true, data: { balance: ... } }
        setBalance(res.data.data.balance ?? 0)
      } catch (err) {
        console.error('Failed to fetch balance', err)
      }
    }
    fetchBalance()
  }, [])

  // Simulation Modal state
  const [showSimModal, setShowSimModal] = useState(false)
  const [simGateway, setSimGateway] = useState<'razorpay' | 'phonepe'>('razorpay')
  const [simStep, setSimStep] = useState<'SELECT' | 'PAYING' | 'SUCCESS' | 'FAILED'>('SELECT')
  const [simMethod, setSimMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI')
  const [upiId, setUpiId] = useState('sandeep@upi')
  const [pendingOrder, setPendingOrder] = useState<any>(null)

  // Load Razorpay Script dynamically
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Check URL query parameters for PhonePe redirect callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gw = params.get('gateway')
    const txnId = params.get('txnId')
    const credits = params.get('credits')

    if (gw === 'phonepe' && txnId && credits) {
      const verifyPhonePe = async () => {
        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')
        try {
          await paymentApi.verifyPhonePePayment(txnId, Number(credits))
          setSuccessMsg(`Successfully added ${credits} credits via PhonePe!`)
          triggerHrNotification(`Super Admin purchased ${credits} credits via PhonePe.`)
        } catch (err: any) {
          setErrorMsg(err.response?.data?.message || 'PhonePe payment verification failed.')
        } finally {
          setLoading(false)
          // Clean up the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }
      verifyPhonePe()
    }
  }, [])

  const handlePayment = async () => {
    if (creditsToBuy < 1) {
      setErrorMsg('Please enter a valid credit amount.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      if (gateway === 'razorpay') {
        // 1. Create Razorpay order
        const order = await paymentApi.createOrder(creditsToBuy)

        // Check if backend returned a mock order
        if (order.isMock) {
          setPendingOrder(order)
          setSimGateway('razorpay')
          setSimStep('SELECT')
          setShowSimModal(true)
          setLoading(false)
          return
        }

        // 2. Setup Razorpay options (if keys exist)
        const options = {
          key: order.key || 'rzp_test_YourTestKeyHere',
          amount: order.amount,
          currency: order.currency,
          name: 'HRMS Platform',
          description: `Purchase of ${creditsToBuy} Credits`,
          order_id: order.orderId,
          handler: async function (response: any) {
            try {
              setLoading(true)
              await paymentApi.verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
                creditsToBuy
              )
              setSuccessMsg(`Successfully added ${creditsToBuy} credits to your account!`)
              triggerHrNotification(`Super Admin purchased ${creditsToBuy} credits via Razorpay.`)
            } catch (err: any) {
              setErrorMsg(err.response?.data?.message || 'Payment verification failed.')
            } finally {
              setLoading(false)
            }
          },
          prefill: {
            name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Company Admin',
            email: user?.email || '',
          },
          theme: {
            color: '#2563eb',
          },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.on('payment.failed', function (response: any) {
          setErrorMsg(`Payment failed: ${response.error.description}`)
          setLoading(false)
        })
        rzp.open()
      } else {
        // 1. Create PhonePe order
        const order = await paymentApi.createPhonePeOrder(creditsToBuy)

        if (order.isMock) {
          setPendingOrder(order)
          setSimGateway('phonepe')
          setSimStep('SELECT')
          setShowSimModal(true)
          setLoading(false)
          return
        }

        // 2. Redirect to PhonePe payment URL
        window.location.href = order.redirectUrl
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to initiate payment.')
      setLoading(false)
    }
  }

  const triggerSimulatedPayment = async (status: 'SUCCESS' | 'FAILED') => {
    setSimStep('PAYING')
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (status === 'SUCCESS') {
      try {
        if (simGateway === 'razorpay') {
          const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(7)}`
          const mockSignature = `sig_mock_${Math.random().toString(36).substring(7)}`
          
          await paymentApi.verifyPayment(
            pendingOrder.orderId,
            mockPaymentId,
            mockSignature,
            creditsToBuy
          )
          setSuccessMsg(`Successfully added ${creditsToBuy} credits to your account (Simulated Razorpay)!`)
          triggerHrNotification(`Super Admin purchased ${creditsToBuy} credits via Simulated Razorpay.`)
          setSimStep('SUCCESS')
          setTimeout(() => {
            setShowSimModal(false)
          }, 1500)
        } else {
          // PhonePe Simulation: Redirect to the simulation redirect URL returned from backend
          // which contains the verification params
          window.location.href = pendingOrder.redirectUrl
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Simulated payment verification failed.')
        setSimStep('FAILED')
      }
    } else {
      setErrorMsg('Payment simulation cancelled or failed.')
      setSimStep('FAILED')
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-title">
          <h1>Wallet</h1>
          <p>Recharge your account credits in real-time.</p>
        </div>
        {balance !== null && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            minWidth: '200px'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600, marginBottom: '0.25rem' }}>
              Available Limit
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#166534' }}>
              🪙 {balance.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Buy Credits Card */}
        <div className="card" style={{ flex: '1 1 400px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Buy Credits</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>1 Credit = ₹1.00 INR</p>


          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Number of Credits
            </label>
            <input
              type="number"
              className="no-icon"
              value={creditsToBuy}
              onChange={(e) => setCreditsToBuy(Number(e.target.value))}
              min="1"
              style={{ 
                width: '100%', 
                padding: '0.5rem 0.75rem', 
                fontSize: '1rem', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '1rem', 
            borderRadius: '10px', 
            marginBottom: '1rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>Credits</span>
              <span>{creditsToBuy.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>Price per Credit</span>
              <span>₹1.00</span>
            </div>
            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              <span>Total Amount</span>
              <span>₹{creditsToBuy.toLocaleString()}</span>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.75rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {successMsg}
            </div>
          )}

          <button 
            className="submit-btn-dark" 
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              fontSize: '1rem',
              background: 'var(--text-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '700'
            }}
            onClick={handlePayment}
            disabled={loading || creditsToBuy < 1}
          >
            {loading ? 'Processing...' : `Pay ₹${creditsToBuy.toLocaleString()}`}
          </button>
        </div>

        {/* Info Card */}
        <div className="card" style={{ flex: '1 1 300px', padding: '1.5rem', background: 'linear-gradient(145deg, #1e293b, #0f172a)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              ⚡
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Instant Delivery</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>Credits are added immediately</p>
            </div>
          </div>
          <p style={{ color: '#cbd5e1', lineHeight: 1.5, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Credits are used to process payrolls, send SMS notifications, run extensive background checks, and generate AI insights within the HRMS ecosystem.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.8rem' }}>Secure Checkout</span>
            <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.8rem' }}>Razorpay</span>
            <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.8rem' }}>UPI / Cards / NetBanking</span>
          </div>
        </div>
      </div>

      {/* Simulated Payment Gateway Modal */}
      {showSimModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            fontFamily: 'sans-serif'
          }}>
            {/* Header */}
            <div style={{ 
              background: simGateway === 'phonepe' ? '#6739b6' : '#0f172a', 
              padding: '1.5rem', 
              color: 'white', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  {simGateway === 'phonepe' ? 'PhonePe Simulator' : 'Razorpay Simulator'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#e2e8f0' }}>ID: {pendingOrder?.merchantTransactionId || pendingOrder?.orderId}</p>
              </div>
              <div style={{ background: '#f59e0b', color: '#0f172a', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                TEST MODE
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '2rem' }}>
              {simStep === 'SELECT' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Amount to Pay</span>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0 0 0' }}>
                      ₹{creditsToBuy.toLocaleString()}.00
                    </h2>
                  </div>

                  {/* Payment Methods tabs */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <button
                      onClick={() => setSimMethod('UPI')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: simMethod === 'UPI' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#e2e8f0',
                        background: simMethod === 'UPI' ? (simGateway === 'phonepe' ? '#f3e8ff' : '#eff6ff') : 'white',
                        color: simMethod === 'UPI' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📱 UPI
                    </button>
                    <button
                      onClick={() => setSimMethod('CARD')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: simMethod === 'CARD' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#e2e8f0',
                        background: simMethod === 'CARD' ? (simGateway === 'phonepe' ? '#f3e8ff' : '#eff6ff') : 'white',
                        color: simMethod === 'CARD' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      💳 Card
                    </button>
                    <button
                      onClick={() => setSimMethod('NETBANKING')}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: simMethod === 'NETBANKING' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#e2e8f0',
                        background: simMethod === 'NETBANKING' ? (simGateway === 'phonepe' ? '#f3e8ff' : '#eff6ff') : 'white',
                        color: simMethod === 'NETBANKING' ? (simGateway === 'phonepe' ? '#6739b6' : '#2563eb') : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🏦 NetBanking
                    </button>
                  </div>

                  {/* Payment Method Details */}
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', marginBottom: '2rem' }}>
                    {simMethod === 'UPI' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>
                          Enter UPI ID / VPA
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.95rem'
                          }}
                        />
                      </div>
                    )}
                    {simMethod === 'CARD' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Card Number</label>
                          <input type="text" placeholder="4111 1111 1111 1111" disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Expiry</label>
                          <input type="text" placeholder="12/29" disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>CVV</label>
                          <input type="password" placeholder="***" disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                        </div>
                      </div>
                    )}
                    {simMethod === 'NETBANKING' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Select Bank</label>
                        <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                          <option>State Bank of India</option>
                          <option>HDFC Bank</option>
                          <option>ICICI Bank</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => setShowSimModal(false)}
                      style={{ flex: 1, padding: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => triggerSimulatedPayment('SUCCESS')}
                      style={{ 
                        flex: 2, 
                        padding: '0.85rem', 
                        border: 'none', 
                        borderRadius: '8px', 
                        background: '#22c55e', 
                        color: 'white', 
                        fontWeight: 700, 
                        cursor: 'pointer' 
                      }}
                    >
                      Simulate Success
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                      onClick={() => triggerSimulatedPayment('FAILED')}
                      style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Simulate Failure
                    </button>
                  </div>
                </div>
              )}

              {simStep === 'PAYING' && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #e2e8f0',
                    borderTop: `5px solid ${simGateway === 'phonepe' ? '#6739b6' : '#2563eb'}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1.5rem auto'
                  }}></div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Processing Payment...</h3>
                  <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Do not refresh or close this window.</p>
                </div>
              )}

              {simStep === 'SUCCESS' && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: '#dcfce7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: '#22c55e',
                    margin: '0 auto 1.5rem auto'
                  }}>
                    ✓
                  </div>
                  <h3 style={{ margin: 0, color: '#15803d', fontSize: '1.25rem' }}>Payment Successful!</h3>
                  <p style={{ color: '#16a34a', marginTop: '0.5rem' }}>Credits added successfully.</p>
                </div>
              )}

              {simStep === 'FAILED' && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: '#fee2e2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: '#ef4444',
                    margin: '0 auto 1.5rem auto'
                  }}>
                    ✗
                  </div>
                  <h3 style={{ margin: 0, color: '#b91c1c', fontSize: '1.25rem' }}>Payment Failed</h3>
                  <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>The transaction was cancelled or declined.</p>
                  <button
                    onClick={() => setSimStep('SELECT')}
                    style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
