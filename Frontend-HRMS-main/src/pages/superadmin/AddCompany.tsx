import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { superAdminApi } from '../../api/superadmin.api'

interface FormData {
  companyName: string; legalCompanyName: string; industryType: string; businessType: string
  companyLogo: File | null; websiteUrl: string; companyDescription: string; subdomainPrefix: string
  officialEmail: string; officialPhoneNumber: string; alternateContactNumber: string
  country: string; state: string; city: string; addressLine1: string; addressLine2: string; postalCode: string
  adminFullName: string; adminEmail: string; adminMobileNumber: string; username: string; password: string; confirmPassword: string
  planType: string; subscriptionStartDate: string; subscriptionDuration: string; subscriptionEndDate: string
  gstNumber: string; panNumber: string; registrationNumber: string; taxIdentificationNumber: string
  enableTwoFactorAuth: boolean; allowedLoginDomains: string; ipRestrictionEnabled: boolean
  companyRegistrationCertificate: File | null; taxDocuments: File | null; ndaAgreements: File | null
  razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string
}

const industryTypes = ['Technology','Healthcare','Finance','Education','Manufacturing','Retail','Consulting','Other']
const businessTypes = ['Private Limited','Public Limited','LLP','Partnership','Sole Proprietorship','Non-Profit','Government']
const planTypes = [
  { name: 'Starter', price: 999, desc: 'Up to 50 employees', color: '#6366f1' },
  { name: 'Professional', price: 2499, desc: 'Up to 200 employees', color: '#8b5cf6' },
  { name: 'Enterprise', price: 4999, desc: 'Unlimited employees', color: '#ec4899' },
  { name: 'Custom', price: 0, desc: 'Tailored solution', color: '#14b8a6' },
]
const subscriptionDurations = [
  { label: 'Monthly', days: 30 },{ label: 'Quarterly', days: 90 },
  { label: 'Half Yearly', days: 180 },{ label: 'Yearly', days: 360 },
]
const countries = ['India','United States','United Kingdom','Canada','Australia','Other']
const states = ['Andhra Pradesh','Delhi','Karnataka','Maharashtra','Tamil Nadu','Telangana','Uttar Pradesh','Other']

const steps = [
  { id: 1, label: 'Basic Info', icon: '🏢' },
  { id: 2, label: 'Contact', icon: '📞' },
  { id: 3, label: 'Address', icon: '📍' },
  { id: 4, label: 'Admin', icon: '👤' },
  { id: 5, label: 'Plan', icon: '💳' },
  { id: 6, label: 'Compliance', icon: '📋' },
  { id: 7, label: 'Security', icon: '🔒' },
  { id: 8, label: 'Documents', icon: '📁' },
]

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

export default function AddCompany() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    companyName: '', legalCompanyName: '', industryType: '', businessType: '',
    companyLogo: null, websiteUrl: '', companyDescription: '', subdomainPrefix: '',
    officialEmail: '', officialPhoneNumber: '', alternateContactNumber: '',
    country: '', state: '', city: '', addressLine1: '', addressLine2: '', postalCode: '',
    adminFullName: '', adminEmail: '', adminMobileNumber: '', username: '', password: '', confirmPassword: '',
    planType: 'Starter', subscriptionStartDate: new Date().toISOString().split('T')[0],
    subscriptionDuration: 'Monthly', subscriptionEndDate: '',
    gstNumber: '', panNumber: '', registrationNumber: '', taxIdentificationNumber: '',
    enableTwoFactorAuth: false, allowedLoginDomains: '', ipRestrictionEnabled: false,
    companyRegistrationCertificate: null, taxDocuments: null, ndaAgreements: null,
    razorpayPaymentId: '', razorpayOrderId: '', razorpaySignature: '',
  })

  useEffect(() => {
    if (formData.subscriptionStartDate && formData.subscriptionDuration) {
      const duration = subscriptionDurations.find(d => d.label === formData.subscriptionDuration)
      if (duration) {
        const end = new Date(formData.subscriptionStartDate)
        end.setDate(end.getDate() + duration.days)
        setFormData(prev => ({ ...prev, subscriptionEndDate: end.toISOString().split('T')[0] }))
      }
    }
  }, [formData.subscriptionStartDate, formData.subscriptionDuration])

  useEffect(() => {
    const p = formData.password; let s = 0
    if (p.length >= 8) s += 20; if (p.match(/[a-z]/)) s += 20; if (p.match(/[A-Z]/)) s += 20
    if (p.match(/[0-9]/)) s += 20; if (p.match(/[^a-zA-Z0-9]/)) s += 20
    setPasswordStrength(s)
  }, [formData.password])

  const handleInputChange = (field: keyof FormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleFileChange = (field: keyof FormData, file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }))
    if (field === 'companyLogo' && file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: return formData.companyName.trim() !== '' && formData.legalCompanyName.trim() !== '' && formData.industryType !== '' && formData.businessType !== ''
      case 2: return formData.officialEmail.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.officialEmail) && formData.officialPhoneNumber.trim() !== ''
      case 3: return formData.country !== '' && formData.state !== '' && formData.city.trim() !== '' && formData.addressLine1.trim() !== '' && formData.postalCode.trim() !== ''
      case 4: return formData.adminFullName.trim() !== '' && formData.adminEmail.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail) && formData.adminMobileNumber.trim() !== '' && formData.username.trim() !== '' && formData.password.length >= 8 && formData.password === formData.confirmPassword
      case 5: { const plan = planTypes.find(p => p.name === formData.planType); const price = plan ? plan.price : 999; return formData.planType !== '' && formData.subscriptionStartDate !== '' && formData.subscriptionDuration !== '' && formData.subscriptionEndDate !== '' && (price === 0 || formData.razorpayPaymentId !== '') }
      case 6: return true
      case 7: return true
      case 8: return formData.companyRegistrationCertificate !== null && formData.taxDocuments !== null && formData.ndaAgreements !== null
      default: return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) { setCurrentStep(prev => Math.min(prev + 1, 8)); setError('') }
    else setError('Please fill in all required fields correctly.')
  }
  const handlePrevious = () => { setCurrentStep(prev => Math.max(prev - 1, 1)); setError('') }

  const handleRazorpayPayment = async () => {
    const plan = planTypes.find(p => p.name === formData.planType)
    const price = plan ? plan.price : 999
    if (price === 0) { alert('This plan is free, no payment needed.'); return }
    try {
      const response = await superAdminApi.createPaymentOrder(price)
      const data = response.data
      if (data.isMock) {
        setFormData(prev => ({ ...prev, razorpayPaymentId: `mock_pay_${Date.now()}`, razorpayOrderId: data.orderId, razorpaySignature: 'mock_signature' }))
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(script)
      script.onload = () => {
        const options = { key: data.key, amount: data.amount, currency: data.currency, name: 'HRMS Portal', description: `Subscription for ${formData.planType}`, order_id: data.orderId, handler: (rzpResponse: any) => { setFormData(prev => ({ ...prev, razorpayPaymentId: rzpResponse.razorpay_payment_id, razorpayOrderId: rzpResponse.razorpay_order_id, razorpaySignature: rzpResponse.razorpay_signature })) }, prefill: { name: formData.adminFullName || 'Admin User', email: formData.adminEmail || 'admin@example.com', contact: formData.adminMobileNumber || '9999999999' }, theme: { color: '#4f46e5' } }
        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      }
    } catch (err: any) {
      console.error('Razorpay initiation failed:', err)
      const errMsg = err.response?.data?.message || err.message || 'Unknown error'
      alert(`Failed to initiate payment: ${errMsg}. Please try again.`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(8)) { setError('Please complete all required fields.'); return }
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('companyName', formData.companyName); fd.append('legalCompanyName', formData.legalCompanyName)
      fd.append('industryType', formData.industryType); fd.append('businessType', formData.businessType)
      fd.append('websiteUrl', formData.websiteUrl); fd.append('companyDescription', formData.companyDescription)
      fd.append('subdomainPrefix', formData.subdomainPrefix)
      if (formData.companyLogo) fd.append('companyLogo', formData.companyLogo)
      fd.append('officialEmail', formData.officialEmail); fd.append('officialPhoneNumber', formData.officialPhoneNumber)
      fd.append('alternateContactNumber', formData.alternateContactNumber)
      fd.append('country', formData.country); fd.append('state', formData.state); fd.append('city', formData.city)
      fd.append('addressLine1', formData.addressLine1); fd.append('addressLine2', formData.addressLine2); fd.append('postalCode', formData.postalCode)
      fd.append('adminFullName', formData.adminFullName); fd.append('adminEmail', formData.adminEmail)
      fd.append('adminMobileNumber', formData.adminMobileNumber); fd.append('username', formData.username); fd.append('password', formData.password)
      fd.append('planType', formData.planType); fd.append('subscriptionStartDate', formData.subscriptionStartDate)
      fd.append('subscriptionDuration', formData.subscriptionDuration); fd.append('subscriptionEndDate', formData.subscriptionEndDate)
      fd.append('gstNumber', formData.gstNumber); fd.append('panNumber', formData.panNumber)
      fd.append('registrationNumber', formData.registrationNumber); fd.append('taxIdentificationNumber', formData.taxIdentificationNumber)
      fd.append('enableTwoFactorAuth', formData.enableTwoFactorAuth.toString()); fd.append('allowedLoginDomains', formData.allowedLoginDomains)
      fd.append('ipRestrictionEnabled', formData.ipRestrictionEnabled.toString())
      if (formData.companyRegistrationCertificate) fd.append('companyRegistrationCertificate', formData.companyRegistrationCertificate)
      if (formData.taxDocuments) fd.append('taxDocuments', formData.taxDocuments)
      if (formData.ndaAgreements) fd.append('ndaAgreements', formData.ndaAgreements)
      fd.append('razorpayPaymentId', formData.razorpayPaymentId); fd.append('razorpayOrderId', formData.razorpayOrderId); fd.append('razorpaySignature', formData.razorpaySignature)
      await superAdminApi.createCompanyWithFullDetails(fd)
      navigate('/superadmin/companies')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create company. Please try again.')
    } finally { setLoading(false) }
  }



  const renderStep = () => {
    switch (currentStep) {
      case 1: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)', borderRadius: '1rem', border: '1px solid #e0e7ff' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏢</div>
            <div><div style={{ fontWeight: 700, color: '#1e1b4b', fontSize: '1.05rem' }}>Basic Company Information</div><div style={{ fontSize: '0.85rem', color: '#6366f1' }}>Core identity and classification details</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="Company Name" required><input style={inputStyle} value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} placeholder="e.g. Acme Technologies" /></Field>
            <Field label="Company Code / ID"><div style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', display: 'flex', alignItems: 'center' }}>Auto-generated on save</div></Field>
            <Field label="Legal Company Name" required><input style={inputStyle} value={formData.legalCompanyName} onChange={e => handleInputChange('legalCompanyName', e.target.value)} placeholder="e.g. Acme Technologies Pvt. Ltd." /></Field>
            <Field label="Industry Type" required>
              <select style={inputStyle} value={formData.industryType} onChange={e => handleInputChange('industryType', e.target.value)}>
                <option value="">Select Industry</option>
                {industryTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Business Type" required>
              <select style={inputStyle} value={formData.businessType} onChange={e => handleInputChange('businessType', e.target.value)}>
                <option value="">Select Business Type</option>
                {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Company Logo">
              <div style={{ border: '2px dashed #c7d2fe', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', background: '#f5f3ff', position: 'relative' }}>
                {logoPreview ? <img src={logoPreview} alt="Logo" style={{ height: 48, objectFit: 'contain', margin: '0 auto', display: 'block' }} /> : <div style={{ color: '#818cf8', fontSize: '0.85rem' }}>📷 Click to upload logo</div>}
                <input type="file" accept="image/*" onChange={e => handleFileChange('companyLogo', e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
            </Field>
            <Field label="Website URL"><input style={inputStyle} type="url" value={formData.websiteUrl} onChange={e => handleInputChange('websiteUrl', e.target.value)} placeholder="https://www.company.com" /></Field>
            <Field label="Company Description" full><textarea style={{ ...inputStyle, height: 'auto', minHeight: 80, padding: '0.75rem 1rem', lineHeight: '1.5', resize: 'vertical' }} value={formData.companyDescription} onChange={e => handleInputChange('companyDescription', e.target.value)} placeholder="Brief description of the company..." rows={3} /></Field>
          </div>
        </div>
      )

      case 2: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderRadius: '1rem', border: '1px solid #bbf7d0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📞</div>
            <div><div style={{ fontWeight: 700, color: '#064e3b', fontSize: '1.05rem' }}>Contact Information</div><div style={{ fontSize: '0.85rem', color: '#10b981' }}>Official communication channels</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="Official Email" required><input style={inputStyle} type="email" value={formData.officialEmail} onChange={e => handleInputChange('officialEmail', e.target.value)} placeholder="contact@company.com" /></Field>
            <Field label="Official Phone Number" required><input style={inputStyle} type="tel" value={formData.officialPhoneNumber} onChange={e => handleInputChange('officialPhoneNumber', e.target.value)} placeholder="+91 98765 43210" /></Field>
            <Field label="Alternate Contact Number"><input style={inputStyle} type="tel" value={formData.alternateContactNumber} onChange={e => handleInputChange('alternateContactNumber', e.target.value)} placeholder="+91 98765 43210" /></Field>
          </div>
        </div>
      )
      case 3: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', borderRadius: '1rem', border: '1px solid #fed7aa' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📍</div>
            <div><div style={{ fontWeight: 700, color: '#78350f', fontSize: '1.05rem' }}>Address Details</div><div style={{ fontSize: '0.85rem', color: '#f59e0b' }}>Registered office location</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="Country" required>
              <select style={inputStyle} value={formData.country} onChange={e => handleInputChange('country', e.target.value)}>
                <option value="">Select Country</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="State" required>
              <select style={inputStyle} value={formData.state} onChange={e => handleInputChange('state', e.target.value)}>
                <option value="">Select State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="City" required><input style={inputStyle} value={formData.city} onChange={e => handleInputChange('city', e.target.value)} placeholder="e.g. Mumbai" /></Field>
            <Field label="Postal / ZIP Code" required><input style={inputStyle} value={formData.postalCode} onChange={e => handleInputChange('postalCode', e.target.value)} placeholder="400001" /></Field>
            <Field label="Address Line 1" required full><input style={inputStyle} value={formData.addressLine1} onChange={e => handleInputChange('addressLine1', e.target.value)} placeholder="Building, Street" /></Field>
            <Field label="Address Line 2" full><input style={inputStyle} value={formData.addressLine2} onChange={e => handleInputChange('addressLine2', e.target.value)} placeholder="Area, Landmark (optional)" /></Field>
          </div>
        </div>
      )

      case 4: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', borderRadius: '1rem', border: '1px solid #fbcfe8' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>👤</div>
            <div><div style={{ fontWeight: 700, color: '#831843', fontSize: '1.05rem' }}>Company Admin Details</div><div style={{ fontSize: '0.85rem', color: '#ec4899' }}>Primary administrator credentials</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="Admin Full Name" required><input style={inputStyle} value={formData.adminFullName} onChange={e => handleInputChange('adminFullName', e.target.value)} placeholder="John Doe" /></Field>
            <Field label="Admin Email" required><input style={inputStyle} type="email" value={formData.adminEmail} onChange={e => handleInputChange('adminEmail', e.target.value)} placeholder="admin@company.com" /></Field>
            <Field label="Admin Mobile Number" required><input style={inputStyle} type="tel" value={formData.adminMobileNumber} onChange={e => handleInputChange('adminMobileNumber', e.target.value)} placeholder="+91 98765 43210" /></Field>
            <Field label="Username" required><input style={inputStyle} value={formData.username} onChange={e => handleInputChange('username', e.target.value)} placeholder="admin_user" /></Field>
            <Field label="Password" required>
              <input style={inputStyle} type="password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} placeholder="Min. 8 characters" />
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${passwordStrength}%`, borderRadius: 99, transition: 'all 0.3s', background: passwordStrength < 40 ? '#ef4444' : passwordStrength < 80 ? '#f59e0b' : '#10b981' }} />
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: passwordStrength < 40 ? '#ef4444' : passwordStrength < 80 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                  {passwordStrength < 40 ? '⚠ Weak' : passwordStrength < 80 ? '◑ Medium' : '✓ Strong'}
                </div>
              </div>
            </Field>
            <Field label="Confirm Password" required>
              <input style={inputStyle} type="password" value={formData.confirmPassword} onChange={e => handleInputChange('confirmPassword', e.target.value)} placeholder="Repeat password" />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.25rem' }}>✗ Passwords do not match</div>}
              {formData.confirmPassword && formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.25rem' }}>✓ Passwords match</div>}
            </Field>
          </div>
        </div>
      )

      case 5: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '1rem', border: '1px solid #bfdbfe' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>💳</div>
            <div><div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '1.05rem' }}>Subscription & Plan</div><div style={{ fontSize: '0.85rem', color: '#3b82f6' }}>Choose the right plan for this company</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {planTypes.map(plan => {
              // Monthly credit costs (1 credit = ₹1)
              const monthlyCreditCost = plan.name === 'Starter' ? 100 : plan.name === 'Professional' ? 250 : plan.name === 'Enterprise' ? 500 : 100
              return (
                <div key={plan.name} onClick={() => handleInputChange('planType', plan.name)} style={{ padding: '1.25rem', borderRadius: '1rem', border: `2px solid ${formData.planType === plan.name ? plan.color : '#e2e8f0'}`, background: formData.planType === plan.name ? `${plan.color}10` : '#fff', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: formData.planType === plan.name ? plan.color : '#0f172a', fontSize: '1rem' }}>{plan.name}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: plan.color, margin: '0.5rem 0' }}>{plan.price > 0 ? `₹${plan.price}` : 'Free'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{plan.desc}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', background: '#faf5ff', padding: '0.35rem 0.5rem', borderRadius: '0.5rem', border: '1px solid #e9d5ff' }}>
                    🪙 {monthlyCreditCost} credits/month
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="Subscription Start Date" required><input style={inputStyle} type="date" value={formData.subscriptionStartDate} onChange={e => handleInputChange('subscriptionStartDate', e.target.value)} /></Field>
            <Field label="Subscription Duration" required>
              <select style={inputStyle} value={formData.subscriptionDuration} onChange={e => handleInputChange('subscriptionDuration', e.target.value)}>
                {subscriptionDurations.map(d => <option key={d.label} value={d.label}>{d.label} ({d.days} days)</option>)}
              </select>
            </Field>
            <Field label="Subscription End Date (Auto-calculated)"><input style={{ ...inputStyle, background: '#f8fafc', color: '#94a3b8' }} type="date" value={formData.subscriptionEndDate} disabled /></Field>
            <Field label="Payment">
              {formData.razorpayPaymentId ? (
                <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1.5px solid #10b981', borderRadius: '0.625rem', color: '#065f46', fontWeight: 600, fontSize: '0.875rem' }}>✓ Payment confirmed — {formData.razorpayPaymentId}</div>
              ) : (
                <button type="button" onClick={handleRazorpayPayment} style={{ padding: '0.75rem 1rem', background: '#0A2540', color: '#fff', border: 'none', borderRadius: '0.625rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>💳 Pay with Razorpay</button>
              )}
            </Field>
          </div>
        </div>
      )
      case 6: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', borderRadius: '1rem', border: '1px solid #99f6e4' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📋</div>
            <div><div style={{ fontWeight: 700, color: '#134e4a', fontSize: '1.05rem' }}>Compliance & Tax</div><div style={{ fontSize: '0.85rem', color: '#14b8a6' }}>Optional — regulatory identifiers</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Field label="GST Number"><input style={inputStyle} value={formData.gstNumber} onChange={e => handleInputChange('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" /></Field>
            <Field label="PAN Number"><input style={inputStyle} value={formData.panNumber} onChange={e => handleInputChange('panNumber', e.target.value)} placeholder="AAAAA0000A" /></Field>
            <Field label="Registration Number"><input style={inputStyle} value={formData.registrationNumber} onChange={e => handleInputChange('registrationNumber', e.target.value)} placeholder="CIN / Registration No." /></Field>
            <Field label="Tax Identification Number"><input style={inputStyle} value={formData.taxIdentificationNumber} onChange={e => handleInputChange('taxIdentificationNumber', e.target.value)} placeholder="TIN" /></Field>
          </div>
        </div>
      )

      case 7: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', borderRadius: '1rem', border: '1px solid #e9d5ff' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🔒</div>
            <div><div style={{ fontWeight: 700, color: '#581c87', fontSize: '1.05rem' }}>Security & Access</div><div style={{ fontSize: '0.85rem', color: '#a855f7' }}>Optional — access control settings</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: '#faf5ff', borderRadius: '0.875rem', border: '1.5px solid #e9d5ff' }}>
              <div><div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>Two-Factor Authentication</div><div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Require 2FA for all admin logins</div></div>
              <div onClick={() => handleInputChange('enableTwoFactorAuth', !formData.enableTwoFactorAuth)} style={{ width: 48, height: 26, borderRadius: 99, background: formData.enableTwoFactorAuth ? '#a855f7' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: formData.enableTwoFactorAuth ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: '#faf5ff', borderRadius: '0.875rem', border: '1.5px solid #e9d5ff' }}>
              <div><div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>IP Restriction</div><div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>Restrict logins to specific IP addresses</div></div>
              <div onClick={() => handleInputChange('ipRestrictionEnabled', !formData.ipRestrictionEnabled)} style={{ width: 48, height: 26, borderRadius: 99, background: formData.ipRestrictionEnabled ? '#a855f7' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: formData.ipRestrictionEnabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>
            <Field label="Allowed Login Domains"><input style={inputStyle} value={formData.allowedLoginDomains} onChange={e => handleInputChange('allowedLoginDomains', e.target.value)} placeholder="company.com, partner.com" /></Field>
          </div>
        </div>
      )
      case 8: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.25rem', background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', borderRadius: '1rem', border: '1px solid #fed7aa' }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📁</div>
            <div><div style={{ fontWeight: 700, color: '#7c2d12', fontSize: '1.05rem' }}>Document Uploads</div><div style={{ fontSize: '0.85rem', color: '#f97316' }}>Required legal and compliance documents</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
            {[
              { field: 'companyRegistrationCertificate' as keyof FormData, label: 'Registration Certificate', icon: '📜' },
              { field: 'taxDocuments' as keyof FormData, label: 'Tax Documents', icon: '🧾' },
              { field: 'ndaAgreements' as keyof FormData, label: 'NDA / Agreements', icon: '🤝' },
            ].map(({ field, label, icon }) => (
              <div key={field} style={{ border: `2px dashed ${formData[field] ? '#10b981' : '#cbd5e1'}`, borderRadius: '1rem', padding: '1.5rem', textAlign: 'center', background: formData[field] ? '#f0fdf4' : '#f8fafc', position: 'relative', cursor: 'pointer' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{formData[field] ? '✅' : icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: formData[field] ? '#065f46' : '#475569', marginBottom: '0.25rem' }}>{label} *</div>
                {formData[field] ? <div style={{ fontSize: '0.75rem', color: '#10b981' }}>{(formData[field] as File).name}</div> : <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PDF, DOCX, PNG, JPG · Max 10MB</div>}
                <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={e => handleFileChange(field, e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>
      )
      default: return null
    }
  }

  const progress = Math.round(((currentStep - 1) / 7) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🏢</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Register New Company</h1>
          </div>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Complete all 8 steps to onboard a new tenant</p>
        </div>
        <button onClick={() => navigate('/superadmin/companies')} style={{ padding: '0.6rem 1.25rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.625rem', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>✕ Cancel</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar Stepper */}
        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', position: 'sticky', top: '1rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {steps.map(step => {
              const isActive = step.id === currentStep
              const isDone = step.id < currentStep
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', background: isActive ? 'linear-gradient(135deg, #6366f110, #8b5cf610)' : 'transparent', border: isActive ? '1.5px solid #c7d2fe' : '1.5px solid transparent', cursor: isDone ? 'pointer' : 'default', transition: 'all 0.2s' }} onClick={() => isDone && setCurrentStep(step.id)}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isDone ? '0.9rem' : '0.8rem', fontWeight: 700, flexShrink: 0, background: isDone ? '#10b981' : isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9', color: isDone || isActive ? '#fff' : '#94a3b8', boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none' }}>
                    {isDone ? '✓' : step.id}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#4f46e5' : isDone ? '#0f172a' : '#94a3b8' }}>{step.label}</div>
                    <div style={{ fontSize: '0.7rem', color: isDone ? '#10b981' : isActive ? '#6366f1' : '#cbd5e1' }}>{isDone ? 'Completed' : isActive ? 'In progress' : 'Pending'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Form Card */}
        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '0.75rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                <span>⚠</span> {error}
              </div>
            )}

            {renderStep()}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Step {currentStep} of 8</div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {currentStep > 1 && (
                  <button type="button" onClick={handlePrevious} style={{ padding: '0.7rem 1.5rem', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '0.625rem', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>← Previous</button>
                )}
                {currentStep < 8 ? (
                  <button type="button" onClick={handleNext} style={{ padding: '0.7rem 1.75rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>Next →</button>
                ) : (
                  <button type="submit" disabled={loading} style={{ padding: '0.7rem 2rem', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '0.625rem', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', boxShadow: loading ? 'none' : '0 4px 12px rgba(16,185,129,0.35)' }}>
                    {loading ? '⏳ Creating...' : '✓ Create Company'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
