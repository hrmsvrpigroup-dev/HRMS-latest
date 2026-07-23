export const getSubdomain = (host: string) => {
  const hostWithoutPort = host.split(':')[0]
  const parts = hostWithoutPort.split('.')
  
  if (hostWithoutPort.endsWith('localhost')) {
    if (parts.length > 1) {
      return parts[0]
    }
    return ''
  }
  
  if (parts.length >= 3) {
    return parts[0]
  }
  
  return ''
}

