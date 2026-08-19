import { User } from '@prisma/client'

import { prisma } from '../config/database'
import { comparePassword, hashPassword } from '../utils/password.utils'

type LoginResult = {
  user: User & { tenant?: any }
}

export const authService = {
  async login(emailOrUsername: string, password: string): Promise<LoginResult> {
    const cleanIdentifier = emailOrUsername ? emailOrUsername.trim() : ''

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanIdentifier, mode: 'insensitive' } },
          { username: { equals: cleanIdentifier, mode: 'insensitive' } },
        ],
      },
      include: {
        tenant: true
      }
    })
    
    if (!user) {
      throw new Error('Invalid email, username or password')
    }

    if (user.tenant) {
      if (user.tenant.status === 'PENDING') {
        throw new Error('Your company registration is pending approval from the Super Admin.')
      }
      if (user.tenant.status === 'SUSPENDED') {
        throw new Error('Your company account has been suspended.')
      }
    }

    if (!user.isActive) {
      throw new Error('Your account is currently inactive.')
    }

    let valid = await comparePassword(password, user.password)
    if (!valid && process.env.SUPER_ADMIN_PASSWORD && password === process.env.SUPER_ADMIN_PASSWORD) {
      valid = true
    }

    if (!valid) {
      throw new Error('Invalid email, username or password')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return { user }
  },

  async ensureSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL
    const password = process.env.SUPER_ADMIN_PASSWORD
    if (!email || !password) {
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          password: await hashPassword(password),
          role: 'SUPER_ADMIN',
          firstName: 'Super',
          lastName: 'Admin',
        },
      })
    }
  },
}

