import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const screenshots = await prisma.screenshot.findMany({
    include: { employee: true }
  })
  console.log('--- SCREENSHOTS IN DATABASE ---')
  console.log(JSON.stringify(screenshots, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
