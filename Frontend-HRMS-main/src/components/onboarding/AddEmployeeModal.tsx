import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Copy, X } from 'lucide-react'

import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { onboardingApi, type OnboardingInvite } from '../../api/onboarding.api'
import { cn } from '../../lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: (invite: OnboardingInvite) => void
  standalone?: boolean
  creatorLabel?: string
  reviewPath?: string
}

const initialForm = {
  firstName: '',
  lastName: '',
  personalEmail: '',
  phoneNumber: '',
  department: 'Engineering',
  designation: 'Software Engineer',
  employmentType: 'Full-time',
  joiningDate: new Date().toISOString().slice(0, 10),
  baseSalary: 45000,
  experienceLevel: 'fresher',
}

export function AddEmployeeModal({ open, onClose, onCreated, standalone = false, creatorLabel = 'Team', reviewPath }: Props) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('onboard_modal_draft')
    if (saved) {
      try {
        return { ...initialForm, ...JSON.parse(saved) }
      } catch (e) {
        return initialForm
      }
    }
    return initialForm
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successInvite, setSuccessInvite] = useState<OnboardingInvite | null>(null)
  const [copyLabel, setCopyLabel] = useState('Copy Link')

  const onboardingUrl = successInvite?.onboardingUrl || ''

  const resetState = () => {
    setFormData(initialForm)
    localStorage.removeItem('onboard_modal_draft')
    setError('')
    setSuccessInvite(null)
    setCopyLabel('Copy Link')
  }

  useEffect(() => {
    localStorage.setItem('onboard_modal_draft', JSON.stringify(formData))
  }, [formData])

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleCopy = async () => {
    if (!onboardingUrl) return
    await navigator.clipboard.writeText(onboardingUrl)
    setCopyLabel('Copied')
    setTimeout(() => setCopyLabel('Copy Link'), 1800)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const invite = await onboardingApi.createInvite({
        ...formData,
        baseSalary: Number(formData.baseSalary) || 0,
      })
      setSuccessInvite(invite)
      onCreated?.(invite)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create onboarding invitation.')
    } finally {
      setLoading(false)
    }
  }

  const shellClass = useMemo(() => {
    return standalone
      ? 'w-full'
      : cn('fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm')
  }, [standalone])

  if (!open && !standalone) return null

  return (
    <div className={shellClass}>
      <Card className={cn('w-full overflow-hidden border-slate-200 shadow-2xl', standalone ? 'max-w-4xl' : 'max-w-3xl')}>
        <CardHeader className="flex flex-row items-start justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-5">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">Add Employee</CardTitle>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{creatorLabel} onboarding invitation</p>
          </div>
          {!standalone ? (
            <button onClick={handleClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </CardHeader>

        <CardContent className="p-6">
          {successInvite ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-base font-black text-emerald-900">Onboarding link generated successfully</p>
                    <p className="mt-1 text-sm font-medium text-emerald-800">
                      A secure onboarding email has been sent to {successInvite.personalEmail}. The invite expires on{' '}
                      {new Date(successInvite.expiryAt).toLocaleDateString()}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Secure Link</p>
                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <Input readOnly value={onboardingUrl} className="bg-white" />
                  <Button type="button" variant="outline" onClick={handleCopy} className="shrink-0">
                    <Copy className="mr-2 h-4 w-4" />
                    {copyLabel}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Candidate</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {successInvite.firstName} {successInvite.lastName}
                  </p>
                  <p className="text-xs font-medium text-slate-500">{successInvite.designation}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p>
                  <p className="mt-2 text-sm font-bold text-indigo-600 capitalize">{successInvite.status}</p>
                  <p className="text-xs font-medium text-slate-500">Awaiting employee completion</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={handleClose}>Done</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetState()
                    setSuccessInvite(null)
                  }}
                >
                  Add Another Employee
                </Button>
                {reviewPath ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      handleClose()
                      navigate(reviewPath)
                    }}
                  >
                    Open Onboarding Panel
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">First Name</span>
                  <Input
                    value={formData.firstName}
                    onChange={(event) => setFormData({ ...formData, firstName: event.target.value })}
                    placeholder="Aarav"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Last Name</span>
                  <Input
                    value={formData.lastName}
                    onChange={(event) => setFormData({ ...formData, lastName: event.target.value })}
                    placeholder="Patel"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Personal Email</span>
                  <Input
                    type="email"
                    value={formData.personalEmail}
                    onChange={(event) => setFormData({ ...formData, personalEmail: event.target.value })}
                    placeholder="aarav.personal@example.com"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Phone Number</span>
                  <Input
                    value={formData.phoneNumber}
                    onChange={(event) => setFormData({ ...formData, phoneNumber: event.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Department</span>
                  <Input
                    value={formData.department}
                    onChange={(event) => setFormData({ ...formData, department: event.target.value })}
                    placeholder="Engineering"
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Designation</span>
                  <Input
                    value={formData.designation}
                    onChange={(event) => setFormData({ ...formData, designation: event.target.value })}
                    placeholder="Software Engineer"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Employment Type</span>
                  <select
                    value={formData.employmentType}
                    onChange={(event) => setFormData({ ...formData, employmentType: event.target.value })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Probation">Probation</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Experience Level</span>
                  <select
                    value={formData.experienceLevel}
                    onChange={(event) => setFormData({ ...formData, experienceLevel: event.target.value })}
                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm"
                  >
                    <option value="fresher">Fresher</option>
                    <option value="experienced">Experienced</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Joining Date</span>
                  <Input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(event) => setFormData({ ...formData, joiningDate: event.target.value })}
                    required
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Base Salary</span>
                  <Input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(event) => setFormData({ ...formData, baseSalary: Number(event.target.value) })}
                    required
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-500">
                The system will generate a secure onboarding link and email it automatically after submission.
              </div>

              {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating Invite...' : 'Create Onboarding Invite'}
                </Button>
                {!standalone ? (
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
