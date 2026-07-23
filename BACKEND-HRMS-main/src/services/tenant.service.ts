import { prisma } from '../config/database'
import { hashPassword } from '../utils/password.utils'
import { TenantStatus, UserRole, CreditType } from '@prisma/client'

// Credit cost per plan per month (1 credit = ₹1)
export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  Starter: 100,
  Professional: 250,
  Enterprise: 500,
  Custom: 100,
}

// HR and Employee credit costs
export const HR_CREATION_COST = 20
export const EMPLOYEE_CREATION_COST = 37

export const tenantService = {
  async listTenants() {
    return prisma.tenant.findMany({
      include: {
        users: {
          where: { role: UserRole.ADMIN },
          select: { email: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createTenant(data: {
    name: string
    subdomain: string
    adminEmail: string
    adminUsername?: string
    adminFirstName: string
    adminLastName: string
    adminPassword?: string
    phone?: string
    websiteUrl?: string
    initialCredits: number
    registrationDocs?: string[]
  }) {
    const defaultPassword = data.adminPassword || 'Admin@123' // default admin password
    const hashedPassword = await hashPassword(defaultPassword)

    return prisma.$transaction(async (tx) => {
      // 1. Check if subdomain is taken
      const existingSubdomain = await tx.tenant.findUnique({
        where: { subdomain: data.subdomain },
      })
      if (existingSubdomain) {
        throw new Error(`Subdomain "${data.subdomain}" is already taken.`)
      }

      // 2. Check if admin email is taken
      const existingUser = await tx.user.findUnique({
        where: { email: data.adminEmail },
      })
      if (existingUser) {
        throw new Error(`Admin email "${data.adminEmail}" is already registered.`)
      }

      // 2.5 Check if admin username is taken (if provided)
      if (data.adminUsername) {
        const existingUsername = await tx.user.findUnique({
          where: { username: data.adminUsername },
        })
        if (existingUsername) {
          throw new Error(`Username "${data.adminUsername}" is already taken.`)
        }
      }

      // 3. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: data.subdomain,
          websiteUrl: data.websiteUrl || null,
          credits: data.initialCredits || 0,
          status: TenantStatus.PENDING,
          registrationDocs: data.registrationDocs || [],
        },
      })

      // 4. Create Admin User (Inactive until tenant is approved)
      await tx.user.create({
        data: {
          email: data.adminEmail,
          username: data.adminUsername || null,
          password: hashedPassword,
          role: UserRole.ADMIN,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          phone: data.phone || null,
          tenantId: tenant.id,
          isActive: false,
        },
      })

      // 5. If initial credits allocated, log credit transaction
      if (data.initialCredits > 0) {
        await tx.creditTransaction.create({
          data: {
            tenantId: tenant.id,
            type: CreditType.CREDIT,
            amount: data.initialCredits,
            description: 'Initial allocation on tenant creation',
            balanceAfter: data.initialCredits,
          },
        })
      }

      return tenant
    })
  },

  async updateStatus(tenantId: string, status: TenantStatus) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.tenant.findUnique({ where: { id: tenantId } })
      if (!existing) throw new Error('Tenant not found.')

      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { status },
      })

      if (status === TenantStatus.ACTIVE) {
        // Activate admin users
        await tx.user.updateMany({
          where: { tenantId, role: UserRole.ADMIN },
          data: { isActive: true },
        })

        // NOTE: Credits are NOT deducted here anymore
        // Credits will be deducted only after successful subscription payment
      }

      if (status === TenantStatus.SUSPENDED) {
        await tx.user.updateMany({
          where: { tenantId, role: UserRole.ADMIN },
          data: { isActive: false },
        })
      }

      return tenant
    })
  },

  async addCredits(tenantId: string, amount: number, description: string) {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
      })
      if (!tenant) {
        throw new Error('Tenant not found.')
      }

      const balanceAfter = tenant.credits + amount

      // Update Tenant credits
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { credits: balanceAfter },
      })

      // Log credit transaction
      await tx.creditTransaction.create({
        data: {
          tenantId,
          type: CreditType.CREDIT,
          amount,
          description,
          balanceAfter,
        },
      })

      return updatedTenant
    })
  },

  async deductSubscriptionCredits(tenantId: string, planName: string, subscriptionDuration: string) {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
      })
      if (!tenant) {
        throw new Error('Tenant not found.')
      }

      // Calculate credits based on plan and duration
      const planMonthlyCost = PLAN_MONTHLY_CREDITS[planName] ?? 100
      
      // Calculate duration multiplier
      let durationMonths = 1
      if (subscriptionDuration.includes('3 Month')) durationMonths = 3
      else if (subscriptionDuration.includes('6 Month')) durationMonths = 6
      else if (subscriptionDuration.includes('1 Year') || subscriptionDuration.includes('Annual')) durationMonths = 12

      const totalCost = planMonthlyCost * durationMonths
      const balanceAfter = Math.max(0, tenant.credits - totalCost)

      // Check if sufficient balance
      if (tenant.credits < totalCost) {
        throw new Error(`Insufficient credits. Required: ${totalCost}, Available: ${tenant.credits}`)
      }

      // Update Tenant credits
      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { credits: balanceAfter },
      })

      // Log credit transaction
      await tx.creditTransaction.create({
        data: {
          tenantId,
          type: CreditType.DEBIT,
          amount: totalCost,
          description: `Subscription payment: ${planName} plan for ${subscriptionDuration} (${durationMonths} months × ${planMonthlyCost} credits)`,
          balanceAfter,
        },
      })

      return updatedTenant
    })
  },

  async deleteTenant(tenantId: string) {
    return prisma.tenant.delete({
      where: {
        id: tenantId,
      },
    })
  },
}
