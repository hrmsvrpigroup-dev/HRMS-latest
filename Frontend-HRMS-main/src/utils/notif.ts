export function triggerHrNotification(message: string, details?: {
  employeeName: string
  action: string
  timestamp: string
  changes: string[]
}) {
  try {
    const raw = localStorage.getItem('hrms_hr_notifications')
    const list = raw ? JSON.parse(raw) : []
    const newNotif = {
      id: 'notif-' + Date.now() + '-' + Math.round(Math.random() * 1e5),
      text: message,
      time: 'Just now',
      read: false,
      createdAt: new Date().toISOString(),
      details: details || {
        employeeName: 'System',
        action: 'Event Notification',
        timestamp: new Date().toISOString(),
        changes: [message]
      }
    }
    localStorage.setItem('hrms_hr_notifications', JSON.stringify([newNotif, ...list]))
    
    // Dispatch a storage event so other tabs/listeners can react in real-time
    window.dispatchEvent(new Event('storage'))
  } catch (e) {
    console.error('Failed to trigger HR notification:', e)
  }
}
