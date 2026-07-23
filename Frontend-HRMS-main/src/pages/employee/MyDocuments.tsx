import React, { useState, useEffect, useRef } from 'react'
import { FileBadge, ShieldCheck, Clock, FileWarning, Upload, FileText, CheckCircle2, RefreshCw, X, Building2 } from 'lucide-react'
import { employeeApi } from '../../api/employee.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'

interface DocumentItem {
  id: string
  name: string
  fileName: string | null
  fileUrl?: string
  status: 'PENDING_UPLOAD' | 'PENDING_VERIFICATION' | 'VERIFIED'
  fileSize?: string
  uploadedDate?: string
}

export default function MyDocuments() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfileAndDocs = async () => {
    try {
      const res = await employeeApi.getProfile()
      const emp = res.data.data
      setEmployee(emp)

      const hrDocs = emp.documents || []
      const documentTypes = [
        { key: 'aadhaarCard', name: 'Aadhaar Card (National ID)' },
        { key: 'panCard', name: 'PAN Card (Tax Registration)' },
        { key: 'resume', name: 'Latest Resume / CV' },
        { key: 'offerLetter', name: 'Signed Employment Offer Letter' },
        { key: 'previousPayslips', name: 'Previous Employment Payslips' }
      ]

      const mappedDocs: DocumentItem[] = documentTypes.map((type) => {
        const found = hrDocs.find((d: any) => d.type === type.key)
        return {
          id: type.key,
          name: type.name,
          fileName: found ? found.name : null,
          fileUrl: found ? found.fileUrl : undefined,
          status: found ? (found.verified ? 'VERIFIED' : 'PENDING_VERIFICATION') : 'PENDING_UPLOAD',
          fileSize: found && found.fileSize ? `${(found.fileSize / 1024 / 1024).toFixed(2)} MB` : undefined, 
          uploadedDate: found ? new Date(found.uploadedAt).toISOString().split('T')[0] : undefined
        }
      })

      setDocs(mappedDocs)
    } catch (err: any) {
      console.error('Failed to load documents and profile details', err)
      setError('Failed to fetch your dynamic credentials and bank coordinates.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfileAndDocs()
  }, [])

  const handleUploadClick = (docId: string) => {
    setUploadingDocId(docId)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !uploadingDocId) return

    const file = files[0]
    setUploadProgress(0)

    // Simulate progress bar for smooth micro-interaction
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 80)

    try {
      const fd = new FormData()
      fd.append('documentType', uploadingDocId)
      fd.append('file', file)

      await employeeApi.uploadDocument(fd)

      clearInterval(interval)
      setUploadProgress(100)
      
      // Delay slightly to show 100% completion before close
      setTimeout(() => {
        fetchProfileAndDocs()
        setUploadingDocId(null)
        setUploadProgress(0)
      }, 400)
    } catch (err: any) {
      clearInterval(interval)
      setError(err.response?.data?.message || 'Failed to upload document. Please check the file size and try again.')
      setUploadingDocId(null)
      setUploadProgress(0)
    }
  }

  const cancelUpload = () => {
    setUploadingDocId(null)
    setUploadProgress(0)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="documents-page">
      <div className="documents-header">
        <div className="header-title">
          <h1>My Onboarding Documents</h1>
          <p>Verify and manage your identity files, contract credentials, and tax records.</p>
        </div>
      </div>

      <div className="doc-verification-status-panel">
        <div className="status-header">
          <ShieldCheck className="text-green" size={24} />
          <div className="status-info">
            <h3>Identity & Contract Verification</h3>
            <p>Your secure onboarding documents have been logged and verified by HR Operations.</p>
          </div>
          <span className="badge-verified">SECURE PORTAL</span>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ display: 'flex', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#991b1b', marginBottom: '24px', fontWeight: 600, fontSize: '0.85rem' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Invisible file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {/* Uploading Progress Modal Overlay */}
      {uploadingDocId && uploadProgress > 0 && (
        <div className="upload-progress-backdrop">
          <div className="progress-card">
            <div className="progress-header">
              <h4>Uploading Document...</h4>
              <button className="cancel-btn" onClick={cancelUpload}><X size={16} /></button>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <div className="progress-details">
              <span>Progress: {uploadProgress}%</span>
              <RefreshCw size={14} className="animate-spin text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* Documents Grid */}
      <div className="docs-grid">
        {docs.map((doc) => (
          <div key={doc.id} className={`doc-card ${doc.status.toLowerCase().replace('_', '-')}`}>
            <div className="doc-card-body">
              <div className="doc-icon-col">
                <FileText size={32} />
              </div>
              <div className="doc-info-col">
                <div className="doc-status-row">
                  <span className="doc-id">{doc.id.toUpperCase()}</span>
                  <span className={`status-badge ${doc.status.toLowerCase().replace('_', '-')}`}>
                    {doc.status === 'VERIFIED' && <ShieldCheck size={12} />}
                    {doc.status === 'PENDING_VERIFICATION' && <Clock size={12} />}
                    {doc.status === 'PENDING_UPLOAD' && <FileWarning size={12} />}
                    <span>{doc.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <h4 className="doc-title">{doc.name}</h4>
                {doc.fileName ? (
                  <div className="file-metadata">
                    <span className="file-name">
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="doc-download-link">
                        {doc.fileName}
                      </a>
                    </span>
                    <span className="uploaded-date">Uploaded: {doc.uploadedDate}</span>
                  </div>
                ) : (
                  <p className="no-file-text">No document file submitted yet.</p>
                )}
              </div>
            </div>
            
            <div className="doc-card-footer">
              {doc.status === 'PENDING_UPLOAD' ? (
                <button className="btn-action-primary" onClick={() => handleUploadClick(doc.id)}>
                  <Upload size={14} />
                  <span>Upload Document</span>
                </button>
              ) : (
                <button className="btn-action-outline" onClick={() => handleUploadClick(doc.id)}>
                  <Upload size={14} />
                  <span>Replace Document</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bank Account Details Section */}
      {employee && employee.payrollDetails && (
        <div className="bank-details-section">
          <div className="bank-header">
            <Building2 size={24} className="text-blue-500" />
            <div className="bank-info-header">
              <h3>Salary Disbursement Account</h3>
              <p>Registered financial details for salary payroll operations.</p>
            </div>
          </div>
          <div className="bank-details-grid">
            <div className="bank-field">
              <span className="bank-label">Bank Name</span>
              <strong className="bank-value">{employee.payrollDetails.bankName || 'Not Provided'}</strong>
            </div>
            <div className="bank-field">
              <span className="bank-label">Account Number</span>
              <strong className="bank-value">{employee.payrollDetails.accountNumber || 'Not Provided'}</strong>
            </div>
            <div className="bank-field">
              <span className="bank-label">IFSC Code</span>
              <strong className="bank-value">{employee.payrollDetails.ifscCode || 'Not Provided'}</strong>
            </div>
            <div className="bank-field">
              <span className="bank-label">Disbursement Mode</span>
              <strong className="bank-value">{employee.payrollDetails.paymentType || 'Bank Transfer'}</strong>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .documents-page {
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .documents-header { margin-bottom: 24px; }
        .documents-header h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .documents-header p { color: #64748b; font-size: 0.9rem; margin: 0; }

        .doc-verification-status-panel {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .status-header { display: flex; align-items: center; gap: 16px; }
        .status-info { flex: 1; }
        .status-info h3 { margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 800; color: #14532d; }
        .status-info p { margin: 0; font-size: 0.85rem; color: #166534; }
        .text-green { color: #10b981; }

        .badge-verified {
          font-size: 0.72rem;
          font-weight: 800;
          background: #14532d;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .docs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .doc-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
          overflow: hidden;
          transition: all 0.2s;
        }

        .doc-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .doc-card-body {
          padding: 24px;
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .doc-icon-col {
          color: #94a3b8;
          display: flex;
          align-items: flex-start;
        }

        .verified .doc-icon-col { color: #22c55e; }
        .pending-verification .doc-icon-col { color: #3b82f6; }
        .pending-upload .doc-icon-col { color: #f97316; }

        .doc-info-col { flex: 1; display: flex; flex-direction: column; }
        
        .doc-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .doc-id { font-size: 0.72rem; font-family: monospace; color: #94a3b8; font-weight: 700; }
        
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .status-badge.verified { background: #dcfce3; color: #15803d; }
        .status-badge.pending-verification { background: #eff6ff; color: #2563eb; }
        .status-badge.pending-upload { background: #fff7ed; color: #ea580c; }

        .doc-title {
          margin: 0 0 8px 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.4;
        }

        .file-metadata {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.78rem;
          color: #64748b;
        }

        .file-name { font-weight: 600; color: #334155; word-break: break-all; }
        .uploaded-date { font-size: 0.72rem; color: #94a3b8; }

        .no-file-text { margin: 0; font-size: 0.8rem; color: #94a3b8; font-weight: 500; }

        .doc-card-footer {
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          padding: 12px 24px;
          display: flex;
          justify-content: flex-end;
        }

        .btn-action-primary {
          background: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.2s;
        }
        .btn-action-primary:hover { background: #1d4ed8; }

        .btn-action-outline {
          background: white; border: 1px solid #cbd5e1; color: #64748b; padding: 6px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;
        }
        .btn-action-outline:hover { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }

        /* Uploading Progress Backdrop */
        .upload-progress-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15,23,42,0.3);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .progress-card {
          background: white; border-radius: 12px; padding: 24px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .progress-header h4 { margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; }
        
        .cancel-btn { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; }
        .cancel-btn:hover { color: #ef4444; }

        .progress-bar-track { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
        .progress-bar-fill { height: 100%; background: #2563eb; border-radius: 3px; transition: width 0.15s ease-out; }

        .progress-details { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; color: #64748b; }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }

        .doc-download-link {
          color: #2563eb;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .doc-download-link:hover {
          color: #1d4ed8;
        }

        /* Bank Details Styling */
        .bank-details-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 24px;
          margin-top: 32px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
        }

        .bank-header {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }

        .bank-info-header h3 {
          margin: 0 0 4px 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .bank-info-header p {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
        }

        .bank-details-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .bank-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bank-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .bank-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
        }
      `}</style>
    </div>
  )
}
