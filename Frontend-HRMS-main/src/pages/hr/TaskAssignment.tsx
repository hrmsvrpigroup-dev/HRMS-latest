import React, { useState, useEffect, useRef } from 'react'
import { employeeApi, Employee } from '../../api/employee.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import {
  ClipboardList, Plus, Trash2, Search, User, CheckSquare,
  Clock, CheckCircle2, ChevronDown, X, Calendar, Send,
  Paperclip, FileText, Image, File, UploadCloud, XCircle
} from 'lucide-react'

interface AssignedTask {
  id: string
  employeeId: string
  employeeName: string
  employeeCode: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'ACCEPTED' | 'PROGRESS' | 'COMPLETED' | 'REJECTED'
  dueDate: string
  assignedDate: string
  assignedBy: string
  attachment?: {
    name: string
    size: number
    type: string
    dataUrl: string
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} />
  if (type === 'application/pdf' || type.includes('text')) return <FileText size={14} />
  return <File size={14} />
}

const STORAGE_KEY = 'hrms_hr_assigned_tasks'

function loadAllTasks(): AssignedTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAllTasks(tasks: AssignedTask[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  // Also update per-employee keys so the employee portal picks them up
  const byEmployee: Record<string, AssignedTask[]> = {}
  tasks.forEach(t => {
    if (!byEmployee[t.employeeId]) byEmployee[t.employeeId] = []
    byEmployee[t.employeeId].push(t)
  })
  // Clear old per-employee stores and rewrite
  Object.keys(byEmployee).forEach(empId => {
    localStorage.setItem(`hrms_employee_tasks_${empId}`, JSON.stringify(byEmployee[empId]))
  })
}

export default function TaskAssignment() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmps, setLoadingEmps] = useState(true)
  const [allTasks, setAllTasks] = useState<AssignedTask[]>(loadAllTasks)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [empSearch, setEmpSearch] = useState('')
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [attachment, setAttachment] = useState<AssignedTask['attachment'] | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file.size > 1 * 1024 * 1024 * 1024) { alert('File must be under 1 GB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setAttachment({ name: file.name, size: file.size, type: file.type, dataUrl: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  // Filter state for task list
  const [filterEmpId, setFilterEmpId] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    employeeApi.list()
      .then(res => setEmployees(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingEmps(false))
  }, [])

  const filteredEmps = employees.filter(e =>
    empSearch === '' ||
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(empSearch.toLowerCase())
  )

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmp || !title.trim() || !dueDate) return

    const newTask: AssignedTask = {
      id: `TSK-HR-${Date.now()}`,
      employeeId: selectedEmp.id,
      employeeName: `${selectedEmp.firstName} ${selectedEmp.lastName}`,
      employeeCode: selectedEmp.employeeCode,
      title,
      description,
      priority,
      status: 'TODO',
      dueDate,
      assignedDate: new Date().toISOString().split('T')[0],
      assignedBy: 'HR Manager',
      ...(attachment ? { attachment } : {})
    }

    const updated = [newTask, ...allTasks]
    setAllTasks(updated)
    saveAllTasks(updated)

    setFormSuccess(`Task assigned to ${selectedEmp.firstName} successfully!`)
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setDueDate('')
    setSelectedEmp(null)
    setEmpSearch('')
    setAttachment(null)
    setTimeout(() => {
      setFormSuccess('')
      setShowForm(false)
    }, 2000)
  }

  const handleDelete = (id: string) => {
    const updated = allTasks.filter(t => t.id !== id)
    setAllTasks(updated)
    saveAllTasks(updated)
  }

  const displayedTasks = allTasks.filter(t => {
    const matchEmp = filterEmpId === 'ALL' || t.employeeId === filterEmpId
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus
    return matchEmp && matchStatus
  })

  const stats = {
    total: allTasks.length,
    todo: allTasks.filter(t => t.status === 'TODO').length,
    progress: allTasks.filter(t => t.status === 'PROGRESS').length,
    completed: allTasks.filter(t => t.status === 'COMPLETED').length,
  }

  if (loadingEmps) return <LoadingSpinner />

  return (
    <div className="task-assign-page">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header-title">
          <h1>Task Assignment</h1>
          <p>Assign, track, and manage tasks distributed to employees across departments.</p>
        </div>
        <button className="btn-assign-new" onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Assign New Task
        </button>
      </div>

      {/* Stats Row */}
      <div className="task-stats-row">
        <div className="task-stat-card total">
          <ClipboardList size={20} />
          <div>
            <strong>{stats.total}</strong>
            <span>Total Assigned</span>
          </div>
        </div>
        <div className="task-stat-card todo">
          <CheckSquare size={20} />
          <div>
            <strong>{stats.todo}</strong>
            <span>To Do</span>
          </div>
        </div>
        <div className="task-stat-card progress">
          <Clock size={20} />
          <div>
            <strong>{stats.progress}</strong>
            <span>In Progress</span>
          </div>
        </div>
        <div className="task-stat-card completed">
          <CheckCircle2 size={20} />
          <div>
            <strong>{stats.completed}</strong>
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-item">
          <label>Filter by Employee</label>
          <select value={filterEmpId} onChange={e => setFilterEmpId(e.target.value)}>
            <option value="ALL">All Employees</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName} ({e.employeeCode})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Filter by Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Task Table */}
      <div className="task-table-card">
        <div className="table-header-row">
          <h3>Assigned Tasks ({displayedTasks.length})</h3>
        </div>
        {displayedTasks.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} />
            <p>No tasks assigned yet. Click "Assign New Task" to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Task Title</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Attachment</th>
                  <th>Status</th>
                  <th>Assigned On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTasks.map(task => (
                  <tr key={task.id}>
                    <td className="mono">{task.id}</td>
                    <td>
                      <div className="task-title-cell">
                        <strong>{task.title}</strong>
                        {task.description && <span className="task-desc-preview">{task.description.slice(0, 60)}{task.description.length > 60 ? '…' : ''}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="emp-cell">
                        <div className="emp-avatar">{task.employeeName.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <span className="emp-name">{task.employeeName}</span>
                          <span className="emp-code">{task.employeeCode}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                    </td>
                    <td className="mono">{task.dueDate}</td>
                    <td>
                      {task.attachment ? (
                        <a
                          href={task.attachment.dataUrl}
                          download={task.attachment.name}
                          className="attach-chip"
                          title={`Download ${task.attachment.name}`}
                        >
                          {fileIcon(task.attachment.type)}
                          <span className="attach-name">{task.attachment.name.length > 18 ? task.attachment.name.slice(0,16)+'…' : task.attachment.name}</span>
                          <span className="attach-size">{formatBytes(task.attachment.size)}</span>
                        </a>
                      ) : (
                        <span className="no-attach">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${task.status.toLowerCase()}`}>
                        {task.status === 'TODO' && <CheckSquare size={11} />}
                        {task.status === 'PROGRESS' && <Clock size={11} />}
                        {task.status === 'COMPLETED' && <CheckCircle2 size={11} />}
                        {task.status === 'TODO' ? 'Pending' : task.status === 'ACCEPTED' ? 'Accepted' : task.status === 'PROGRESS' ? 'In Progress' : task.status === 'COMPLETED' ? 'Completed' : 'Rejected'}
                      </span>
                    </td>
                    <td className="mono">{task.assignedDate}</td>
                    <td>
                      <button className="btn-icon-delete" onClick={() => handleDelete(task.id)} title="Remove task">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Task Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">
                <Send size={18} className="icon-blue" />
                <h3>Assign Task to Employee</h3>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>

            {formSuccess ? (
              <div className="modal-success-pane">
                <CheckCircle2 size={48} className="success-icon" />
                <h4>{formSuccess}</h4>
                <p>The task is now visible on the employee's task board.</p>
              </div>
            ) : (
              <form onSubmit={handleAssign}>
                <div className="modal-body">
                  {/* Employee selector */}
                  <div className="field-group">
                    <label>Assign To Employee <span className="required">*</span></label>
                    <div className="emp-selector" onClick={e => e.stopPropagation()}>
                      <div
                        className={`emp-selector-trigger ${selectedEmp ? 'selected' : ''}`}
                        onClick={() => setShowEmpDropdown(!showEmpDropdown)}
                      >
                        {selectedEmp ? (
                          <>
                            <User size={16} />
                            <span>{selectedEmp.firstName} {selectedEmp.lastName} ({selectedEmp.employeeCode})</span>
                            <button type="button" className="clear-emp" onClick={e => { e.stopPropagation(); setSelectedEmp(null); setEmpSearch(''); }}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Search size={16} />
                            <input
                              type="text"
                              placeholder="Search employee by name or code..."
                              value={empSearch}
                              onChange={e => { setEmpSearch(e.target.value); setShowEmpDropdown(true) }}
                              onClick={e => { e.stopPropagation(); setShowEmpDropdown(true) }}
                            />
                            <ChevronDown size={16} className="chevron" />
                          </>
                        )}
                      </div>
                      {showEmpDropdown && !selectedEmp && (
                        <div className="emp-dropdown">
                          {filteredEmps.length === 0 ? (
                            <div className="emp-drop-empty">No employees found</div>
                          ) : (
                            filteredEmps.slice(0, 8).map(emp => (
                              <div
                                key={emp.id}
                                className="emp-drop-item"
                                onClick={() => {
                                  setSelectedEmp(emp)
                                  setShowEmpDropdown(false)
                                  setEmpSearch('')
                                }}
                              >
                                <div className="emp-drop-avatar">
                                  {emp.firstName[0]}{emp.lastName[0]}
                                </div>
                                <div>
                                  <span className="drop-name">{emp.firstName} {emp.lastName}</span>
                                  <span className="drop-code">{emp.employeeCode} · {emp.department?.name || 'General'}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Title */}
                  <div className="field-group">
                    <label>Task Title <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Complete Q2 compliance training..."
                    />
                  </div>

                  {/* Description */}
                  <div className="field-group">
                    <label>Task Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Provide context, links, or instructions..."
                    />
                  </div>

                  <div className="field-row">
                    {/* Priority */}
                    <div className="field-group">
                      <label>Priority Level</label>
                      <div className="radio-set">
                        {(['LOW', 'MEDIUM', 'HIGH'] as const).map(p => (
                          <label key={p} className={`radio-pill ${priority === p ? 'active-' + p.toLowerCase() : ''}`}>
                            <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
                            {p}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="field-group">
                      <label>Due Date <span className="required">*</span></label>
                      <div className="input-icon-wrap">
                        <Calendar size={15} className="field-icon" />
                        <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* File Attachment */}
                  <div className="field-group">
                    <label><Paperclip size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} />Attach Document <span style={{color:'#94a3b8',fontWeight:500,textTransform:'none',letterSpacing:0}}>(optional · max 1 GB)</span></label>
                    {attachment ? (
                      <div className="attach-preview">
                        <div className="attach-preview-icon">{fileIcon(attachment.type)}</div>
                        <div className="attach-preview-info">
                          <span className="attach-preview-name">{attachment.name}</span>
                          <span className="attach-preview-size">{formatBytes(attachment.size)}</span>
                        </div>
                        <button type="button" className="attach-remove" onClick={() => { setAttachment(null); if(fileInputRef.current) fileInputRef.current.value='' }}>
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`drop-zone ${dragOver ? 'drag-active' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect(f) }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <UploadCloud size={22} className="dz-icon" />
                        <span className="dz-text">Drop a file here or <strong>click to browse</strong></span>
                        <span className="dz-hint">PDF, Word, Excel, Image, TXT — up to 1 GB</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif"
                          style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if(f) handleFileSelect(f) }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-foot">
                  <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-submit-task" disabled={!selectedEmp}>
                    <Send size={15} />
                    Assign Task
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .task-assign-page {
          padding: 28px 32px;
          max-width: 1300px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Header */
        .page-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .page-header-title h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .page-header-title p { color: #64748b; font-size: 0.9rem; margin: 0; }

        .btn-assign-new {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #4f46e5;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-assign-new:hover { background: #4338ca; transform: translateY(-1px); }

        /* Stats */
        .task-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .task-stat-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
        }
        .task-stat-card.total { border-top: 3px solid #4f46e5; }
        .task-stat-card.todo { border-top: 3px solid #3b82f6; }
        .task-stat-card.progress { border-top: 3px solid #f97316; }
        .task-stat-card.completed { border-top: 3px solid #10b981; }
        .task-stat-card.total svg { color: #4f46e5; }
        .task-stat-card.todo svg { color: #3b82f6; }
        .task-stat-card.progress svg { color: #f97316; }
        .task-stat-card.completed svg { color: #10b981; }
        .task-stat-card div { display: flex; flex-direction: column; }
        .task-stat-card strong { font-size: 1.6rem; font-weight: 800; color: #0f172a; line-height: 1; }
        .task-stat-card span { font-size: 0.78rem; color: #64748b; font-weight: 600; margin-top: 2px; }

        /* Filters */
        .filters-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .filter-item { display: flex; flex-direction: column; gap: 5px; }
        .filter-item label { font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-item select {
          padding: 9px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
          font-size: 0.85rem;
          color: #334155;
          min-width: 220px;
          outline: none;
          cursor: pointer;
        }
        .filter-item select:focus { border-color: #4f46e5; }

        /* Table Card */
        .task-table-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }
        .table-header-row {
          padding: 18px 24px;
          border-bottom: 1px solid #f1f5f9;
        }
        .table-header-row h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f8fafc; padding: 12px 20px; font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; text-align: left; white-space: nowrap; }
        td { padding: 14px 20px; border-bottom: 1px solid #f8fafc; font-size: 0.85rem; color: #334155; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f8fafc; }

        .mono { font-family: monospace; font-size: 0.78rem; color: #64748b; }

        .task-title-cell { display: flex; flex-direction: column; gap: 3px; }
        .task-title-cell strong { color: #0f172a; font-size: 0.88rem; }
        .task-desc-preview { font-size: 0.75rem; color: #94a3b8; }

        .emp-cell { display: flex; align-items: center; gap: 10px; }
        .emp-avatar { width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .emp-name { display: block; font-weight: 700; font-size: 0.85rem; color: #0f172a; }
        .emp-code { display: block; font-size: 0.72rem; color: #94a3b8; font-family: monospace; }

        .priority-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; }
        .priority-badge.low { background: #f1f5f9; color: #475569; }
        .priority-badge.medium { background: #eff6ff; color: #2563eb; }
        .priority-badge.high { background: #fff7ed; color: #ea580c; }

        /* Attachment chip in table */
        .attach-chip {
          display: inline-flex; align-items: center; gap: 5px;
          background: #f0fdf4; color: #15803d;
          border: 1px solid #bbf7d0; border-radius: 6px;
          padding: 4px 9px; font-size: 0.72rem; font-weight: 600;
          text-decoration: none; cursor: pointer; transition: all 0.2s;
          max-width: 180px;
        }
        .attach-chip:hover { background: #dcfce7; border-color: #4ade80; }
        .attach-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .attach-size { color: #86efac; font-size: 0.65rem; white-space: nowrap; }
        .no-attach { color: #cbd5e1; }

        /* Drop zone */
        .drop-zone {
          border: 2px dashed #cbd5e1; border-radius: 10px;
          padding: 24px 16px; text-align: center;
          cursor: pointer; transition: all 0.2s;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: #f8fafc;
        }
        .drop-zone:hover, .drag-active {
          border-color: #4f46e5; background: #eef2ff;
        }
        .dz-icon { color: #94a3b8; transition: color 0.2s; }
        .drop-zone:hover .dz-icon, .drag-active .dz-icon { color: #4f46e5; }
        .dz-text { font-size: 0.82rem; color: #475569; }
        .dz-text strong { color: #4f46e5; }
        .dz-hint { font-size: 0.72rem; color: #94a3b8; }

        /* Attachment preview (after file chosen) */
        .attach-preview {
          display: flex; align-items: center; gap: 12px;
          background: #f0fdf4; border: 1.5px solid #86efac;
          border-radius: 10px; padding: 12px 14px;
        }
        .attach-preview-icon { color: #15803d; display: flex; flex-shrink: 0; }
        .attach-preview-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .attach-preview-name { font-size: 0.82rem; font-weight: 700; color: #14532d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .attach-preview-size { font-size: 0.7rem; color: #16a34a; }
        .attach-remove { background: none; border: none; color: #86efac; cursor: pointer; display: flex; padding: 2px; border-radius: 4px; flex-shrink: 0; }
        .attach-remove:hover { color: #ef4444; }

        .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 5px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.todo { background: #eff6ff; color: #2563eb; }
        .status-badge.progress { background: #fff7ed; color: #ea580c; }
        .status-badge.completed { background: #f0fdf4; color: #16a34a; }

        .btn-icon-delete { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; transition: all 0.2s; }
        .btn-icon-delete:hover { color: #ef4444; background: #fef2f2; }

        .empty-state { padding: 64px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-state p { margin: 0; font-size: 0.9rem; }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.5);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
        }
        .modal-box {
          background: white; border-radius: 16px; width: 100%; max-width: 560px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          animation: modalIn 0.2s ease-out;
          overflow: hidden;
        }
        @keyframes modalIn {
          from { transform: translateY(20px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .modal-head {
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-title { display: flex; align-items: center; gap: 10px; }
        .modal-title h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
        .icon-blue { color: #4f46e5; }
        .modal-close { background: none; border: none; color: #64748b; cursor: pointer; display: flex; border-radius: 6px; padding: 4px; }
        .modal-close:hover { color: #0f172a; background: #f1f5f9; }

        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; max-height: 65vh; overflow-y: auto; }

        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-group label { font-size: 0.75rem; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
        .required { color: #ef4444; }
        .field-group input, .field-group textarea {
          width: 100%; padding: 10px 13px;
          border: 1px solid #cbd5e1; border-radius: 8px;
          background: #f8fafc; font-size: 0.87rem; color: #334155;
          outline: none; transition: all 0.2s;
        }
        .field-group input:focus, .field-group textarea:focus { border-color: #4f46e5; background: white; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }

        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        /* Employee selector */
        .emp-selector { position: relative; }
        .emp-selector-trigger {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #cbd5e1; border-radius: 8px;
          background: #f8fafc; padding: 9px 13px;
          cursor: pointer; min-height: 42px;
          transition: all 0.2s;
        }
        .emp-selector-trigger.selected { background: #eef2ff; border-color: #4f46e5; color: #4f46e5; font-weight: 600; font-size: 0.87rem; }
        .emp-selector-trigger input { border: none; background: none; outline: none; flex: 1; font-size: 0.87rem; color: #334155; padding: 0; }
        .emp-selector-trigger svg { color: #94a3b8; flex-shrink: 0; }
        .emp-selector-trigger.selected svg:first-child { color: #4f46e5; }
        .chevron { margin-left: auto; }
        .clear-emp { background: none; border: none; color: #94a3b8; cursor: pointer; margin-left: auto; display: flex; padding: 2px; border-radius: 4px; }
        .clear-emp:hover { color: #ef4444; }

        .emp-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: white; border: 1px solid #e2e8f0; border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 100;
          max-height: 220px; overflow-y: auto;
        }
        .emp-drop-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; cursor: pointer; transition: background 0.15s;
        }
        .emp-drop-item:hover { background: #eef2ff; }
        .emp-drop-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #e0e7ff; color: #4f46e5;
          font-size: 0.72rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .drop-name { display: block; font-size: 0.85rem; font-weight: 700; color: #0f172a; }
        .drop-code { display: block; font-size: 0.72rem; color: #94a3b8; }
        .emp-drop-empty { padding: 16px; text-align: center; color: #94a3b8; font-size: 0.85rem; }

        /* Priority radio */
        .radio-set { display: flex; gap: 8px; }
        .radio-pill {
          flex: 1; border: 1px solid #e2e8f0; border-radius: 7px;
          padding: 7px 10px; text-align: center; cursor: pointer;
          font-size: 0.78rem; font-weight: 700; color: #64748b;
          transition: all 0.2s;
        }
        .radio-pill input { display: none; }
        .radio-pill.active-low { border-color: #64748b; background: #f1f5f9; color: #334155; }
        .radio-pill.active-medium { border-color: #3b82f6; background: #eff6ff; color: #2563eb; }
        .radio-pill.active-high { border-color: #ef4444; background: #fef2f2; color: #dc2626; }

        /* Input with icon */
        .input-icon-wrap { position: relative; }
        .field-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .input-icon-wrap input { padding-left: 34px; }

        /* Modal footer */
        .modal-foot {
          padding: 16px 24px; border-top: 1px solid #f1f5f9;
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn-cancel { background: white; border: 1px solid #cbd5e1; color: #475569; padding: 9px 18px; border-radius: 7px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .btn-cancel:hover { background: #f8fafc; }
        .btn-submit-task {
          display: flex; align-items: center; gap: 7px;
          background: #4f46e5; color: white; border: none;
          padding: 9px 20px; border-radius: 7px;
          font-size: 0.85rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(79,70,229,0.2);
          transition: all 0.2s;
        }
        .btn-submit-task:hover:not(:disabled) { background: #4338ca; }
        .btn-submit-task:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Success pane */
        .modal-success-pane {
          padding: 48px 32px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .success-icon { color: #10b981; }
        .modal-success-pane h4 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #14532d; }
        .modal-success-pane p { margin: 0; font-size: 0.85rem; color: #166534; }
      `}</style>
    </div>
  )
}
