export const hasRole = (role: string | undefined, allowedRoles: string[]) => {
  return !!role && allowedRoles.includes(role)
}
