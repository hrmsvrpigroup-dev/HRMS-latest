import AppShell from '../components/shared/AppShell'

export default function SuperAdminLayout() {
  return (
    <AppShell
      title="Super Admin"
      navItems={[
        { to: '/superadmin', label: 'Dashboard' },
        { to: '/superadmin/pending', label: 'Enquire Follow Up' },
        { to: '/superadmin/companies', label: 'Companies' },
        { to: '/superadmin/credits', label: 'Credit Management' },
        { to: '/superadmin/credit-transactions', label: 'Credit Transactions' },
        { to: '/superadmin/documents', label: 'Documents' },
      ]}
    />
  )
}

