import { Response } from 'express'

import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth.middleware'
import { sendError, sendSuccess } from '../utils/response.utils'
import { supabaseService } from '../services/supabase.service'

export const monitoringController = {
  async screenshots(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    // eslint-disable-next-line no-console
    console.log('[Monitoring] screenshots called. req.tenantId=', req.tenantId, ' req.user=', JSON.stringify(req.user))

    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    const whereClause: any = { tenantId }
    if (req.user?.role === 'HR') {
      whereClause.employee = { hrUserId: req.user.id }
    }

    try {
      const items = await prisma.screenshot.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { capturedAt: 'desc' },
        take: 100,
      })

      // eslint-disable-next-line no-console
      console.log('[Monitoring] returning', items.length, 'screenshots for tenantId=', tenantId)
      return sendSuccess(res, items)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[Monitoring] DB error:', err.message)
      return sendError(res, 'Failed to fetch screenshots', 500)
    }
  },

  async uploadScreenshot(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      return sendError(res, 'Unauthorized context or tenant not set', 401)
    }

    const { base64Image, activityScore, idleTime } = req.body

    if (!base64Image) {
      return sendError(res, 'Screenshot image data (Base64) is required', 400)
    }

    try {
      // Find the employee profile associated with the user
      const employee = await prisma.employee.findUnique({
        where: { userId },
      })

      if (!employee) {
        return sendError(res, 'Employee profile not found.', 404)
      }

      // Generate a unique file name
      const fileExt = 'jpg'
      const fileName = `${tenantId}/${employee.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage with local fallback
      const imageUrl = await supabaseService.uploadScreenshot(base64Image, fileName)

      // Save screenshot meta to database
      const screenshot = await prisma.screenshot.create({
        data: {
          tenantId,
          employeeId: employee.id,
          imageUrl,
          activityScore: activityScore ? parseFloat(activityScore) : 100.0,
          idleTime: idleTime ? parseInt(idleTime, 10) : 0,
        },
      })

      return sendSuccess(res, screenshot, 'Activity packet uploaded successfully', 201)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to upload screenshot details', 500)
    }
  },
}

