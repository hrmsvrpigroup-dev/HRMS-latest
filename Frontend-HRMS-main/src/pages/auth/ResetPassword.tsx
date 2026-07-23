import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import api from '../../api/axios'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      const isActivating = window.location.pathname.includes('/activate')
      setSuccess(isActivating ? 'Account activated successfully! Redirecting to login...' : 'Password reset successfully! Redirecting to login...')
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const isActivation = window.location.pathname.includes('/activate')

  return (
    <div className="auth-split-container">
      <div className="auth-glow-sphere-1" />
      <div className="auth-glow-sphere-2" />
      <div className="auth-grid-overlay" />

      <div className="auth-card-luxury">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.15rem' }}>
          <div className="auth-visual-logo-mark" style={{ width: '38px', height: '38px', borderRadius: '0.65rem', fontSize: '1.25rem' }}>⚡</div>
          <div className="auth-visual-logo-text" style={{ fontSize: '1.35rem', color: '#ffffff' }}>HRMS Enterprise</div>
        </div>

        <h1>{isActivation ? 'Activate Account' : 'Reset Password'}</h1>
        <p>{isActivation ? 'Set a secure password for your new account' : 'Enter your new password below'}</p>

        {!token ? (
          <div>
            <p className="error-text">Invalid or missing reset token.</p>
            <button
              type="button"
              className="submit-btn-dark"
              style={{ width: '100%', padding: '0.65rem', marginTop: '1rem' }}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="auth-luxury-label">
              New Password
              <div className="auth-luxury-input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="has-eye"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-luxury-label">
              Confirm Password
              <div className="auth-luxury-input-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="has-eye"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="error-text" style={{ fontSize: '0.85rem', margin: 0 }}>{error}</p>}
            {success && <p style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{success}</p>}

            <button
              type="submit"
              className="submit-btn-dark"
              style={{ width: '100%', padding: '0.65rem', marginTop: '0.25rem' }}
              disabled={loading}
            >
              {loading ? (isActivation ? 'Activating...' : 'Resetting...') : (isActivation ? 'Activate Account' : 'Reset Password')}
            </button>

            <button
              type="button"
              className="auth-back-link"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
