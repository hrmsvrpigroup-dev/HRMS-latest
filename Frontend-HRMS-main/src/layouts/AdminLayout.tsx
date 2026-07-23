import AppShell from '../components/shared/AppShell'

export default function AdminLayout() {
  return (
    <AppShell
      title="Admin"
      navItems={[
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin/hr', label: 'HR Management' },
        { to: '/admin/employees', label: 'Employees' },
        { to: '/admin/attendance', label: 'Attendance' },
        { to: '/admin/wallet', label: 'Wallet' },
      ]}
    />
  )
}

