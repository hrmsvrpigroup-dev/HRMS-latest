import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Password@123', 10);
  
  await prisma.user.updateMany({
    where: { role: 'HR' },
    data: { password: hashedPassword }
  });
  console.log("All HR passwords have been reset to: Password@123");
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
