import { useEffect, useState } from 'react'
import { employeeApi, Employee } from '../../api/employee.api'
import { LoadingSpinner } from '../../components/shared/LoadingSpinner'
import { Calendar, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, ShieldAlert } from 'lucide-react'

export default function Shifts() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  
  // Toast notifications state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const res = await employeeApi.list()
      // The API returns typed Employee[], but Employee type in api might not declare shift: string
      // So we cast to any or just read shift property dynamically
      setEmployees(res.data.data)
      setFilteredEmployees(res.data.data)
    } catch {
      setError('Could not retrieve employee roster.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Handle filtering
  useEffect(() => {
    let result = [...employees]
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(term) ||
          emp.lastName.toLowerCase().includes(term) ||
          emp.employeeCode.toLowerCase().includes(term) ||
          (emp.department?.name && emp.department.name.toLowerCase().includes(term))
      )
    }
    setFilteredEmployees(result)
  }, [searchTerm, employees])

  const handleShiftChange = async (employeeId: string, newShift: string) => {
    try {
      await employeeApi.updateShift(employeeId, newShift)
      
      // Update local state
      setEmployees(prev =>
        prev.map(emp => (emp.id === employeeId ? { ...emp, shift: newShift } : emp))
      )
      
      const empName = employees.find(e => e.id === employeeId)
      const name = empName ? `${empName.firstName} ${empName.lastName}` : 'Employee'
      
      // Show success toast
      setNotification({
        message: `Updated ${name}'s shift to: ${newShift || 'None (System Default)'}`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 4000)
    } catch (err: any) {
      setNotification({
        message: err.response?.data?.message || 'Failed to update employee shift.',
        type: 'error'
      })
      setTimeout(() => setNotification(null), 4000)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="shifts-page-container">
      <div className="page-header">
        <div className="page-header-title">
          <h1>Workforce Shift Management</h1>
          <p>Assign, audit, and configure employee work hours, tiffin, break schedules, and shift rotations.</p>
        </div>
      </div>

      {notification && (
        <div className={`toast-notification ${notification.type === 'success' ? 'success' : 'error'}`}>
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="shifts-summary-row">
        <div className="summary-card">
          <div className="card-icon blue"><Calendar size={20} /></div>
          <div className="card-info">
            <span>General Shift</span>
            <h3>{employees.filter(e => !(e as any).shift || (e as any).shift === 'General Shift').length} Employee(s)</h3>
            <p>10:00 AM - 06:00 PM</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon green"><Clock size={20} /></div>
          <div className="card-info">
            <span>Morning Shift</span>
            <h3>{employees.filter(e => (e as any).shift === 'Morning Shift').length} Employee(s)</h3>
            <p>06:00 AM - 02:00 PM</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon orange"><RefreshCw size={20} /></div>
          <div className="card-info">
            <span>Afternoon Shift</span>
            <h3>{employees.filter(e => (e as any).shift === 'Afternoon Shift').length} Employee(s)</h3>
            <p>02:00 PM - 10:00 PM</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="card-icon purple"><ShieldAlert size={20} /></div>
          <div className="card-info">
            <span>Night Shift</span>
            <h3>{employees.filter(e => (e as any).shift === 'Night Shift').length} Employee(s)</h3>
            <p>10:00 PM - 06:00 AM</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card shifts-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search employees by name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-secondary flex items-center gap-2" onClick={fetchEmployees}>
          <RefreshCw size={16} /> Sync Rosters
        </button>
      </div>

      {error ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--error)' }}>
          {error}
        </div>
      ) : (
        <div className="card table-container" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department & Title</th>
                <th>Currently Assigned Shift</th>
                <th>Scheduled Shift Timings</th>
                <th>Shift Break Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => {
                const currentShift = (emp as any).shift || 'General Shift'
                
                // Determine shift timing and breaks description
                let timings = '10:00 AM - 06:00 PM'
                let breaks = 'Lunch (1:30 PM) · Tea Breaks (11:30 AM / 4:30 PM)'
                let badgeClass = 'badge-general'
                
                if (currentShift === 'Morning Shift') {
                  timings = '06:00 AM - 02:00 PM'
                  breaks = 'Breakfast/Tiffin (9:30 AM) · Tea Breaks (8:00 AM / 12:00 PM)'
                  badgeClass = 'badge-morning'
                } else if (currentShift === 'Afternoon Shift') {
                  timings = '02:00 PM - 10:00 PM'
                  breaks = 'Tiffin (5:30 PM) · Dinner (8:00 PM) · Tea Break (4:00 PM)'
                  badgeClass = 'badge-afternoon'
                } else if (currentShift === 'Night Shift') {
                  timings = '10:00 PM - 06:00 AM'
                  breaks = 'Snacks/Tiffin (12:00 AM) · Dinner (2:00 AM) · Tea (4:30 AM)'
                  badgeClass = 'badge-night'
                }

                return (
                  <tr key={emp.id} className="shift-row-hover">
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-heading)' }}>{emp.employeeCode}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {emp.designation?.title || 'Team Member'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {emp.department?.name || 'Operations'}
                      </div>
                    </td>
                    <td>
                      <select
                        value={currentShift}
                        onChange={(e) => handleShiftChange(emp.id, e.target.value)}
                        className={`shift-selector-dropdown ${badgeClass}`}
                      >
                        <option value="General Shift">General Shift</option>
                        <option value="Morning Shift">Morning Shift</option>
                        <option value="Afternoon Shift">Afternoon Shift</option>
                        <option value="Night Shift">Night Shift</option>
                      </select>
                    </td>
                    <td>
                      <div className="timing-chip">
                        <Clock size={12} />
                        <span>{timings}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {breaks}
                    </td>
                  </tr>
                )
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No matching employee records found in directory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .shifts-page-container {
          padding: 1.5rem 0;
          font-family: 'Inter', sans-serif;
        }
        
        .toast-notification {
          position: fixed;
          top: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }
        
        .toast-notification.success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .toast-notification.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .shifts-summary-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .summary-card {
          background: white;
          border: 1px solid #f1f5f9;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .summary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.04);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .card-icon.blue { background: #eff6ff; color: #3b82f6; }
        .card-icon.green { background: #f0fdf4; color: #10b981; }
        .card-icon.orange { background: #fff7ed; color: #f97316; }
        .card-icon.purple { background: #faf5ff; color: #a855f7; }

        .card-info span {
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .card-info h3 {
          margin: 4px 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }
        
        .card-info p {
          margin: 0;
          font-size: 0.8rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .shifts-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 16px 24px;
        }

        .search-input-wrap {
          position: relative;
          flex: 1;
          max-width: 500px;
        }
        
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }
        
        .search-input-wrap input {
          width: 100%;
          padding: 11px 16px 11px 42px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.92rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }
        
        .search-input-wrap input:focus {
          background: white;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        .shift-row-hover:hover {
          background-color: #f8fafc;
        }

        .shift-selector-dropdown {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          outline: none;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }

        .shift-selector-dropdown.badge-general {
          background: #eff6ff;
          color: #2563eb;
        }
        .shift-selector-dropdown.badge-morning {
          background: #eef2ff;
          color: #4f46e5;
        }
        .shift-selector-dropdown.badge-afternoon {
          background: #fff7ed;
          color: #ea580c;
        }
        .shift-selector-dropdown.badge-night {
          background: #faf5ff;
          color: #7e22ce;
        }
        
        .shift-selector-dropdown:hover {
          filter: brightness(0.96);
          border-color: rgba(0,0,0,0.05);
        }

        .timing-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 0.8rem;
          color: #475569;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
