import React, { useState } from 'react'
import { Settings as SettIcon, Bell, ShieldCheck, Palette, Save, CheckCircle, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { triggerHrNotification } from '../../utils/notif'

export default function Settings() {
  const [emailNotif, setEmailNotif] = useState(true)
  const [portalNotif, setPortalNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [theme, setTheme] = useState<'LIGHT' | 'SLATE'>('LIGHT')

  const user = useAuthStore((state) => state.user)
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'An employee'

  // Password fields
  const [currPassword, setCurrPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess('Notification preferences saved successfully!')
    triggerHrNotification(`Employee ${fullName} updated their notification subscriptions.`)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess('')
    setError('')

    if (!currPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setSuccess('Password updated successfully!')
    setCurrPassword('')
    setNewPassword('')
    setConfirmPassword('')
    triggerHrNotification(`Employee ${fullName} updated their security credentials (changed password).`)
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="header-title">
          <h1>Account Settings</h1>
          <p>Configure notification subscriptions, interface theme appearance, and credentials security.</p>
        </div>
      </div>

      {success && (
        <div className="success-toast">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Left Side: System Configurations */}
        <div className="settings-column-left">
          
          {/* Notifications Panel */}
          <div className="card">
            <h3 className="section-title">
              <Bell size={18} className="text-blue-500" />
              <span>Notification Subscriptions</span>
            </h3>
            <form onSubmit={handleSaveNotifications}>
              <div className="toggle-list">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <h4>Email Notifications</h4>
                    <p>Receive daily bulletins, shift audit notifications, and leave approvals via email.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <h4>Portal Banners</h4>
                    <p>Show notifications inside the HRMS dashboard top bar alerts list.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={portalNotif} onChange={(e) => setPortalNotif(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <div className="toggle-info">
                    <h4>SMS Updates</h4>
                    <p>Send emergency company updates and shift logs directly to your phone.</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={smsNotif} onChange={(e) => setSmsNotif(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <div className="card-footer">
                <button type="submit" className="btn-save">
                  <Save size={14} />
                  <span>Save Subscriptions</span>
                </button>
              </div>
            </form>
          </div>

          {/* Theme Panel */}
          <div className="card mt-24">
            <h3 className="section-title">
              <Palette size={18} className="text-blue-500" />
              <span>Theme Appearance</span>
            </h3>
            <div className="theme-options">
              <button 
                className={`theme-box light ${theme === 'LIGHT' ? 'active' : ''}`}
                onClick={() => setTheme('LIGHT')}
              >
                <div className="theme-preview light-prev">
                  <div className="prev-bar"></div>
                  <div className="prev-circle"></div>
                </div>
                <span>Light Theme</span>
              </button>

              <button 
                className={`theme-box dark ${theme === 'SLATE' ? 'active' : ''}`}
                onClick={() => {
                  setTheme('SLATE');
                  alert('Slate Dark Theme layout selected. This triggers local theme variable simulation.');
                }}
              >
                <div className="theme-preview dark-prev">
                  <div className="prev-bar"></div>
                  <div className="prev-circle"></div>
                </div>
                <span>Slate Blue Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Security Credentials */}
        <div className="settings-column-right">
          <div className="card">
            <h3 className="section-title">
              <ShieldCheck size={18} className="text-blue-500" />
              <span>Change Security Password</span>
            </h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Account Password</label>
                <input
                  type="password"
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label>New Secure Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="card-footer" style={{ paddingBottom: 0 }}>
                <button type="submit" className="btn-save w-100">
                  <ShieldCheck size={14} />
                  <span>Update Password Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .settings-header { margin-bottom: 24px; }
        .settings-header h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .settings-header p { color: #64748b; font-size: 0.9rem; margin: 0; }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }

        .card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .mt-24 { margin-top: 24px; }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 20px 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 20px;
        }

        .toggle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .toggle-info h4 { margin: 0 0 4px 0; font-size: 0.88rem; font-weight: 700; color: #334155; }
        .toggle-info p { margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.4; }

        /* Toggle switch slider */
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #cbd5e1;
          transition: .3s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px; width: 16px;
          left: 4px; bottom: 4px;
          background-color: white;
          transition: .3s;
        }

        input:checked + .slider { background-color: #3b82f6; }
        input:checked + .slider:before { transform: translateX(20px); }

        .slider.round { border-radius: 24px; }
        .slider.round:before { border-radius: 50%; }

        .card-footer {
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
          display: flex;
          justify-content: flex-end;
        }

        .w-100 { width: 100%; justify-content: center; }

        .btn-save {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-save:hover { background: #2563eb; }

        /* Theme options */
        .theme-options {
          display: flex;
          gap: 16px;
        }

        .theme-box {
          flex: 1;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }

        .theme-box:hover { border-color: #cbd5e1; }
        
        .theme-box.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 700;
        }

        .theme-preview {
          width: 100%;
          height: 50px;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }

        .light-prev { background: #f8fafc; }
        .light-prev .prev-bar { height: 12px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
        .light-prev .prev-circle { width: 24px; height: 10px; background: #e2e8f0; border-radius: 2px; margin: 8px auto; }

        .dark-prev { background: #0f172a; }
        .dark-prev .prev-bar { height: 12px; background: #1e293b; }
        .dark-prev .prev-circle { width: 24px; height: 10px; background: #334155; border-radius: 2px; margin: 8px auto; }

        .theme-box span { font-size: 0.8rem; font-weight: 600; }

        /* Form styling */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          font-size: 0.88rem;
          color: #334155;
          outline: none;
          transition: all 0.2s;
        }

        .form-group input:focus {
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        /* Toasts */
        .success-toast {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          animation: toastSlide 0.25s ease-out;
        }

        .error-toast {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #ef4444;
          padding: 12px 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          animation: toastSlide 0.25s ease-out;
        }

        @keyframes toastSlide {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
