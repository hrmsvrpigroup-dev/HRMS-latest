import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import { salaryAdvanceService } from '../services/salaryAdvance.service'
import { sendError, sendSuccess } from '../utils/response.utils'

export const salaryAdvanceController = {
  async getStats(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const stats = await salaryAdvanceService.getStats(tenantId)
      return sendSuccess(res, stats)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to load stats', 500)
    }
  },

  async list(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { status } = req.query
      const data = await salaryAdvanceService.list(tenantId, status as string | undefined)
      return sendSuccess(res, data)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list advances', 500)
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { employeeId, amount, reason, repaymentMonths, notes } = req.body
      if (!employeeId || !amount || !reason)
        return sendError(res, 'employeeId, amount, and reason are required', 400)
      const record = await salaryAdvanceService.create(tenantId, {
        employeeId, amount: Number(amount), reason,
        repaymentMonths: Number(repaymentMonths) || 3,
        notes,
      })
      return sendSuccess(res, record, 'Salary advance request created successfully')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to create advance', 500)
    }
  },

  async approve(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { id } = req.params
      const updated = await salaryAdvanceService.approve(tenantId, id, req.user!.id)
      return sendSuccess(res, updated, 'Advance approved successfully')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to approve advance', 500)
    }
  },

  async reject(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { id } = req.params
      const { rejectionReason } = req.body
      if (!rejectionReason) return sendError(res, 'Rejection reason is required', 400)
      const updated = await salaryAdvanceService.reject(tenantId, id, rejectionReason, req.user!.id)
      return sendSuccess(res, updated, 'Advance rejected')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to reject advance', 500)
    }
  },

  async disburse(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { id } = req.params
      const updated = await salaryAdvanceService.disburse(tenantId, id)
      return sendSuccess(res, updated, 'Advance marked as disbursed')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to disburse advance', 500)
    }
  },

  async recordRepayment(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { id } = req.params
      const { amount } = req.body
      if (!amount) return sendError(res, 'Repayment amount is required', 400)
      const updated = await salaryAdvanceService.recordRepayment(tenantId, id, Number(amount))
      return sendSuccess(res, updated, 'Repayment recorded')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to record repayment', 500)
    }
  },
}
