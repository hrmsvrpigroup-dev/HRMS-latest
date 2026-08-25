import { useEffect, useRef, useState } from 'react'
import { attendanceApi } from '../api/attendance.api'
import api from '../api/axios'
import { useAuthStore } from '../store/auth.store'

export function useEmployeeMonitor() {
  const user = useAuthStore((state) => state.user)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mouseMovesRef = useRef<number>(0)
  const idleSecondsRef = useRef<number>(0)
  const intervalRef = useRef<any>(null)
  const clockStatusRef = useRef<any>(null)
  const isRequestingRef = useRef<boolean>(false)
  const cleanupListenersRef = useRef<(() => void) | null>(null)
  const usingSystemDetectorRef = useRef<boolean>(false)
  const systemDetectorRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Start monitoring: Capture mouse activity and hook screenshare
  const startMonitoring = async () => {
    if (isMonitoring || isRequestingRef.current) return
    isRequestingRef.current = true

    try {
      setMonitorError(null)
      
      // Request Screen Capture API
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // Prefer full screen monitor share
        } as any,
        audio: false,
      })
      isRequestingRef.current = false // Release permission request lock

      mediaStreamRef.current = stream
      setIsMonitoring(true)

      // Listen for manual stop sharing from browser bar
      stream.getVideoTracks()[0].onended = () => {
        setMonitorError('Screen sharing stopped. Monitoring halted.')
        stopMonitoring()
      }

      // Reset activity references
      mouseMovesRef.current = 0
      idleSecondsRef.current = 0

      // Activity events tracker (tracks mouse, keyboard, clicks etc.)
      const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
      const trackActivity = () => {
        mouseMovesRef.current += 1
        idleSecondsRef.current = 0 // Reset idle seconds count
      }
      activityEvents.forEach(e => window.addEventListener(e, trackActivity, { passive: true }))
      cleanupListenersRef.current = () => {
        activityEvents.forEach(e => window.removeEventListener(e, trackActivity))
      }

      usingSystemDetectorRef.current = false
      systemDetectorRef.current = null
      abortControllerRef.current = new AbortController()

      const setupIdleDetector = async () => {
        if ('IdleDetector' in window) {
          try {
            const status = await navigator.permissions.query({ name: 'idle-detection' as any })
            if (status.state === 'granted') {
              const detector = new (window as any).IdleDetector()
              detector.addEventListener('change', () => {
                if (detector.userState === 'active') {
                  idleSecondsRef.current = 0
                }
              })
              await detector.start({
                threshold: 60000,
                signal: abortControllerRef.current!.signal,
              })
              systemDetectorRef.current = detector
              usingSystemDetectorRef.current = true
              console.log('[MONITOR IDLE] System-wide IdleDetector started successfully.')
            }
          } catch (err) {
            console.warn('[MONITOR IDLE] Failed to query or start system-wide IdleDetector:', err)
          }
        }
      }

      await setupIdleDetector()

      // Capture initial screenshot immediately (within 1 second) to provide instant feedback
      setTimeout(async () => {
        if (mediaStreamRef.current) {
          const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
          if (videoTrack && videoTrack.readyState === 'live') {
            try {
              const base64Image = await captureFrame(mediaStreamRef.current)
              await api.post('/monitoring/screenshots', {
                base64Image,
                activityScore: 100,
                idleTime: 0,
              })
            } catch (err: any) {
              console.error('Failed to capture initial frame:', err.message)
            }
          }
        }
      }, 1000)

      // Snapshot interval: every 30 seconds for near real-time monitoring
      const CAPTURE_INTERVAL = 30
      const monitoringInterval = setInterval(async () => {
        // If we are using system detector, check if the system-wide state is active
        if (usingSystemDetectorRef.current && systemDetectorRef.current && systemDetectorRef.current.userState === 'active') {
          idleSecondsRef.current = 0
        }

        // Fallback behavior: if system detector is not active, reset activity when window is hidden/blurred
        // (Assume user is active in another desktop application)
        if (!usingSystemDetectorRef.current && (document.visibilityState === 'hidden' || !document.hasFocus())) {
          idleSecondsRef.current = 0
        }

        // Increment idle counter
        idleSecondsRef.current += CAPTURE_INTERVAL

        // Take screen snapshot
        if (mediaStreamRef.current) {
          const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
          if (videoTrack && videoTrack.readyState === 'live') {
            try {
              const base64Image = await captureFrame(mediaStreamRef.current)
              
              // Calculate activity score (max 100) based on movements
              const moveCount = mouseMovesRef.current
              const isIdle = idleSecondsRef.current >= 120 // idle if no moves in 2 minutes
              const activityScore = Math.min(100, Math.max(10, moveCount * 5))

              // Push log to backend
              await api.post('/monitoring/screenshots', {
                base64Image,
                activityScore,
                idleTime: isIdle ? idleSecondsRef.current : 0,
              })

              // Reset movement tracker after successful report
              mouseMovesRef.current = 0
            } catch (err: any) {
              console.error('Failed to capture or submit employee metrics:', err.message)
            }
          }
        }
      }, CAPTURE_INTERVAL * 1000) // Every 30 seconds

      intervalRef.current = monitoringInterval
    } catch (err: any) {
      isRequestingRef.current = false // Release permission request lock on error
      console.error('Screen share permissions rejected:', err)
      setMonitorError('You must grant screen capture permission to monitor active shifts.')
      setIsMonitoring(false)
    }
  }

  // Stop screen stream and trackers
  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current()
      cleanupListenersRef.current = null
    }
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort()
      } catch (e) {}
      abortControllerRef.current = null
    }
    usingSystemDetectorRef.current = false
    systemDetectorRef.current = null
    setIsMonitoring(false)
  }

  // Utility to grab screenshot from video stream
  const captureFrame = (stream: MediaStream): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      
      video.onloadedmetadata = () => {
        video.play()
        
        // Grab screenshot after video playing begins
        setTimeout(() => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth || 1280
            canvas.height = video.videoHeight || 720
            
            const ctx = canvas.getContext('2d')
            if (ctx) {
              // Paint the frame to context
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              
              // Downscale quality to prevent huge payloads
              const base64 = canvas.toDataURL('image/jpeg', 0.5)
              resolve(base64)
            } else {
              reject(new Error('Canvas context could not be created'))
            }
            
            // Clean up resources
            video.srcObject = null
            video.remove()
          } catch (e) {
            reject(e)
          }
        }, 300)
      }

      video.onerror = (e) => reject(e)
    })
  }

  // Check clock-in status to trigger screen share flow
  useEffect(() => {
    if (user?.role !== 'EMPLOYEE') return

    const checkShiftStatus = async () => {
      try {
        const res = await attendanceApi.getTodayStatus()
        const status = res.data.data
        const clockedIn = !!status?.clockIn
        const clockedOut = !!status?.clockOut

        if (clockedIn && !clockedOut) {
          if (!mediaStreamRef.current && !isRequestingRef.current) {
            await startMonitoring()
          }
        } else {
          if (mediaStreamRef.current) {
            stopMonitoring()
          }
        }
      } catch (err) {
        console.error('Error auto-syncing monitor shift:', err)
      }
    }

    // Initial check
    checkShiftStatus()

    // Sync state check periodically
    clockStatusRef.current = setInterval(checkShiftStatus, 15000)

    return () => {
      if (clockStatusRef.current) clearInterval(clockStatusRef.current)
      stopMonitoring()
    }
  }, [user])

  // Prevent closing tab while screen monitoring is running
  useEffect(() => {
    if (!isMonitoring) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Workforce monitoring is active. Please clock out before closing this tab.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isMonitoring])

  return { isMonitoring, monitorError, startMonitoring, stopMonitoring }
}
