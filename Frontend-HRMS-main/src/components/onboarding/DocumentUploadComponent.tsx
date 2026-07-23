import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Paperclip, Upload, X, FileText, Image as ImageIcon } from 'lucide-react'

import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

export const ONBOARDING_DOCUMENT_FIELDS = [
  { key: 'profilePhoto', label: 'Profile Photo', hint: 'JPG, JPEG, PNG' },
  { key: 'resume', label: 'Resume', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'aadhaar', label: 'Aadhaar', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'panCard', label: 'PAN Card', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'educationCertificates', label: 'Education Certificates', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'experienceLetters', label: 'Experience Letters', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'offerLetterSignedCopy', label: 'Offer Letter Signed Copy', hint: 'PDF, JPG, JPEG, PNG' },
  { key: 'previousPayslips', label: 'Previous Payslips', hint: 'PDF, JPG, JPEG, PNG' },
] as const

export type OnboardingDocumentKey = (typeof ONBOARDING_DOCUMENT_FIELDS)[number]['key']
export type FileState = Record<OnboardingDocumentKey, File | null>

type Props = {
  files: FileState
  onChange: (next: FileState) => void
  disabled?: boolean
}

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])

const emptyErrors = ONBOARDING_DOCUMENT_FIELDS.reduce((acc, field) => {
  acc[field.key] = ''
  return acc
}, {} as Record<OnboardingDocumentKey, string>)

const emptyPreviews = ONBOARDING_DOCUMENT_FIELDS.reduce((acc, field) => {
  acc[field.key] = null
  return acc
}, {} as Record<OnboardingDocumentKey, string | null>)

export function DocumentUploadComponent({ files, onChange, disabled = false }: Props) {
  const [errors, setErrors] = useState(emptyErrors)
  const [previews, setPreviews] = useState<Record<OnboardingDocumentKey, string | null>>(emptyPreviews)

  useEffect(() => {
    const nextPreviews = {} as Record<OnboardingDocumentKey, string | null>

    ONBOARDING_DOCUMENT_FIELDS.forEach((field) => {
      const file = files[field.key]
      if (file && file.type.startsWith('image/')) {
        nextPreviews[field.key] = URL.createObjectURL(file)
      } else {
        nextPreviews[field.key] = null
      }
    })

    setPreviews(nextPreviews)

    return () => {
      Object.values(nextPreviews).forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview)
      })
    }
  }, [files])

  const fileCount = useMemo(
    () => ONBOARDING_DOCUMENT_FIELDS.filter((field) => !!files[field.key]).length,
    [files]
  )

  const updateFile = (fieldKey: OnboardingDocumentKey, file: File | null) => {
    if (disabled) return
    if (file && !allowedMimeTypes.has(file.type)) {
      setErrors((prev) => ({ ...prev, [fieldKey]: 'Only pdf, jpg, jpeg, and png files are allowed.' }))
      return
    }

    setErrors((prev) => ({ ...prev, [fieldKey]: '' }))
    onChange({ ...files, [fieldKey]: file })
  }

  const handleDrop = (fieldKey: OnboardingDocumentKey, event: DragEvent<HTMLDivElement>) => {
    if (disabled) return
    event.preventDefault()
    const file = event.dataTransfer.files?.[0] || null
    updateFile(fieldKey, file)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
        <div>
          <p className="text-sm font-black text-slate-900">Document Upload</p>
          <p className="text-xs font-medium text-slate-500">Upload all supporting files in pdf, jpg, jpeg, or png format.</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
          {fileCount}/{ONBOARDING_DOCUMENT_FIELDS.length} uploaded
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ONBOARDING_DOCUMENT_FIELDS.map((field) => {
          const file = files[field.key]
          const preview = previews[field.key]
          return (
            <div
              key={field.key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(field.key, event)}
              className={cn(
                'rounded-2xl border border-dashed p-4 transition-all',
                file ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 shadow-sm">
                  {field.key === 'profilePhoto' ? (
                    <ImageIcon className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <FileText className="h-4 w-4 text-indigo-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900">{field.label}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{field.hint}</p>

                  {file ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
                        <Paperclip className="h-4 w-4 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{file.name}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateFile(field.key, null)}
                          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {preview && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <img src={preview} alt={`${field.label} preview`} className="h-32 w-full object-cover" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className={cn(
                      'mt-3 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-6 text-center',
                      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    )}>
                      <Upload className="h-5 w-5 text-indigo-500" />
                      <span className="mt-2 text-xs font-bold text-slate-700">Drag & drop or click to upload</span>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Secure upload</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        disabled={disabled}
                        onChange={(event) => updateFile(field.key, event.target.files?.[0] || null)}
                      />
                    </label>
                  )}

                  {errors[field.key] ? <p className="mt-2 text-xs font-semibold text-rose-600">{errors[field.key]}</p> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs font-medium text-slate-500">
        Uploaded documents are validated on the server and stored in a private onboarding vault.
      </div>
    </div>
  )
}
