import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hrUsers = await prisma.user.findMany({
    where: { role: 'HR' },
    select: { email: true, username: true, tenant: { select: { name: true } } }
  });
  console.log("HR Users:", JSON.stringify(hrUsers, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
