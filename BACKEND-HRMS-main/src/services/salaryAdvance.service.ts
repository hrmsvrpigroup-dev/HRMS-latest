import { prisma } from '../config/database'

export const salaryAdvanceService = {
  // Create a new advance request
  async create(tenantId: string, data: {
    employeeId: string
    amount: number
    reason: string
    repaymentMonths: number
    notes?: string
  }) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId },
    })
    if (!employee) throw new Error('Employee not found')

    const monthlyDeduction = data.amount / data.repaymentMonths

    return prisma.salaryAdvance.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        amount: data.amount,
        reason: data.reason,
        repaymentMonths: data.repaymentMonths,
        monthlyDeduction,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            employeeCode: true, firstName: true, lastName: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
    })
  },

  // List all advances for a tenant with optional status filter
  async list(tenantId: string, status?: string) {
    return prisma.salaryAdvance.findMany({
      where: {
        tenantId,
        ...(status && status !== 'ALL' ? { status: status as any } : {}),
      },
      include: {
        employee: {
          select: {
            employeeCode: true, firstName: true, lastName: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  // Approve an advance
  async approve(tenantId: string, advanceId: string, approvedById: string) {
    const adv = await prisma.salaryAdvance.findFirst({
      where: { id: advanceId, tenantId },
    })
    if (!adv) throw new Error('Advance request not found')
    if (adv.status !== 'PENDING') throw new Error('Only PENDING advances can be approved')

    return prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    })
  },

  // Reject an advance
  async reject(tenantId: string, advanceId: string, rejectionReason: string, approvedById: string) {
    const adv = await prisma.salaryAdvance.findFirst({
      where: { id: advanceId, tenantId },
    })
    if (!adv) throw new Error('Advance request not found')
    if (adv.status !== 'PENDING') throw new Error('Only PENDING advances can be rejected')

    return prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: 'REJECTED', rejectionReason, approvedById, approvedAt: new Date() },
    })
  },

  // Disburse (mark as paid to employee)
  async disburse(tenantId: string, advanceId: string) {
    const adv = await prisma.salaryAdvance.findFirst({
      where: { id: advanceId, tenantId },
    })
    if (!adv) throw new Error('Advance request not found')
    if (adv.status !== 'APPROVED') throw new Error('Only APPROVED advances can be disbursed')

    return prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: { status: 'DISBURSED', disbursedAt: new Date() },
    })
  },

  // Record repayment instalment
  async recordRepayment(tenantId: string, advanceId: string, amount: number) {
    const adv = await prisma.salaryAdvance.findFirst({
      where: { id: advanceId, tenantId },
    })
    if (!adv) throw new Error('Advance request not found')
    if (adv.status !== 'DISBURSED') throw new Error('Only DISBURSED advances can have repayments recorded')

    const newRepaid = adv.amountRepaid + amount
    const isFullyRepaid = newRepaid >= adv.amount

    return prisma.salaryAdvance.update({
      where: { id: advanceId },
      data: {
        amountRepaid: newRepaid,
        status: isFullyRepaid ? 'REPAID' : 'DISBURSED',
      },
    })
  },

  // Stats summary
  async getStats(tenantId: string) {
    const [all, pending, approved, disbursed, repaid] = await Promise.all([
      prisma.salaryAdvance.aggregate({ where: { tenantId }, _sum: { amount: true }, _count: true }),
      prisma.salaryAdvance.count({ where: { tenantId, status: 'PENDING' } }),
      prisma.salaryAdvance.count({ where: { tenantId, status: 'APPROVED' } }),
      prisma.salaryAdvance.aggregate({ where: { tenantId, status: 'DISBURSED' }, _sum: { amount: true, amountRepaid: true }, _count: true }),
      prisma.salaryAdvance.count({ where: { tenantId, status: 'REPAID' } }),
    ])
    return {
      totalAdvances: all._count,
      totalAmount: all._sum.amount || 0,
      pending,
      approved,
      disbursed: disbursed._count,
      disbursedAmount: disbursed._sum.amount || 0,
      outstandingBalance: (disbursed._sum.amount || 0) - (disbursed._sum.amountRepaid || 0),
      repaid,
    }
  },
}
