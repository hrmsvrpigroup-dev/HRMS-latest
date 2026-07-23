import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { attendanceController } from './controllers/attendance.controller'
import { Response } from 'express'

const prisma = new PrismaClient()

async function main() {
  // Find a user with role HR
  const user = await prisma.user.findFirst({
    where: { role: 'HR' }
  })
  if (!user) {
    console.log('No HR user found')
    return
  }

  console.log(`Found HR user: ${user.email} (Tenant: ${user.tenantId})`)

  // Construct AuthRequest mock
  const req: any = {
    tenantId: user.tenantId,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email
    }
  }

  // Construct Response mock
  const res: any = {
    status(code: number) {
      console.log(`STATUS CODE: ${code}`)
      return this
    },
    json(data: any) {
      console.log('RESPONSE DATA:')
      console.log(JSON.stringify(data, null, 2))
      return this
    }
  }

  await attendanceController.list(req, res)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
