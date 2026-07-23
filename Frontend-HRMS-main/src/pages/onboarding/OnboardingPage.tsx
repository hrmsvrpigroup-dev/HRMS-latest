import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { onboardingApi, type OnboardingInvite } from '../../api/onboarding.api'
import { DocumentUploadComponent, type FileState, ONBOARDING_DOCUMENT_FIELDS } from '../../components/onboarding/DocumentUploadComponent'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

type StepKey = 'personal' | 'address' | 'employment' | 'payroll' | 'documents'

type ToastTone = 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  tone: ToastTone
  title: string
  message: string
}

type FormState = {
  firstName: string
  lastName: string
  gender: string
  dob: string
  maritalStatus: string
  nationality: string
  personalEmail: string
  phoneNumber: string
  emergencyContact: string
  currentAddress: string
  permanentAddress: string
  city: string
  state: string
  country: string
  pincode: string
  employeeId: string
  department: string
  designation: string
  employmentType: string
  reportingManager: string
  joiningDate: string
  workLocation: string
  panNumber: string
  aadhaarNumber: string
  bankName: string
  accountNumber: string
  ifscCode: string
  uanPfNumber: string
}

const STEPS: Array<{ key: StepKey; title: string; description: string; icon: typeof UserRound }> = [
  {
    key: 'personal',
    title: 'Personal Details',
    description: 'Verify identity, contact, and emergency contact information.',
    icon: UserRound,
  },
  {
    key: 'address',
    title: 'Address Details',
    description: 'Capture current and permanent residential details.',
    icon: FileText,
  },
  {
    key: 'employment',
    title: 'Employment Details',
    description: 'Confirm reporting, role, and joining information.',
    icon: ShieldCheck,
  },
  {
    key: 'payroll',
    title: 'Payroll Details',
    description: 'Securely record statutory and banking details.',
    icon: Clock3,
  },
  {
    key: 'documents',
    title: 'Document Upload',
    description: 'Upload identity and employment documents securely.',
    icon: Sparkles,
  },
]

const createFileState = () =>
  ONBOARDING_DOCUMENT_FIELDS.reduce((acc, field) => {
    acc[field.key] = null
    return acc
  }, {} as FileState)

const createFormState = (invite?: OnboardingInvite | null): FormState => ({
  firstName: invite?.firstName ?? '',
  lastName: invite?.lastName ?? '',
  gender: '',
  dob: '',
  maritalStatus: '',
  nationality: '',
  personalEmail: invite?.personalEmail ?? '',
  phoneNumber: invite?.phoneNumber ?? '',
  emergencyContact: '',
  currentAddress: '',
  permanentAddress: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  employeeId: invite?.employeeId ?? '',
  department: invite?.department ?? '',
  designation: invite?.designation ?? '',
  employmentType: invite?.employmentType ?? '',
  reportingManager: '',
  joiningDate: invite?.joiningDate ? invite.joiningDate.slice(0, 10) : '',
  workLocation: invite?.workLocation ?? '',
  panNumber: '',
  aadhaarNumber: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  uanPfNumber: '',
})

export default function OnboardingPage() {
  const { token } = useParams<{ token: string }>()
  const formRef = useRef<HTMLFormElement>(null)
  const [invite, setInvite] = useState<OnboardingInvite | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormState>(() => createFormState(null))
  const [files, setFiles] = useState<FileState>(() => createFileState())
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [submittedInvite, setSubmittedInvite] = useState<OnboardingInvite | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (tone: ToastTone, title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, tone, title, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4200)
  }

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError('Missing onboarding token.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setSubmittedInvite(null)
        setDraftLoaded(false)
        
        const response = await onboardingApi.getInviteByToken(token)
        setInvite(response)
        
        const savedStep = localStorage.getItem(`onboard_candidate_step_${token}`)
        if (savedStep) {
          setCurrentStep(parseInt(savedStep, 10))
        } else {
          setCurrentStep(0)
        }
        
        const defaultForm = createFormState(response)
        const savedForm = localStorage.getItem(`onboard_candidate_form_${token}`)
        if (savedForm) {
          try {
            const parsed = JSON.parse(savedForm)
            setFormData({ ...defaultForm, ...parsed })
          } catch (e) {
            setFormData(defaultForm)
          }
        } else {
          setFormData(defaultForm)
        }

        setFiles(createFileState())
        setError('')
        setDraftLoaded(true)
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load onboarding link.')
      } finally {
        setLoading(false)
      }
    }

    loadInvite()
  }, [token])

  useEffect(() => {
    if (token && draftLoaded) {
      localStorage.setItem(`onboard_candidate_step_${token}`, currentStep.toString())
    }
  }, [currentStep, token, draftLoaded])

  useEffect(() => {
    if (token && draftLoaded) {
      localStorage.setItem(`onboard_candidate_form_${token}`, JSON.stringify(formData))
    }
  }, [formData, token, draftLoaded])

  const clearCandidateDraft = () => {
    if (token) {
      localStorage.removeItem(`onboard_candidate_step_${token}`)
      localStorage.removeItem(`onboard_candidate_form_${token}`)
    }
  }

  const currentStepMeta = STEPS[currentStep]
  const progressPercentage = useMemo(() => ((currentStep + 1) / STEPS.length) * 100, [currentStep])

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const validateCurrentStep = () => {
    if (!formRef.current) return false
    const isValid = formRef.current.reportValidity()
    if (!isValid) {
      addToast('error', 'Validation required', 'Please complete the highlighted fields before continuing.')
    }
    return isValid
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const buildPayload = () => ({
    personalDetails: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      dob: formData.dob,
      maritalStatus: formData.maritalStatus,
      nationality: formData.nationality,
      personalEmail: formData.personalEmail,
      phoneNumber: formData.phoneNumber,
      emergencyContact: formData.emergencyContact,
    },
    addressDetails: {
      currentAddress: formData.currentAddress,
      permanentAddress: formData.permanentAddress,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      pincode: formData.pincode,
    },
    employmentDetails: {
      employeeId: formData.employeeId,
      department: formData.department,
      designation: formData.designation,
      employmentType: formData.employmentType,
      reportingManager: formData.reportingManager,
      joiningDate: formData.joiningDate,
      workLocation: formData.workLocation,
    },
    payrollDetails: {
      panNumber: formData.panNumber,
      aadhaarNumber: formData.aadhaarNumber,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      ifscCode: formData.ifscCode,
      uanPfNumber: formData.uanPfNumber,
    },
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateCurrentStep()) return
    if (!token || !invite) return

    // Document Validation Gating disabled - all documents are optional

    try {
      setSubmitting(true)
      setError('')

      const formPayload = new FormData()
      formPayload.append('payload', JSON.stringify(buildPayload()))

      ONBOARDING_DOCUMENT_FIELDS.forEach((field) => {
        const file = files[field.key]
        if (file) {
          formPayload.append(field.key, file)
        }
      })

      const nextInvite = await onboardingApi.submitOnboarding(token, formPayload)
      setSubmittedInvite(nextInvite)
      setInvite(nextInvite)
      addToast('success', 'Onboarding submitted', 'Your submission has been shared with HR for review.')
      clearCandidateDraft()
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit onboarding details.'
      setError(message)
      addToast('error', 'Submission failed', message)
    } finally {
      setSubmitting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStepMeta.key) {
      case 'personal':
        return (
          <div className="form-grid">
            <label>
              First Name
              <Input value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} required />
            </label>
            <label>
              Last Name
              <Input value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} required />
            </label>
            <label>
              Gender
              <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} required>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
            <label>
              Date of Birth
              <Input type="date" value={formData.dob} onChange={(e) => updateField('dob', e.target.value)} required />
            </label>
            <label>
              Marital Status
              <select value={formData.maritalStatus} onChange={(e) => updateField('maritalStatus', e.target.value)} required>
                <option value="">Select status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </label>
            <label>
              Nationality
              <Input value={formData.nationality} onChange={(e) => updateField('nationality', e.target.value)} required />
            </label>
            <label>
              Personal Email
              <Input type="email" value={formData.personalEmail} onChange={(e) => updateField('personalEmail', e.target.value)} required />
            </label>
            <label>
              Phone Number
              <Input value={formData.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} required />
            </label>
            <label>
              Emergency Contact
              <Input value={formData.emergencyContact} onChange={(e) => updateField('emergencyContact', e.target.value)} required />
            </label>
          </div>
        )

      case 'address':
        return (
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              Current Address
              <textarea
                rows={3}
                value={formData.currentAddress}
                onChange={(e) => updateField('currentAddress', e.target.value)}
                required
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Permanent Address
              <textarea
                rows={3}
                value={formData.permanentAddress}
                onChange={(e) => updateField('permanentAddress', e.target.value)}
                required
              />
            </label>
            <label>
              City
              <Input value={formData.city} onChange={(e) => updateField('city', e.target.value)} required />
            </label>
            <label>
              State
              <Input value={formData.state} onChange={(e) => updateField('state', e.target.value)} required />
            </label>
            <label>
              Country
              <Input value={formData.country} onChange={(e) => updateField('country', e.target.value)} required />
            </label>
            <label>
              Pincode
              <Input value={formData.pincode} onChange={(e) => updateField('pincode', e.target.value)} required />
            </label>
          </div>
        )

      case 'employment':
        return (
          <div className="form-grid">
            <label>
              Employee ID
              <Input value={formData.employeeId} readOnly placeholder="Auto-generated after final approval" className="bg-slate-100" />
            </label>
            <label>
              Department
              <Input value={formData.department} readOnly className="bg-slate-100" />
            </label>
            <label>
              Designation
              <Input value={formData.designation} readOnly className="bg-slate-100" />
            </label>
            <label>
              Employment Type
              <Input value={formData.employmentType} readOnly className="bg-slate-100" />
            </label>
            <label>
              Reporting Manager
              <Input
                value={formData.reportingManager}
                onChange={(e) => updateField('reportingManager', e.target.value)}
                placeholder="Name of your reporting manager"
              />
            </label>
            <label>
              Joining Date
              <Input value={formData.joiningDate} readOnly className="bg-slate-100" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Work Location
              <Input value={formData.workLocation} onChange={(e) => updateField('workLocation', e.target.value)} required />
            </label>
          </div>
        )

      case 'payroll':
        return (
          <div className="form-grid">
            <label>
              PAN Number
              <Input value={formData.panNumber} onChange={(e) => updateField('panNumber', e.target.value)} required />
            </label>
            <label>
              Aadhaar Number
              <Input value={formData.aadhaarNumber} onChange={(e) => updateField('aadhaarNumber', e.target.value)} required />
            </label>
            <label>
              Bank Name
              <Input value={formData.bankName} onChange={(e) => updateField('bankName', e.target.value)} required />
            </label>
            <label>
              Account Number
              <Input value={formData.accountNumber} onChange={(e) => updateField('accountNumber', e.target.value)} required />
            </label>
            <label>
              IFSC Code
              <Input value={formData.ifscCode} onChange={(e) => updateField('ifscCode', e.target.value)} required />
            </label>
            <label>
              UAN / PF Number
              <Input value={formData.uanPfNumber} onChange={(e) => updateField('uanPfNumber', e.target.value)} />
            </label>
          </div>
        )

      case 'documents':
        return <DocumentUploadComponent files={files} onChange={setFiles} disabled={submitting} />
    }
  }

  const statusTone = invite?.status === 'approved' ? 'badge-success' : invite?.status === 'rejected' || invite?.status === 'expired' ? 'badge-danger' : 'badge-info'

  if (loading) {
    return <LoadingSpinner />
  }

  if (error && !invite) {
    return (
      <main className="auth-split-container" style={{ minHeight: '100vh' }}>
        <div className="auth-glow-sphere-1" />
        <div className="auth-glow-sphere-2" />
        <div className="auth-grid-overlay" />
        <Card className="auth-card-luxury" style={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
          <CardHeader>
            <CardTitle>Onboarding Link Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Please contact the HR team to request a fresh secure onboarding link.
            </p>
            <div style={{ marginTop: '1.5rem' }}>
            <Button onClick={() => window.location.assign('/login')}>Back to Login</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (invite && invite.status !== 'pending') {
    return (
      <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '2rem' }}>
        <div className="auth-glow-sphere-1" />
        <div className="auth-glow-sphere-2" />
        <div className="auth-grid-overlay" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1120px', margin: '0 auto' }}>
          <div className="page-header">
            <div className="page-header-title">
              <h1>Onboarding Status</h1>
              <p>{invite.firstName} {invite.lastName} - {invite.personalEmail}</p>
            </div>
            <div className={`badge ${statusTone}`}>{invite.status}</div>
          </div>

          <div className="dashboard-grid">
            <Card>
              <CardHeader>
                <CardTitle>Submission Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="form-grid">
                  <label>
                    Candidate
                    <Input value={`${invite.firstName} ${invite.lastName}`} readOnly />
                  </label>
                  <label>
                    Requested Role
                    <Input value={`${invite.department} - ${invite.designation}`} readOnly />
                  </label>
                  <label>
                    Joining Date
                    <Input value={formatDate(invite.joiningDate)} readOnly />
                  </label>
                  <label>
                    Link Expires
                    <Input value={formatDate(invite.expiryAt)} readOnly />
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button onClick={() => window.location.assign('/login')}>
                    Go to Login
                  </Button>
                  <Button variant="outline" onClick={() => addToast('info', 'Contact HR', 'Please contact your HR representative for any onboarding updates.')}>
                    Contact HR
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {[
                    { label: 'Invite Created', done: true },
                    { label: 'Employee Submitted', done: !!invite.submittedAt },
                    { label: 'HR Under Review', done: ['under_review', 'verified', 'approved'].includes(invite.status) },
                    { label: 'Admin Approved', done: invite.status === 'approved' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 className={item.done ? 'text-emerald-600' : 'text-slate-300'} />
                      <span style={{ fontWeight: 600, color: item.done ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {submittedInvite ? (
            <Card style={{ marginTop: '1.5rem' }}>
              <CardHeader>
                <CardTitle>Submission Received</CardTitle>
              </CardHeader>
              <CardContent>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Your onboarding details and documents are now with HR. You can safely close this page while the verification workflow continues.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="fixed right-6 top-6 z-50 flex w-[360px] max-w-[90vw] flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-2xl border bg-white p-4 shadow-2xl"
              style={{
                borderColor:
                  toast.tone === 'success'
                    ? 'rgba(16,185,129,0.2)'
                    : toast.tone === 'error'
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(37,99,235,0.2)',
              }}
            >
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    toast.tone === 'success'
                      ? 'var(--success)'
                      : toast.tone === 'error'
                      ? 'var(--error)'
                      : 'var(--primary)',
                }}
              >
                {toast.title}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">{toast.message}</p>
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '2rem' }}>
      <div className="auth-glow-sphere-1" />
      <div className="auth-glow-sphere-2" />
      <div className="auth-grid-overlay" />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1380px', margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-title">
            <h1>Employee Onboarding</h1>
            <p>{invite?.firstName} {invite?.lastName} secure onboarding workspace.</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span className={`badge ${statusTone}`}>{invite?.status ?? 'pending'}</span>
            <span className="badge badge-info">{formatDate(invite?.expiryAt ?? new Date())}</span>
          </div>
        </div>

        <div className="dashboard-grid" style={{ alignItems: 'start' }}>
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <CardTitle>Complete your onboarding</CardTitle>
                  <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                    Fill the secure form below and upload your documents to move the workflow forward.
                  </p>
                </div>
                <div style={{ minWidth: 180 }}>
                  <div className="badge badge-info" style={{ width: '100%', justifyContent: 'center' }}>
                    Step {currentStep + 1} of {STEPS.length}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.2)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercentage}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      transition: 'width 240ms ease',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                  {STEPS.map((step, index) => {
                    const Icon = step.icon
                    const active = index === currentStep
                    const done = index < currentStep
                    return (
                      <div
                        key={step.key}
                        style={{
                          border: `1px solid ${active ? 'rgba(37,99,235,0.25)' : 'rgba(148,163,184,0.15)'}`,
                          background: active ? 'rgba(37,99,235,0.05)' : 'rgba(255,255,255,0.72)',
                          borderRadius: '1rem',
                          padding: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '999px',
                              display: 'grid',
                              placeItems: 'center',
                              background: done
                                ? 'rgba(16,185,129,0.12)'
                                : active
                                ? 'rgba(37,99,235,0.12)'
                                : 'rgba(148,163,184,0.1)',
                              color: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--text-muted)',
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>{step.title}</p>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{step.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                {renderStepContent()}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-medium text-slate-500">
                  Allowed files: pdf, jpg, jpeg, png. Documents are uploaded to a private onboarding vault and reviewed by HR before final approval.
                </div>

                {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 0 || submitting}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    {currentStep < STEPS.length - 1 ? (
                      <Button type="button" onClick={handleNext} disabled={submitting}>
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  {currentStep === STEPS.length - 1 ? (
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Submitting Securely...' : 'Submit Onboarding'}
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <Card>
              <CardHeader>
                <CardTitle>Invite Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '0.95rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Candidate</p>
                    <p style={{ marginTop: '0.35rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {invite?.firstName} {invite?.lastName}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Department</p>
                    <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{invite?.department}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Designation</p>
                    <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{invite?.designation}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Employment Type</p>
                    <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{invite?.employmentType}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Joining Date</p>
                    <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{formatDate(invite?.joiningDate ?? new Date())}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', fontWeight: 800 }}>Expected Base Salary</p>
                    <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{formatCurrency(invite?.baseSalary ?? 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'grid', gap: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <p>Secure tokenized link</p>
                  <p>Link expiry enforced</p>
                  <p>Document uploads are private and validated server-side</p>
                  <p>Submission is locked after successful submit to prevent duplicates</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="fixed right-6 top-6 z-50 flex w-[360px] max-w-[90vw] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl border bg-white p-4 shadow-2xl"
            style={{
              borderColor:
                toast.tone === 'success'
                  ? 'rgba(16,185,129,0.2)'
                  : toast.tone === 'error'
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(37,99,235,0.2)',
            }}
          >
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{
                color:
                  toast.tone === 'success'
                    ? 'var(--success)'
                    : toast.tone === 'error'
                    ? 'var(--error)'
                    : 'var(--primary)',
              }}
            >
              {toast.title}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{toast.message}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
