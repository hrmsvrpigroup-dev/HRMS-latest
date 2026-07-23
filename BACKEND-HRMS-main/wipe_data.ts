import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping all dummy data...");
  try {
    // Truncate the Tenant table which will cascade to all other tables
    // because they all relate to Tenant.
    // If some tables don't relate to Tenant, we will truncate them as well.
    // To be safe, we will fetch all table names and truncate them.
    
    const tables = await prisma.$queryRaw<{tablename: string}[]>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != '_prisma_migrations';
    `;

    for (const { tablename } of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      console.log(`Truncated ${tablename}`);
    }

    console.log("All data has been successfully removed!");
  } catch (err) {
    console.error("Error wiping data:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
