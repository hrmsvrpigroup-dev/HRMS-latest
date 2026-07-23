import { useAuthStore } from '../store/auth.store'

export const usePermission = (roles: string[]) => {
  const role = useAuthStore((state) => state.user?.role)
  return roles.includes(role ?? '')
}
