import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin.api'

const Field = ({ label, required, children, full }: { label: string; required?: boolean; children: React.ReactNode; full?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: full ? 'span 2' : undefined }}>
    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', gap: '0' }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
    {children}
  </div>
)

const inputStyle: React.CSSProperties = {
  height: '44px', padding: '0 1rem', border: '1.5px solid #e2e8f0', borderRadius: '0.625rem',
  fontSize: '0.925rem', background: '#fff', color: '#0f172a', outline: 'none',
  transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box',
  lineHeight: '42px'
}

export default function ProvisionHR() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [permissionsList, setPermissionsList] = useState<any[]>([])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    profilePicture: null as File | null,
    
    hrId: 'Auto-generated on save',
    departmentId: '',
    roleId: '',
    reportingManagerId: '',
    branchId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    shift: 'General Shift',
    employmentStatus: 'ACTIVE',
    
    permissions: [] as string[],
    twoFactorEnabled: false,
    
    sendActivationEmail: true,
  })

  useEffect(() => {
    // Fetch dropdown data
    const fetchDropdowns = async () => {
      try {
        const [deptRes, rolesRes, branchesRes, permRes] = await Promise.all([
          adminApi.getDepartments(),
          adminApi.getRoles(),
          adminApi.getBranches(),
          adminApi.getPermissions()
        ])
        setDepartments(deptRes || [])
        setRoles(rolesRes || [])
        setBranches(branchesRes || [])
        setPermissionsList(permRes || [])
      } catch (err) {
        console.error("Failed to load dropdown data", err)
      }
    }
    fetchDropdowns()
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB')
        return
      }
      handleInputChange('profilePicture', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const togglePermission = (permId: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permId)
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) }
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] }
      }
    })
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.firstName.trim() !== '' && 
               formData.lastName.trim() !== '' && 
               formData.email.trim() !== '' && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
      case 2:
        return formData.departmentId !== '' && 
               formData.roleId !== '' && 
               formData.branchId !== '' && 
               formData.joiningDate !== ''
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError('')
      setCurrentStep(prev => Math.min(prev + 1, 4))
    } else {
      setError('Please fill in all required fields correctly before proceeding.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(4)) return

    setLoading(true)
    setError('')

    try {
      const data = new FormData()
      data.append('firstName', formData.firstName)
      data.append('lastName', formData.lastName)
      data.append('email', formData.email)
      data.append('mobileNumber', formData.mobileNumber)
      if (formData.profilePicture) data.append('profilePicture', formData.profilePicture)

      data.append('departmentId', formData.departmentId)
      data.append('roleId', formData.roleId)
      data.append('reportingManagerId', formData.reportingManagerId)
      data.append('branchId', formData.branchId)
      data.append('joiningDate', formData.joiningDate)
      data.append('shift', formData.shift)
      data.append('employmentStatus', formData.employmentStatus)
      data.append('twoFactorEnabled', String(formData.twoFactorEnabled))
      data.append('sendActivationEmail', String(formData.sendActivationEmail))
      
      data.append('permissions', JSON.stringify(formData.permissions))

      await adminApi.provisionHROperator(data)
      alert('HR Operator provisioned successfully! Activation email sent.')
      navigate('/admin/hr')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to provision HR Operator')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="provision-hr-page">
      <div className="page-header" style={{ borderBottom: 'none', marginBottom: '1rem' }}>
        <div className="page-header-title">
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #1e293b 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Provision HR Operator</h1>
          <p style={{ fontSize: '1.05rem', color: '#64748b' }}>Create a new HR account with fine-grained access control.</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/admin/hr')} style={{ borderRadius: '2rem', padding: '0.6rem 1.5rem', fontWeight: 600 }}>
          Cancel
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem 1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sleek Sidebar Stepper */}
        <div className="premium-stepper-sidebar">
          {[
            { id: 1, label: 'Basic Information', icon: '👤', desc: 'Personal details & identity' },
            { id: 2, label: 'Employment Details', icon: '🏢', desc: 'Role, branch & schedule' },
            { id: 3, label: 'Access Control', icon: '🔐', desc: 'Permissions & privileges' },
            { id: 4, label: 'Security & Auth', icon: '🛡️', desc: 'Onboarding & 2FA setup' }
          ].map((step, idx) => (
            <div key={step.id} className={`stepper-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`} onClick={() => currentStep > step.id && setCurrentStep(step.id)}>
              <div className="stepper-icon">{currentStep > step.id ? '✓' : step.icon}</div>
              <div className="stepper-text">
                <div className="stepper-title">{step.label}</div>
                <div className="stepper-desc">{step.desc}</div>
              </div>
              {idx < 3 && <div className="stepper-line"></div>}
            </div>
          ))}
        </div>

        {/* Form Content Area */}
        <div className="premium-form-container">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Step 1 */}
            {currentStep === 1 && (
              <div className="step-content fade-in">
                <div className="step-header">
                  <h2>Basic Information</h2>
                  <p>Enter the personal and contact details for the new HR operator.</p>
                </div>
                
                <div className="premium-profile-upload">
                  <div className="avatar-preview">
                    {previewImage ? <img src={previewImage} alt="Preview" /> : <span>👤</span>}
                  </div>
                  <div className="upload-actions">
                    <h4>Profile Picture</h4>
                    <p>Upload a high-res image (Max 5MB). Format: JPG, PNG, WEBP.</p>
                    <label className="upload-btn">
                      Upload Image
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} hidden />
                    </label>
                  </div>
                </div>

                <div className="premium-grid">
                  <Field label="First Name" required><input style={inputStyle} value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} placeholder="e.g. Jane" required /></Field>
                  <Field label="Last Name" required><input style={inputStyle} value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} placeholder="e.g. Doe" required /></Field>
                  <Field label="Work Email Address" required><input type="email" style={inputStyle} value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="jane.doe@company.com" required /></Field>
                  <Field label="Mobile Number"><input type="tel" style={inputStyle} value={formData.mobileNumber} onChange={e => handleInputChange('mobileNumber', e.target.value)} placeholder="+1 (555) 000-0000" /></Field>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <div className="step-content fade-in">
                <div className="step-header">
                  <h2>Employment Details</h2>
                  <p>Assign the operator's role, department, and work location.</p>
                </div>
                <div className="premium-grid">
                  <Field label="HR ID"><input style={{...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed'}} value={formData.hrId} disabled /></Field>
                  <Field label="Joining Date" required><input type="date" style={inputStyle} value={formData.joiningDate} onChange={e => handleInputChange('joiningDate', e.target.value)} required /></Field>
                  <Field label="Department" required>
                    <select style={inputStyle} value={formData.departmentId} onChange={e => handleInputChange('departmentId', e.target.value)} required>
                      <option value="" disabled>Select Department...</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Role" required>
                    <select style={inputStyle} value={formData.roleId} onChange={e => handleInputChange('roleId', e.target.value)} required>
                      <option value="" disabled>Select Role...</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Branch Location" required>
                    <select style={inputStyle} value={formData.branchId} onChange={e => handleInputChange('branchId', e.target.value)} required>
                      <option value="" disabled>Select Branch...</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned Shift" required>
                    <select style={inputStyle} value={formData.shift} onChange={e => handleInputChange('shift', e.target.value)}>
                      <option value="Morning Shift">Morning Shift</option>
                      <option value="General Shift">General Shift</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="Flexible Shift">Flexible Shift</option>
                    </select>
                  </Field>
                  <Field label="Employment Status" full>
                    <select style={inputStyle} value={formData.employmentStatus} onChange={e => handleInputChange('employmentStatus', e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="ON_LEAVE">On Leave</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <div className="step-content fade-in">
                <div className="step-header">
                  <h2>Access Control & Privileges</h2>
                  <p>Configure which modules and actions this HR operator can access.</p>
                </div>
                
                <div className="permissions-grid">
                  {permissionsList.length > 0 ? permissionsList.map(perm => (
                    <label key={perm.id} className={`permission-card ${formData.permissions.includes(perm.id) ? 'selected' : ''}`}>
                      <div className="perm-checkbox">
                        <input type="checkbox" checked={formData.permissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} hidden />
                        <div className="custom-check">{formData.permissions.includes(perm.id) && '✓'}</div>
                      </div>
                      <div className="perm-info">
                        <div className="perm-name">{perm.name}</div>
                        <div className="perm-module">{perm.module} Module</div>
                      </div>
                    </label>
                  )) : (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '1rem' }}>No specific permissions available to assign.</div>
                  )}
                </div>

                <div className="two-factor-banner">
                  <div className="banner-icon">🛡️</div>
                  <div className="banner-content">
                    <h4>Two-Factor Authentication (2FA)</h4>
                    <p>Enforce an extra layer of security when this operator logs in.</p>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={formData.twoFactorEnabled} onChange={e => handleInputChange('twoFactorEnabled', e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {currentStep === 4 && (
              <div className="step-content fade-in">
                <div className="step-header">
                  <h2>Security & Activation</h2>
                  <p>Finalize how this operator will access their new account.</p>
                </div>
                
                <div className="activation-card">
                  <div className="act-icon">✉️</div>
                  <div className="act-info">
                    <h3 style={{fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem'}}>Temporary Password Email</h3>
                    <p>
                      The system will generate a secure temporary password and send it to{' '}
                      <strong>{formData.email || 'the operator'}</strong>.
                      They must change this password upon first login.
                    </p>

                    {/* Temp password preview box */}
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}>
                      <span style={{ fontSize: '1.4rem' }}>🔑</span>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                          Temporary Password (auto-generated)
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em' }}>
                          HR@Temp2026!
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '2px' }}>
                          A unique secure password will be generated and sent via email
                        </div>
                      </div>
                    </div>

                    <label className="fancy-checkbox">
                      <input type="checkbox" checked={formData.sendActivationEmail} onChange={e => handleInputChange('sendActivationEmail', e.target.checked)} />
                      Send Temporary Password Email Immediately
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions-premium">
              <button type="button" className="btn-secondary premium-btn" onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 1 || loading}>
                ← Back
              </button>
              {currentStep < 4 ? (
                <button type="button" className="btn-primary premium-btn" onClick={handleNext}>
                  Next Step →
                </button>
              ) : (
                <button type="submit" className="btn-primary premium-btn submit-btn" disabled={loading}>
                  {loading ? 'Provisioning...' : 'Provision HR Operator ✨'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <style>{`
        .provision-hr-page {
          padding: 2.5rem;
          max-width: 1300px;
          margin: 0 auto;
          font-family: 'Inter', sans-serif;
        }

        .premium-stepper-sidebar {
          background: #ffffff;
          border-radius: 1.25rem;
          padding: 2rem 1.5rem;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.03);
          border: 1px solid #f1f5f9;
          position: sticky;
          top: 2rem;
        }

        .stepper-item {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          position: relative;
          cursor: pointer;
          padding-bottom: 2.5rem;
          opacity: 0.5;
          transition: all 0.3s ease;
        }
        .stepper-item:last-child {
          padding-bottom: 0;
        }
        .stepper-item.active {
          opacity: 1;
        }
        .stepper-item.completed {
          opacity: 0.8;
        }
        .stepper-item:hover {
          opacity: 1;
        }

        .stepper-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          z-index: 2;
          transition: all 0.3s ease;
          color: #64748b;
        }
        .stepper-item.active .stepper-icon {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
        }
        .stepper-item.completed .stepper-icon {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .stepper-line {
          position: absolute;
          left: 21px;
          top: 44px;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
          z-index: 1;
        }
        .stepper-item.completed .stepper-line {
          background: #10b981;
        }

        .stepper-title {
          font-weight: 700;
          color: #1e293b;
          font-size: 1rem;
          margin-bottom: 0.25rem;
          margin-top: 0.25rem;
        }
        .stepper-desc {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.4;
        }
        .stepper-item.active .stepper-title {
          color: #4f46e5;
        }

        .premium-form-container {
          background: #ffffff;
          border-radius: 1.25rem;
          padding: 3rem;
          box-shadow: 0 10px 40px -10px rgba(15, 23, 42, 0.08);
          border: 1px solid rgba(226, 232, 240, 0.8);
          min-height: 600px;
          display: flex;
          flex-direction: column;
        }

        .step-content.fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          margin-bottom: 2.5rem;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 1.5rem;
        }
        .step-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }
        .step-header p {
          color: #64748b;
          font-size: 0.95rem;
          margin: 0;
        }

        .premium-profile-upload {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 2.5rem;
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px dashed #cbd5e1;
        }
        .avatar-preview {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
          flex-shrink: 0;
        }
        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .upload-actions h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          color: #1e293b;
        }
        .upload-actions p {
          margin: 0 0 1rem 0;
          font-size: 0.85rem;
          color: #64748b;
        }
        .upload-btn {
          display: inline-block;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 1.25rem;
          border-radius: 2rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .upload-btn:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .premium-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem 2rem;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .permission-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .permission-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .permission-card.selected {
          border-color: #4f46e5;
          background: #f5f3ff;
        }
        .custom-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          color: transparent;
          background: white;
          transition: all 0.2s;
        }
        .permission-card.selected .custom-check {
          background: #4f46e5;
          border-color: #4f46e5;
          color: white;
        }
        .perm-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .perm-module {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.2rem;
        }

        .two-factor-banner {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 1.5rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
        }
        .banner-icon {
          font-size: 2rem;
        }
        .banner-content h4 {
          margin: 0 0 0.25rem 0;
          color: #0f172a;
          font-size: 1rem;
        }
        .banner-content p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 26px;
          margin-left: auto;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
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
          height: 20px; width: 20px;
          left: 3px; bottom: 3px;
          background-color: white;
          transition: .3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        input:checked + .slider {
          background-color: #4f46e5;
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
        .slider.round {
          border-radius: 26px;
        }
        .slider.round:before {
          border-radius: 50%;
        }

        .activation-card {
          display: flex;
          gap: 1.5rem;
          background: #f8fafc;
          padding: 2rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
        }
        .act-icon {
          font-size: 2.5rem;
          padding: 1rem;
          background: #ffffff;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          height: fit-content;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .act-info h3 {
          margin: 0 0 1rem 0;
          color: #0f172a;
        }
        .act-info p {
          color: #475569;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .fancy-checkbox {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-weight: 600;
          color: #1e293b;
          font-size: 1rem;
        }
        .fancy-checkbox input {
          width: 20px;
          height: 20px;
          accent-color: #4f46e5;
          cursor: pointer;
        }

        .form-actions-premium {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 3rem;
        }
        .premium-btn {
          padding: 0.85rem 2rem !important;
          border-radius: 0.75rem !important;
          font-size: 1rem !important;
          font-weight: 600 !important;
          transition: all 0.2s !important;
        }
        .premium-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .submit-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
          border: none !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(79,70,229,0.3) !important;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(79,70,229,0.4) !important;
        }

        @media (max-width: 900px) {
          .provision-hr-page > div {
            grid-template-columns: 1fr !important;
          }
          .premium-stepper-sidebar {
            display: flex;
            gap: 1rem;
            overflow-x: auto;
            position: relative;
            top: 0;
          }
          .stepper-item {
            padding-bottom: 0;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-width: 120px;
          }
          .stepper-line { display: none; }
          .stepper-desc { display: none; }
          .premium-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
