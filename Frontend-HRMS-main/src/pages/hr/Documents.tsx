import React, { useEffect, useState, useRef } from 'react'
import { FileText, Search, ExternalLink, CheckCircle, Clock, Upload, RefreshCw, X, Folder, ArrowLeft, Trash2, ShieldAlert, Download } from 'lucide-react'
import { documentApi, DocumentData } from '../../api/document.api'
import { employeeApi, Employee } from '../../api/employee.api'

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')

export default function HRDocuments() {
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeEmployeeId, setActiveEmployeeId] = useState<string | null>(null)
  
  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [docType, setDocType] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Replace Ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      const res = await documentApi.list()
      setDocuments(res.data.data)
    } catch (err) {
      console.error('Failed to load documents', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await employeeApi.list()
      setEmployees(res.data.data)
    } catch (err) {
      console.error('Failed to load employees', err)
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchEmployees()
  }, [])

  const handleDeleteFolderClick = async (empId: string, empName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the employee "${empName}" and their disk folder/documents? This action cannot be undone.`)) {
      return
    }
    setLoading(true)
    try {
      await employeeApi.delete(empId)
      await Promise.all([fetchDocuments(), fetchEmployees()])
    } catch (err: any) {
      console.error('Failed to delete employee folder', err)
      alert(err.response?.data?.message || 'Failed to delete employee folder.')
      setLoading(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !selectedEmployeeId || !docType) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('employeeId', selectedEmployeeId)
      fd.append('type', docType)
      await documentApi.upload(fd)
      setIsModalOpen(false)
      setUploadFile(null)
      setSelectedEmployeeId('')
      setDocType('')
      fetchDocuments()
    } catch (err: any) {
      console.error('Upload failed', err)
      alert(err.response?.data?.message || 'Upload failed. Please check your network or file type.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleReplaceClick = (docId: string) => {
    setReplacingDocId(docId)
    if (fileInputRef.current) fileInputRef.current.click()
  }

  const handleFileChangeForReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !replacingDocId) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await documentApi.replace(replacingDocId, fd)
      fetchDocuments()
    } catch (err: any) {
      console.error('Replace failed', err)
      alert(err.response?.data?.message || 'Replace failed')
    } finally {
      setIsUploading(false)
      setReplacingDocId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteClick = async (docId: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the document "${docName}"? This action cannot be undone.`)) {
      return
    }
    setLoading(true)
    try {
      await documentApi.delete(docId)
      fetchDocuments()
    } catch (err) {
      console.error('Failed to delete document', err)
      alert('Failed to delete document.')
      setLoading(false)
    }
  }

  const handleVerifyClick = async (docId: string) => {
    setLoading(true)
    try {
      await documentApi.verify(docId)
      fetchDocuments()
    } catch (err: any) {
      console.error('Failed to verify document', err)
      alert(err.response?.data?.message || 'Failed to verify document')
      setLoading(false)
    }
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${fileUrl}`)
      if (!response.ok) throw new Error('Failed to fetch file')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      window.open(`${API_BASE_URL}${fileUrl}`, '_blank')
    }
  }

  // Pre-fill employee in modal when folder is active
  const openUploadModal = () => {
    if (activeEmployeeId) {
      setSelectedEmployeeId(activeEmployeeId)
    }
    setIsModalOpen(true)
  }

  // Grouping logic: Ensure folder for every employee
  const groupedData: Record<string, { employee: Employee; docs: DocumentData[] }> = {}
  employees.forEach(emp => {
    groupedData[emp.id] = {
      employee: emp,
      docs: []
    }
  })

  documents.forEach(doc => {
    if (groupedData[doc.employeeId]) {
      groupedData[doc.employeeId].docs.push(doc)
    } else if (doc.employee) {
      groupedData[doc.employeeId] = {
        employee: doc.employee as any,
        docs: [doc]
      }
    }
  })

  // Folders list
  const folders = Object.values(groupedData)

  // Filter folders in folder list, or filter documents inside active folder
  const term = searchTerm.toLowerCase()
  const filteredFolders = folders.filter(f => {
    return (
      f.employee.firstName.toLowerCase().includes(term) ||
      f.employee.lastName.toLowerCase().includes(term) ||
      f.employee.employeeCode.toLowerCase().includes(term)
    )
  })

  const activeFolder = activeEmployeeId ? groupedData[activeEmployeeId] : null
  const activeDocsFiltered = activeFolder
    ? activeFolder.docs.filter(doc => doc.name.toLowerCase().includes(term) || doc.type.toLowerCase().includes(term))
    : []

  return (
    <div className="page-container" style={{ padding: '30px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChangeForReplace} />

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            HR Document Explorer
          </h1>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '15px' }}>
            {activeFolder 
              ? `Documents for ${activeFolder.employee.firstName} ${activeFolder.employee.lastName}` 
              : 'Physical folders automatically organized on disk by Employee Code & Name.'}
          </p>
        </div>
        <button
          onClick={openUploadModal}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
            color: '#fff', 
            padding: '12px 24px', 
            borderRadius: '10px', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
            transition: 'transform 0.2s'
          }}
        >
          <Upload size={18} /> Upload Document
        </button>
      </div>

      {/* EXPLORER BAR */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', background: '#fff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {activeFolder && (
          <button
            onClick={() => { setActiveEmployeeId(null); setSearchTerm(''); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: '#f1f5f9', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              color: '#334155', 
              fontWeight: '600', 
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <ArrowLeft size={16} /> Back to Folders
          </button>
        )}
        
        <div style={{ position: 'relative', flex: 1, maxWidth: '450px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={activeFolder ? "Search documents in this folder..." : "Search folders by Employee Code or Name..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '11px 12px 11px 44px', 
              borderRadius: '10px', 
              border: '1px solid #cbd5e1', 
              outline: 'none',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', animation: 'spin 1.5s linear infinite' }} />
          Loading Document System...
        </div>
      ) : (
        <>
          {/* VIEW 1: FOLDER LIST VIEW */}
          {!activeFolder && (
            <div>
              {filteredFolders.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', padding: '60px 40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <Folder size={64} style={{ color: '#cbd5e1', margin: '0 auto 18px' }} />
                  <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '700', margin: 0 }}>No Folders Found</h3>
                  <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>No employees found matching the search query.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {filteredFolders.map(({ employee, docs }) => (
                    <div
                      key={employee.id}
                      onClick={() => { setActiveEmployeeId(employee.id); setSearchTerm(''); }}
                      style={{ 
                        background: '#fff', 
                        borderRadius: '16px', 
                        border: '1.5px solid #e2e8f0', 
                        padding: '24px', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                      className="folder-card"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)'
                        e.currentTarget.style.borderColor = '#4f46e5'
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(79,70,229,0.06)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                          <div style={{ 
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                            color: '#d97706', 
                            width: '56px', 
                            height: '56px', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Folder size={28} style={{ margin: 'auto' }} />
                          </div>
                          <div style={{ overflow: 'hidden', minWidth: 0 }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '3px', fontWeight: '500' }}>
                              {employee.employeeCode}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolderClick(employee.id, `${employee.firstName} ${employee.lastName}`);
                          }}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            color: '#991b1b',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                            e.currentTarget.style.borderColor = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#fecaca';
                          }}
                          title="Delete Employee & Folder"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '20px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                          Disk Folder Created
                        </span>
                        <span style={{ 
                          background: docs.length > 0 ? '#eef2ff' : '#f1f5f9', 
                          color: docs.length > 0 ? '#4f46e5' : '#64748b', 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '700' 
                        }}>
                          {docs.length} file{docs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: ACTIVE FOLDER CONTENTS VIEW */}
          {activeFolder && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Folder size={22} style={{ color: '#d97706' }} />
                  <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>
                    {activeFolder.employee.employeeCode} — {activeFolder.employee.firstName} {activeFolder.employee.lastName} Folder
                  </span>
                </div>
                <span style={{ background: '#4f46e5', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                  {activeFolder.docs.length} File{activeFolder.docs.length !== 1 ? 's' : ''} Stored
                </span>
              </div>

              {activeDocsFiltered.length === 0 ? (
                <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                  <FileText size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
                  <h3 style={{ color: '#475569', fontSize: '17px', fontWeight: '700' }}>No Documents in this Folder</h3>
                  <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>HR can upload employee credentials directly into this folder.</p>
                  <button
                    onClick={openUploadModal}
                    style={{ marginTop: '20px', background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Upload Document Now
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <tr>
                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Document Name</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Type</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Size</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Uploaded At</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700' }}>Status</th>
                        <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '14px', color: '#334155' }}>
                      {activeDocsFiltered.map((doc) => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                              <FileText size={18} />
                            </div>
                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{doc.name}</div>
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {doc.type}
                            </span>
                          </td>
                          <td style={{ padding: '16px 24px', color: '#64748b' }}>
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '—'}
                          </td>
                          <td style={{ padding: '16px 24px', color: '#64748b' }}>
                            {new Date(doc.uploadedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '16px 24px' }}>
                            {doc.verified ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '13px', fontWeight: '600' }}>
                                <CheckCircle size={14} /> Approved
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '13px', fontWeight: '600' }}>
                                <Clock size={14} /> Pending Review
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <a
                                href={`${API_BASE_URL}${doc.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', textDecoration: 'none', fontWeight: '600', fontSize: '13px' }}
                              >
                                <ExternalLink size={14} /> View
                              </a>
                              <button
                                onClick={() => handleDownload(doc.fileUrl, doc.name)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', color: '#1d4ed8', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                              >
                                <Download size={14} /> Download
                              </button>
                              {!doc.verified && (
                                <button
                                  onClick={() => handleVerifyClick(doc.id)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#059669', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                                >
                                  <CheckCircle size={14} /> Verify
                                </button>
                              )}
                              <button
                                disabled={isUploading && replacingDocId === doc.id}
                                onClick={() => handleReplaceClick(doc.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#b45309', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                              >
                                <RefreshCw size={14} /> {(isUploading && replacingDocId === doc.id) ? 'Replacing...' : 'Replace'}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(doc.id, doc.name)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '440px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>Upload Employee Document</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Target Employee</label>
                <select 
                  value={selectedEmployeeId} 
                  onChange={e => setSelectedEmployeeId(e.target.value)} 
                  required 
                  disabled={!!activeEmployeeId}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '14px' }}
                >
                  <option value="">Select an Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Document Category</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                  <option value="">Select Document Type...</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Resume">Resume</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="Experience Letter">Experience Letter</option>
                  <option value="Educational Certificate">Educational Certificate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Select Physical File</label>
                <div style={{ border: '2px dashed #cbd5e1', padding: '20px', borderRadius: '10px', background: '#f8fafc', textAlign: 'center' }}>
                  <input type="file" required onChange={e => setUploadFile(e.target.files?.[0] || null)} style={{ width: '100%', cursor: 'pointer' }} />
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>PDF, JPG, PNG, DOCX up to 10MB</p>
                </div>
              </div>

              <button 
                disabled={isUploading} 
                type="submit" 
                style={{ 
                  marginTop: '10px', 
                  padding: '14px', 
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontWeight: '700', 
                  fontSize: '15px', 
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
                }}
              >
                {isUploading ? 'Uploading file securely...' : 'Upload Document to Folder'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
