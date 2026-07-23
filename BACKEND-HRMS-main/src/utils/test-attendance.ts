import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const attendance = await prisma.attendance.findMany({
    include: { employee: true }
  })
  console.log('--- ATTENDANCE IN DATABASE ---')
  console.log(JSON.stringify(attendance, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
