import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '../store/auth.store'

interface Props {
  allowedRoles: string[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user?.role ?? '')) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

