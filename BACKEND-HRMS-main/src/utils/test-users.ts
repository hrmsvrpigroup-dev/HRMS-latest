import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    include: { tenant: true }
  })
  console.log('--- ALL USERS IN SYSTEM ---')
  console.log(
    users.map((u) => ({
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      tenantName: u.tenant?.name,
      tenantId: u.tenantId,
    }))
  )
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
