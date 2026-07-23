import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const logs = await prisma.attendance.findMany({
    include: {
      employee: {
        select: { firstName: true, lastName: true, employeeCode: true }
      }
    }
  })
  console.log('RESULTS_START')
  console.log(JSON.stringify(logs, null, 2))
  console.log('RESULTS_END')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
