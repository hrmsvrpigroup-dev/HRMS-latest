import React, { useState, useEffect } from 'react'
import { FilePlus2, CheckCircle2, AlertCircle, Clock, Send, ShieldAlert, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { triggerHrNotification } from '../../utils/notif'
import { employeeApi } from '../../api/employee.api'

interface RequestItem {
  id: string
  type: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export default function MyRequests() {
  const user = useAuthStore((state) => state.user)
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'An employee'
  const [requests, setRequests] = useState<RequestItem[]>([])
  
  // Form State
  const [type, setType] = useState('HARDWARE')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [description, setDescription] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchRequests = async () => {
    try {
      const res = await employeeApi.getRequests()
      if (res.data.success) {
        setRequests(res.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch requests', error)
    }
  }

  // Load from backend
  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (!description.trim()) {
      setErrorMsg('Please explain your request reason or details.')
      return
    }

    const typeLabels: Record<string, string> = {
      HARDWARE: 'Hardware Asset (MacBook Pro / Monitor)',
      SOFTWARE: 'Software License (IDE / Figma / Slack)',
      IDCARD: 'ID Card Replacement Request',
      LETTER: 'HR Verification Letter (Experience / NOC)'
    }

    try {
      const res = await employeeApi.createRequest({
        type: typeLabels[type] || type,
        priority,
        description
      })

      if (res.data.success) {
        setSuccessMsg('Request submitted successfully!')
        triggerHrNotification(`Employee ${fullName} submitted an operational request.`)
        setDescription('')
        fetchRequests()
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to submit request')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await employeeApi.deleteRequest(id)
      if (res.data.success) {
        triggerHrNotification(`Employee ${fullName} canceled request ${id}.`)
        fetchRequests()
      }
    } catch (error: any) {
      console.error('Failed to delete request', error)
      setErrorMsg(error.response?.data?.message || 'Failed to delete request')
    }
  }

  return (
    <div className="requests-page">
      <div className="requests-header">
        <div className="header-title">
          <h1>My Operations Requests</h1>
          <p>Submit software licenses, hardware procurement, or administrative verification document requests.</p>
        </div>
      </div>

      <div className="requests-grid">
        {/* Submit Form */}
        <div className="card form-card">
          <h3 className="section-title">
            <FilePlus2 size={18} className="text-blue-500" />
            <span>Create Operation Request</span>
          </h3>

          {successMsg && <div className="toast-success">✓ {successMsg}</div>}
          {errorMsg && <div className="toast-error">✕ {errorMsg}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Request Division</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="HARDWARE">Hardware Asset Procurement</option>
                <option value="SOFTWARE">Software Development License</option>
                <option value="IDCARD">ID Card Replacement / Reissue</option>
                <option value="LETTER">HR Documents / Work Verification Letter</option>
              </select>
            </div>

            <div className="form-group">
              <label>Urgency Level</label>
              <div className="radio-group">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => (
                  <label key={level} className={`radio-label ${priority === level ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="priority"
                      value={level}
                      checked={priority === level}
                      onChange={() => setPriority(level)}
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Specification Details & Reason</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of asset (e.g. 27 inch Dell Monitor, WebStorm License key, or Experience letter format)..."
              ></textarea>
            </div>

            <button type="submit" className="btn-submit">
              <Send size={16} />
              <span>Submit Request</span>
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="card list-card">
          <h3 className="section-title">
            <Clock size={18} className="text-gray-500" />
            <span>Request History Logs</span>
          </h3>

          <div className="requests-list">
            {requests.map((item) => (
              <div key={item.id} className="request-card">
                <div className="request-card-header">
                  <div className="req-type-col">
                    <span className="req-id">{item.id}</span>
                    <h4 className="req-type">{item.type}</h4>
                  </div>
                  <span className={`priority-badge ${item.priority.toLowerCase()}`}>{item.priority}</span>
                </div>
                
                <p className="req-desc">{item.description}</p>
                
                <div className="request-card-footer">
                  <span className="req-date">Submitted on: <strong>{new Date(item.createdAt).toLocaleDateString()}</strong></span>
                  <div className="req-footer-right">
                    <span className={`status-pill ${item.status.toLowerCase()}`}>
                      {item.status === 'APPROVED' && <CheckCircle2 size={12} />}
                      {item.status === 'PENDING' && <Clock size={12} />}
                      {item.status === 'REJECTED' && <AlertCircle size={12} />}
                      <span>{item.status}</span>
                    </span>
                    {item.status === 'PENDING' && (
                      <button className="btn-delete" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {requests.length === 0 && (
              <div className="empty-state">
                <ShieldAlert size={36} />
                <p>No operational requests logged yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .requests-page {
          padding: 24px 32px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .requests-header { margin-bottom: 24px; }
        .requests-header h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .requests-header p { color: #64748b; font-size: 0.9rem; margin: 0; }

        .requests-grid {
          display: grid;
          grid-template-columns: 4.5fr 5.5fr;
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

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 20px 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
        }

        .toast-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .toast-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #ef4444;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

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

        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          font-size: 0.85rem;
          color: #334155;
          outline: none;
          transition: all 0.2s;
        }

        .form-group select:focus,
        .form-group textarea:focus {
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .radio-group {
          display: flex;
          gap: 12px;
        }

        .radio-label {
          flex: 1;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.8rem;
          color: #64748b;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radio-label input { display: none; }
        
        .radio-label:hover { background: #f8fafc; color: #334155; }
        .radio-label.active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #2563eb;
        }

        .btn-submit {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
          transition: all 0.2s;
        }

        .btn-submit:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        /* Requests list */
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 480px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .request-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
          background: #ffffff;
          transition: all 0.2s;
        }

        .request-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .request-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .req-type-col { display: flex; flex-direction: column; }
        .req-id { font-size: 0.72rem; font-family: monospace; font-weight: 700; color: #94a3b8; }
        .req-type { margin: 2px 0 0 0; font-size: 0.9rem; font-weight: 700; color: #0f172a; }

        .priority-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .priority-badge.low { background: #f1f5f9; color: #475569; }
        .priority-badge.medium { background: #eff6ff; color: #2563eb; }
        .priority-badge.high { background: #fff7ed; color: #ea580c; }

        .req-desc {
          font-size: 0.82rem;
          color: #475569;
          margin: 0 0 14px 0;
          line-height: 1.5;
        }

        .request-card-footer {
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .req-date { font-size: 0.75rem; color: #94a3b8; }
        .req-date strong { color: #64748b; }

        .req-footer-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .status-pill.approved { background: #dcfce3; color: #15803d; }
        .status-pill.pending { background: #fef3c7; color: #d97706; }
        .status-pill.rejected { background: #fee2e2; color: #b91c1c; }

        .btn-delete {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-delete:hover {
          color: #ef4444;
          background: #fef2f2;
        }

        .empty-state {
          padding: 48px;
          text-align: center;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  )
}
