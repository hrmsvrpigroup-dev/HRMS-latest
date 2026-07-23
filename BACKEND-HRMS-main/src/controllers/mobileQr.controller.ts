import { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../config/database'
import { sendError, sendSuccess } from '../utils/response.utils'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.utils'
import { AuthRequest } from '../middleware/auth.middleware'
import { getSocketServer } from '../config/socket'
import { AttendanceStatus } from '@prisma/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 2 * 60 * 1000 // 2 minutes

const saveBase64Image = (base64Data: string, filename: string): string => {
  const uploadsDir = path.join(__dirname, '../../public/uploads/selfies')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64')
  const filePath = path.join(uploadsDir, filename)
  fs.writeFileSync(filePath, buffer)
  return `/uploads/selfies/${filename}`
}

// ── Controller ───────────────────────────────────────────────────────────────

export const mobileQrController = {

  /**
   * POST /api/attendance/mobile-qr/create
   * Called by the desktop when the employee clicks "Clock In via Mobile QR"
   * Requires employee to be authenticated (JWT).
   */
  async createSession(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const userId = req.user?.id
    if (!tenantId || !userId) return sendError(res, 'Unauthorized', 401)

    try {
      const employee = await prisma.employee.findUnique({ where: { userId } })
      if (!employee) return sendError(res, 'Employee profile not found', 404)

      // Expire any old PENDING sessions for this employee
      await prisma.mobileLoginSession.updateMany({
        where: { employeeId: employee.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      })

      const token = uuidv4()
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

      const session = await prisma.mobileLoginSession.create({
        data: {
          employeeId: employee.id,
          token,
          status: 'PENDING',
          expiresAt,
        },
      })

      // Build the mobile URL that will be embedded in the QR code
      let frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000'
      try {
        frontendUrl = new URL(frontendUrl).origin
      } catch (e) {
        frontendUrl = frontendUrl.replace(/\/login\/?$/, '')
      }
      const mobileUrl = `${frontendUrl}/mobile-selfie/${session.id}?token=${token}`

      // Generate QR as base64 PNG data URI
      const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      })

      return sendSuccess(res, {
        sessionId: session.id,
        qrCode: qrDataUrl,
        expiresAt: expiresAt.toISOString(),
        mobileUrl,
      }, 'QR session created')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create QR session', 500)
    }
  },

  /**
   * POST /api/attendance/mobile-qr/verify
   * Called by the mobile page after selfie capture.
   * No auth token required — uses sessionId + token instead.
   * Body: { sessionId, token, selfieBase64 }
   */
  async verifySelfie(req: Request, res: Response) {
    const { sessionId, token, selfieBase64 } = req.body as {
      sessionId?: string
      token?: string
      selfieBase64?: string
    }

    if (!sessionId || !token || !selfieBase64) {
      return sendError(res, 'sessionId, token, and selfieBase64 are required', 422)
    }

    try {
      // 1 — Load session
      const session = await prisma.mobileLoginSession.findUnique({
        where: { id: sessionId },
        include: { employee: true },
      })

      if (!session) return sendError(res, 'Session not found', 404)
      if (session.token !== token) return sendError(res, 'Invalid token', 403)
      if (session.status !== 'PENDING') {
        return sendError(res, `Session is already ${session.status}`, 400)
      }
      if (new Date() > session.expiresAt) {
        await prisma.mobileLoginSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED' } })

        try {
          getSocketServer().to(`session:${sessionId}`).emit('mobile-qr-expired', { sessionId })
        } catch (_) { /* socket not initialized yet */ }

        return sendError(res, 'QR session has expired', 400)
      }

      const employee = session.employee

      // 2 — Face verification
      if (employee.faceBaseline) {
        const { compareFaces } = await import('../utils/face.utils')
        const result = compareFaces(selfieBase64, employee.faceBaseline)

        if (result.similarity === -1) {
          // Format mismatch — upgrade baseline silently
          await prisma.employee.update({ where: { id: employee.id }, data: { faceBaseline: selfieBase64 } })
        } else if (!result.match) {
          await prisma.mobileLoginSession.update({ where: { id: sessionId }, data: { status: 'FAILED' } })

          try {
            getSocketServer().to(`session:${sessionId}`).emit('mobile-qr-failed', {
              sessionId,
              reason: `Face mismatch (${result.similarity}% similarity)`,
            })
          } catch (_) { /* socket not initialized */ }

          return sendError(res, `Face verification failed (${result.similarity}% match). Please retake.`, 400)
        }
      } else {
        // First-time — register baseline
        await prisma.employee.update({ where: { id: employee.id }, data: { faceBaseline: selfieBase64 } })
      }

      // 3 — Save selfie photo
      const selfieFilename = `selfie-${employee.id}-${Date.now()}.jpg`
      const selfieUrl = saveBase64Image(selfieBase64, selfieFilename)

      // 4 — Create / upsert attendance record
      const tenantId = employee.tenantId
      const todayStr = new Date().toISOString().split('T')[0]
      const todayDate = new Date(todayStr)
      const now = new Date()

      const existingRecord = await prisma.attendance.findUnique({
        where: { tenantId_employeeId_date: { tenantId, employeeId: employee.id, date: todayDate } },
      })

      if (existingRecord?.clockIn) {
        // Already clocked in today — just verify and mark session
        await prisma.mobileLoginSession.update({
          where: { id: sessionId },
          data: { status: 'VERIFIED', selfieUrl },
        })

        try {
          getSocketServer().to(`session:${sessionId}`).emit('mobile-qr-verified', {
            sessionId,
            alreadyClockedIn: true,
          })
        } catch (_) { /* socket not initialized */ }

        return sendSuccess(res, { alreadyClockedIn: true }, 'Already clocked in today — attendance confirmed.')
      }

      const attendance = await prisma.attendance.upsert({
        where: { tenantId_employeeId_date: { tenantId, employeeId: employee.id, date: todayDate } },
        update: {
          clockIn: now,
          status: AttendanceStatus.PRESENT,
          clockInPhoto: selfieBase64,
          loginMethod: 'MOBILE_QR',
        },
        create: {
          tenantId,
          employeeId: employee.id,
          date: todayDate,
          clockIn: now,
          status: AttendanceStatus.PRESENT,
          clockInPhoto: selfieBase64,
          loginMethod: 'MOBILE_QR',
        },
      })

      // 5 — Generate JWT tokens so desktop can log the employee in
      const userRecord = await prisma.user.findUnique({ where: { id: employee.userId ?? '' } })
      let accessToken: string | null = null
      let refreshToken: string | null = null

      if (userRecord) {
        const payload = {
          userId: userRecord.id,
          role: userRecord.role,
          tenantId: userRecord.tenantId,
          email: userRecord.email,
        }
        accessToken = generateAccessToken(payload)
        refreshToken = generateRefreshToken(payload)
      }

      // 6 — Mark session VERIFIED and store tokens
      await prisma.mobileLoginSession.update({
        where: { id: sessionId },
        data: {
          status: 'VERIFIED',
          selfieUrl,
          accessToken: accessToken ?? undefined,
          refreshToken: refreshToken ?? undefined,
        },
      })

      // 7 — Emit real-time event so desktop auto-logs in
      try {
        getSocketServer().to(`session:${sessionId}`).emit('mobile-qr-verified', {
          sessionId,
          attendanceId: attendance.id,
          clockIn: attendance.clockIn,
        })
      } catch (_) { /* socket not initialized */ }

      return sendSuccess(res, { success: true, clockIn: attendance.clockIn }, 'Attendance marked. You are clocked in! ✅')
    } catch (err: any) {
      return sendError(res, err.message || 'Verification failed', 500)
    }
  },

  /**
   * GET /api/attendance/mobile-qr/status/:sessionId
   * Polled (or used after socket event) by desktop to retrieve tokens.
   */
  async getSessionStatus(req: Request, res: Response) {
    const { sessionId } = req.params
    try {
      const session = await prisma.mobileLoginSession.findUnique({
        where: { id: sessionId },
        select: { status: true, accessToken: true, refreshToken: true, expiresAt: true },
      })
      if (!session) return sendError(res, 'Session not found', 404)

      // Auto-expire check
      if (session.status === 'PENDING' && new Date() > session.expiresAt) {
        await prisma.mobileLoginSession.update({ where: { id: sessionId }, data: { status: 'EXPIRED' } })
        return sendSuccess(res, { status: 'EXPIRED' })
      }

      return sendSuccess(res, {
        status: session.status,
        accessToken: session.status === 'VERIFIED' ? session.accessToken : null,
        refreshToken: session.status === 'VERIFIED' ? session.refreshToken : null,
      })
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch status', 500)
    }
  },
}
