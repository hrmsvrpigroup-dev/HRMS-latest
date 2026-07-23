import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { employeeApi } from '../../api/employee.api'
import { triggerHrNotification } from '../../utils/notif'
import {
  ClipboardList, CheckCircle2, Calendar, Clock, XCircle,
  CheckCheck, Play, AlertTriangle, RefreshCw,
  Paperclip, FileText, Image, File, Download
} from 'lucide-react'

interface TaskItem {
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
  if (type.startsWith('image/')) return <Image size={13} />
  if (type === 'application/pdf' || type.includes('text')) return <FileText size={13} />
  return <File size={13} />
}

const GLOBAL_KEY = 'hrms_hr_assigned_tasks'

function loadMyTasks(userId?: string): TaskItem[] {
  try {
    const allRaw = localStorage.getItem(GLOBAL_KEY)
    const all: TaskItem[] = allRaw ? JSON.parse(allRaw) : []
    return userId ? all.filter(t => t.employeeId === userId) : all
  } catch { return [] }
}

function updateGlobalTask(task: TaskItem, userId: string) {
  try {
    const allRaw = localStorage.getItem(GLOBAL_KEY)
    const all: TaskItem[] = allRaw ? JSON.parse(allRaw) : []
    const idx = all.findIndex(t => t.id === task.id)
    if (idx !== -1) all[idx] = task
    else all.push(task)
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(all))
  } catch {}
}

export default function Tasks() {
  const user = useAuthStore(state => state.user)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [confirmReject, setConfirmReject] = useState<string | null>(null)
  const [empId, setEmpId] = useState<string | null>(null)

  useEffect(() => {
    employeeApi.getProfile().then(res => setEmpId(res.data.data.id)).catch(console.error)
  }, [])

  const load = () => {
    if (empId) setTasks(loadMyTasks(empId))
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [empId])

  const changeStatus = (id: string, next: TaskItem['status']) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: next } : t)
    setTasks(updated)
    const changed = updated.find(t => t.id === id)
    if (changed && user?.id) {
      updateGlobalTask(changed, user.id)
      const fullName = `${user.firstName} ${user.lastName}`
      const statusVerbs: Record<string, string> = {
        ACCEPTED: 'accepted',
        PROGRESS: 'started working on',
        COMPLETED: 'completed',
        REJECTED: 'rejected'
      }
      const verb = statusVerbs[next] || next.toLowerCase()
      triggerHrNotification(`Employee ${fullName} ${verb} task: "${changed.title}".`)
    }
  }

  // Stats
  const todo     = tasks.filter(t => t.status === 'TODO').length
  const active   = tasks.filter(t => t.status === 'ACCEPTED' || t.status === 'PROGRESS').length
  const done     = tasks.filter(t => t.status === 'COMPLETED').length
  const rejected = tasks.filter(t => t.status === 'REJECTED').length

  const priorityStyle: Record<string, { bg: string; color: string }> = {
    LOW:    { bg: '#f1f5f9', color: '#475569' },
    MEDIUM: { bg: '#eff6ff', color: '#1d4ed8' },
    HIGH:   { bg: '#fff1f2', color: '#be123c' },
  }

  return (
    <div className="emp-tasks-root">

      {/* ── Header ── */}
      <div className="tasks-topbar">
        <div>
          <h1 className="tasks-h1">My Task Board</h1>
          <p className="tasks-sub">Tasks assigned by your HR manager. Review and respond to each task.</p>
        </div>
        <button className="btn-refresh" onClick={load} title="Refresh">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* ── Stat pills ── */}
      {tasks.length > 0 && (
        <div className="stat-pills-row">
          <div className="stat-pill pill-pending">
            <ClipboardList size={15} />
            <span><strong>{todo}</strong> Pending</span>
          </div>
          <div className="stat-pill pill-active">
            <Play size={15} />
            <span><strong>{active}</strong> In Progress</span>
          </div>
          <div className="stat-pill pill-done">
            <CheckCircle2 size={15} />
            <span><strong>{done}</strong> Completed</span>
          </div>
          {rejected > 0 && (
            <div className="stat-pill pill-rejected">
              <XCircle size={15} />
              <span><strong>{rejected}</strong> Rejected</span>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {tasks.length === 0 ? (
        <div className="no-tasks-pane">
          <ClipboardList size={56} className="nt-icon" />
          <h3>No tasks assigned yet</h3>
          <p>Your HR manager will assign tasks here. They will appear with action buttons for you to accept or reject.</p>
        </div>
      ) : (
        <div className="task-grid">
          {tasks.map(task => {
            const ps = priorityStyle[task.priority]
            const isOverdue = task.status !== 'COMPLETED' && task.status !== 'REJECTED'
              && new Date(task.dueDate) < new Date()

            return (
              <div key={task.id} className={`task-card tc-${task.status.toLowerCase()}`}>

                {/* Card top row */}
                <div className="tc-toprow">
                  <span className="tc-id">{task.id}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {isOverdue && (
                      <span className="overdue-chip">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                    <span className="tc-priority" style={{ background: ps.bg, color: ps.color }}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Title + desc */}
                <h3 className="tc-title">{task.title}</h3>
                {task.description && <p className="tc-desc">{task.description}</p>}

                {/* Attachment download */}
                {task.attachment && (
                  <a
                    href={task.attachment.dataUrl}
                    download={task.attachment.name}
                    className="tc-attachment"
                    title={`Download ${task.attachment.name}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <Paperclip size={12} />
                    <span className="tc-attach-icon">{fileIcon(task.attachment.type)}</span>
                    <span className="tc-attach-name">{task.attachment.name.length > 28 ? task.attachment.name.slice(0,26)+'…' : task.attachment.name}</span>
                    <span className="tc-attach-size">{formatBytes(task.attachment.size)}</span>
                    <Download size={12} className="tc-attach-dl" />
                  </a>
                )}

                {/* Meta */}
                <div className="tc-meta">
                  <div className="tc-meta-item">
                    <Calendar size={12} />
                    <span>Due: <strong>{task.dueDate}</strong></span>
                  </div>
                  <div className="tc-meta-item">
                    <Clock size={12} />
                    <span>Assigned by <strong>{task.assignedBy}</strong> · {task.assignedDate}</span>
                  </div>
                </div>

                {/* ── STATUS DIVIDER ── */}
                <div className="tc-status-bar">
                  <StatusIndicator status={task.status} />
                </div>

                {/* ── ACTION BUTTONS by stage ── */}
                <div className="tc-actions">

                  {/* Stage 1 — PENDING: Accept or Reject */}
                  {task.status === 'TODO' && (
                    <>
                      <button
                        className="act-btn btn-accept"
                        onClick={() => changeStatus(task.id, 'ACCEPTED')}
                      >
                        <CheckCircle2 size={15} />
                        Accept Task
                      </button>
                      <button
                        className="act-btn btn-reject"
                        onClick={() => setConfirmReject(task.id)}
                      >
                        <XCircle size={15} />
                        Reject
                      </button>
                    </>
                  )}

                  {/* Stage 2 — ACCEPTED: Mark as Work in Progress */}
                  {task.status === 'ACCEPTED' && (
                    <button
                      className="act-btn btn-wip"
                      onClick={() => changeStatus(task.id, 'PROGRESS')}
                    >
                      <Play size={15} />
                      Start Work in Progress
                    </button>
                  )}

                  {/* Stage 3 — PROGRESS: Mark Complete */}
                  {task.status === 'PROGRESS' && (
                    <button
                      className="act-btn btn-complete"
                      onClick={() => changeStatus(task.id, 'COMPLETED')}
                    >
                      <CheckCheck size={15} />
                      Mark as Completed
                    </button>
                  )}

                  {/* Stage 4 — COMPLETED */}
                  {task.status === 'COMPLETED' && (
                    <div className="act-done-badge">
                      <CheckCircle2 size={16} />
                      Task Completed
                    </div>
                  )}

                  {/* Stage REJECTED */}
                  {task.status === 'REJECTED' && (
                    <div className="act-rejected-badge">
                      <XCircle size={16} />
                      Task Rejected
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Reject Confirmation Modal ── */}
      {confirmReject && (
        <div className="modal-overlay" onClick={() => setConfirmReject(null)}>
          <div className="confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon-wrap">
              <XCircle size={32} className="confirm-icon" />
            </div>
            <h3>Reject this task?</h3>
            <p>This will notify HR that you are unable to take on this task. Are you sure?</p>
            <div className="confirm-btns">
              <button className="conf-btn-cancel" onClick={() => setConfirmReject(null)}>
                Cancel
              </button>
              <button
                className="conf-btn-reject"
                onClick={() => {
                  changeStatus(confirmReject, 'REJECTED')
                  setConfirmReject(null)
                }}
              >
                <XCircle size={14} />
                Yes, Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .emp-tasks-root {
          padding: 28px 32px;
          max-width: 1240px;
          margin: 0 auto;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Header */
        .tasks-topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .tasks-h1 { font-size: 1.45rem; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .tasks-sub { color: #64748b; font-size: 0.88rem; margin: 0; }

        .btn-refresh {
          display: flex; align-items: center; gap: 6px;
          background: white; border: 1px solid #e2e8f0;
          color: #475569; padding: 8px 14px;
          border-radius: 8px; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-refresh:hover { border-color: #4f46e5; color: #4f46e5; background: #eef2ff; }

        /* Stat pills */
        .stat-pills-row {
          display: flex; gap: 10px; flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .stat-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 14px; border-radius: 20px;
          font-size: 0.8rem; font-weight: 600;
        }
        .stat-pill strong { font-weight: 800; }
        .pill-pending  { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .pill-active   { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
        .pill-done     { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .pill-rejected { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }

        /* Empty state */
        .no-tasks-pane {
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 80px 32px;
          background: white;
          border: 2px dashed #e2e8f0;
          border-radius: 16px; gap: 12px;
        }
        .nt-icon { color: #cbd5e1; }
        .no-tasks-pane h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #334155; }
        .no-tasks-pane p { margin: 0; font-size: 0.88rem; color: #64748b; max-width: 380px; line-height: 1.6; }

        /* Grid */
        .task-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        /* Task Card */
        .task-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          display: flex; flex-direction: column;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .task-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
        }
        .tc-todo::before    { background: #3b82f6; }
        .tc-accepted::before{ background: #f97316; }
        .tc-progress::before{ background: #8b5cf6; }
        .tc-completed::before { background: #10b981; }
        .tc-rejected::before { background: #ef4444; }

        .tc-todo { border-color: #dbeafe; }
        .tc-accepted { border-color: #fed7aa; }
        .tc-progress { border-color: #e9d5ff; }
        .tc-completed { border-color: #bbf7d0; opacity: 0.85; }
        .tc-rejected { border-color: #fecdd3; opacity: 0.7; }

        .tc-toprow {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 12px;
        }
        .tc-id { font-size: 0.68rem; font-family: monospace; font-weight: 700; color: #94a3b8; }
        .tc-priority {
          font-size: 0.65rem; font-weight: 800;
          padding: 3px 8px; border-radius: 4px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .overdue-chip {
          display: inline-flex; align-items: center; gap: 3px;
          background: #fff1f2; color: #be123c;
          font-size: 0.63rem; font-weight: 700;
          padding: 2px 7px; border-radius: 4px; text-transform: uppercase;
        }

        .tc-title {
          margin: 0 0 7px;
          font-size: 0.97rem; font-weight: 750;
          color: #0f172a; line-height: 1.4;
        }
        .tc-desc {
          margin: 0 0 12px;
          font-size: 0.8rem; color: #64748b;
          line-height: 1.55;
        }

        /* Attachment link on task card */
        .tc-attachment {
          display: flex; align-items: center; gap: 5px;
          background: #f0fdf4; color: #15803d;
          border: 1px solid #bbf7d0; border-radius: 7px;
          padding: 6px 10px; margin-bottom: 12px;
          text-decoration: none; font-size: 0.75rem; font-weight: 600;
          transition: all 0.2s; overflow: hidden;
        }
        .tc-attachment:hover { background: #dcfce7; border-color: #4ade80; }
        .tc-attach-icon { display: flex; flex-shrink: 0; }
        .tc-attach-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tc-attach-size { color: #86efac; font-size: 0.65rem; white-space: nowrap; flex-shrink: 0; }
        .tc-attach-dl { color: #4ade80; flex-shrink: 0; margin-left: 2px; }

        .tc-meta {
          display: flex; flex-direction: column; gap: 5px;
          padding: 10px 0;
          border-top: 1px solid #f1f5f9;
          margin-bottom: 14px;
        }
        .tc-meta-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem; color: #94a3b8;
        }
        .tc-meta-item strong { color: #475569; }

        /* Status indicator strip */
        .tc-status-bar {
          margin-bottom: 14px;
        }

        /* Action buttons */
        .tc-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .act-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 14px;
          border: none; border-radius: 9px;
          font-size: 0.82rem; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          min-width: 0;
        }

        .btn-accept {
          background: #22c55e; color: white;
          box-shadow: 0 4px 12px rgba(34,197,94,0.25);
        }
        .btn-accept:hover { background: #16a34a; transform: translateY(-1px); }

        .btn-reject {
          background: white; color: #ef4444;
          border: 1.5px solid #fca5a5;
          flex: 0 0 auto; padding: 10px 14px;
        }
        .btn-reject:hover { background: #fff1f2; border-color: #ef4444; transform: translateY(-1px); }

        .btn-wip {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          box-shadow: 0 4px 12px rgba(249,115,22,0.3);
        }
        .btn-wip:hover { filter: brightness(1.08); transform: translateY(-1px); }

        .btn-complete {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white;
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .btn-complete:hover { filter: brightness(1.08); transform: translateY(-1px); }

        .act-done-badge {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #f0fdf4; color: #16a34a;
          border: 1.5px solid #86efac;
          border-radius: 9px; padding: 10px 16px;
          font-size: 0.82rem; font-weight: 700;
          width: 100%;
        }
        .act-rejected-badge {
          display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #fff1f2; color: #be123c;
          border: 1.5px solid #fca5a5;
          border-radius: 9px; padding: 10px 16px;
          font-size: 0.82rem; font-weight: 700;
          width: 100%;
        }

        /* Confirm modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; padding: 20px;
        }
        .confirm-modal {
          background: white; border-radius: 16px;
          padding: 32px; max-width: 380px; width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          animation: popIn 0.2s ease-out;
        }
        @keyframes popIn {
          from { transform: scale(0.92); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .confirm-icon-wrap {
          width: 60px; height: 60px;
          background: #fff1f2; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
        }
        .confirm-icon { color: #ef4444; }
        .confirm-modal h3 { margin: 0 0 8px; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .confirm-modal p  { margin: 0 0 24px; font-size: 0.85rem; color: #64748b; line-height: 1.5; }
        .confirm-btns { display: flex; gap: 10px; }
        .conf-btn-cancel {
          flex: 1; background: white; border: 1px solid #e2e8f0;
          color: #475569; padding: 10px; border-radius: 9px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
        }
        .conf-btn-cancel:hover { background: #f8fafc; }
        .conf-btn-reject {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: #ef4444; color: white; border: none;
          padding: 10px; border-radius: 9px;
          font-size: 0.85rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 4px 12px rgba(239,68,68,0.25);
        }
        .conf-btn-reject:hover { background: #dc2626; }
      `}</style>
    </div>
  )
}

/* ── Status step indicator ── */
function StatusIndicator({ status }: { status: TaskItem['status'] }) {
  if (status === 'REJECTED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 7, padding: '6px 10px' }}>
        <XCircle size={13} color="#be123c" />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#be123c' }}>TASK REJECTED</span>
      </div>
    )
  }

  const steps = [
    { key: 'TODO',      label: 'Assigned' },
    { key: 'ACCEPTED',  label: 'Accepted' },
    { key: 'PROGRESS',  label: 'In Progress' },
    { key: 'COMPLETED', label: 'Done' },
  ]
  const order = ['TODO', 'ACCEPTED', 'PROGRESS', 'COMPLETED']
  const currentIdx = order.indexOf(status)

  const stepColors = ['#3b82f6', '#f97316', '#8b5cf6', '#10b981']

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const pending = i > currentIdx
        const color   = done || active ? stepColors[i] : '#cbd5e1'
        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done ? stepColors[i] : active ? stepColors[i] : '#f1f5f9',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.3s',
              }}>
                {done && <CheckCheck size={11} color="white" />}
                {active && <div style={{ width: 8, height: 8, background: stepColors[i], borderRadius: '50%' }} />}
              </div>
              <span style={{
                fontSize: '0.6rem', fontWeight: active ? 800 : 600,
                color: active ? stepColors[i] : pending ? '#94a3b8' : stepColors[i],
                whiteSpace: 'nowrap',
              }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 14,
                background: done ? stepColors[i] : '#e2e8f0',
                transition: 'all 0.3s',
                minWidth: 12,
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
