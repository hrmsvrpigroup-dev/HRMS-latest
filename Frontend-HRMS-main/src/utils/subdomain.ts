const isIP = (host: string) => {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')
}

export const getSubdomain = (host: string) => {
  const hostWithoutPort = host.split(':')[0].toLowerCase()
  
  if (isIP(hostWithoutPort)) {
    return ''
  }

  const parts = hostWithoutPort.split('.')
  
  if (hostWithoutPort.endsWith('localhost')) {
    if (parts.length > 1) {
      return parts[0]
    }
    return ''
  }
  
  if (
    hostWithoutPort.includes('ngrok') ||
    hostWithoutPort.includes('vercel') ||
    hostWithoutPort.includes('onrender') ||
    hostWithoutPort.includes('render.com')
  ) {
    return ''
  }

  const RESERVED = new Set(['www', 'hr', 'admin', 'employee', 'app', 'dashboard', 'portal', 'login', 'superadmin', 'api'])

  if (parts.length >= 3) {
    if (RESERVED.has(parts[0])) {
      return ''
    }
    return parts[0]
  }
  
  return ''
}

// Subdomain utility updated for Vercel deployment


