import { PrismaClient, UserRole } from '@prisma/client'

import { hashPassword } from './password.utils'

const prisma = new PrismaClient()

async function seedSuperAdmin() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@hrms.com'
  const passwordText = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123'

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Super Admin already exists (${email}), skipping.`)
    return
  }

  await prisma.user.create({
    data: {
      email,
      password: await hashPassword(passwordText),
      role: UserRole.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Super Admin created: ${email} / (password from env)`)
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('Seeding database...')
  await seedSuperAdmin()
  // eslint-disable-next-line no-console
  console.log('Seed complete.')
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
