import { NextFunction, Response } from 'express'

import { prisma } from '../config/database'
import { AuthRequest } from './auth.middleware'

export const audit = (action: string, entity?: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: req.user?.tenantId ?? req.tenantId ?? null,
          userId: req.user?.id ?? null,
          action,
          entity,
          ipAddress: req.ip,
          details: {
            method: req.method,
            path: req.originalUrl,
          },
        },
      })
    } catch {
      // Non-blocking middleware by design.
    } finally {
      next()
    }
  }
}

