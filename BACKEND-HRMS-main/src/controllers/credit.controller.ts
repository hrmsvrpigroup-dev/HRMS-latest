import { Response } from 'express'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth.middleware'
import { sendError, sendSuccess } from '../utils/response.utils'
import { UserRole } from '@prisma/client'
import { HR_CREATION_COST, EMPLOYEE_CREATION_COST, PLAN_MONTHLY_CREDITS } from '../services/tenant.service'

export const creditController = {
  async list(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId

    if (req.user?.role !== UserRole.SUPER_ADMIN && !tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    const whereClause = tenantId ? { tenantId } : {}

    try {
      const transactions = await prisma.creditTransaction.findMany({
        where: whereClause,
        include: {
          tenant: {
            select: { name: true, subdomain: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      return sendSuccess(res, transactions)
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve transaction logs', 500)
    }
  },

  async balance(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) {
      if (req.user?.role === 'SUPER_ADMIN') {
        const superAdmin = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { credits: true, firstName: true, lastName: true },
        })
        if (!superAdmin) return sendError(res, 'Super Admin not found', 404)
        
        return sendSuccess(res, {
          balance: superAdmin.credits,
          balanceInRupees: superAdmin.credits,
          companyName: `Super Admin (${superAdmin.firstName} ${superAdmin.lastName})`,
          costRules: {
            hrCreation: HR_CREATION_COST,
            employeeCreation: EMPLOYEE_CREATION_COST,
            planMonthly: PLAN_MONTHLY_CREDITS,
          },
        })
      }
      return sendError(res, 'Tenant context not found', 400)
    }

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { credits: true, name: true, subdomain: true },
      })

      if (!tenant) {
        return sendError(res, 'Tenant not found', 404)
      }

      return sendSuccess(res, {
        balance: tenant.credits,
        balanceInRupees: tenant.credits,
        companyName: tenant.name,
        costRules: {
          hrCreation: HR_CREATION_COST,
          employeeCreation: EMPLOYEE_CREATION_COST,
          planMonthly: PLAN_MONTHLY_CREDITS,
        },
      })
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to retrieve credit balance', 500)
    }
  },
}
