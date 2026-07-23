import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Find hr2@techcorp.com user and their tenantId
  const hrUser = await prisma.user.findUnique({ where: { email: 'hr2@techcorp.com' } })
  console.log('HR User:', JSON.stringify(hrUser, null, 2))

  // Find all screenshots under that same tenantId
  if (hrUser?.tenantId) {
    const screenshots = await prisma.screenshot.findMany({
      where: { tenantId: hrUser.tenantId },
      select: { id: true, tenantId: true, imageUrl: true, capturedAt: true }
    })
    console.log(`\nScreenshots for tenantId=${hrUser.tenantId}: ${screenshots.length} records`)
    console.log(JSON.stringify(screenshots, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
