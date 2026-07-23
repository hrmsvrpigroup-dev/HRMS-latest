import { CreditType } from '@prisma/client'

import { prisma } from '../config/database'

export const creditService = {
  async addTransaction(params: {
    tenantId: string
    amount: number
    type: CreditType
    description: string
  }) {
    const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId } })
    if (!tenant) {
      throw new Error('Tenant not found')
    }

    const nextBalance =
      params.type === 'CREDIT' ? tenant.credits + params.amount : tenant.credits - params.amount

    return prisma.$transaction([
      prisma.tenant.update({
        where: { id: params.tenantId },
        data: { credits: nextBalance },
      }),
      prisma.creditTransaction.create({
        data: {
          tenantId: params.tenantId,
          type: params.type,
          amount: params.amount,
          description: params.description,
          balanceAfter: nextBalance,
        },
      }),
    ])
  },
}

