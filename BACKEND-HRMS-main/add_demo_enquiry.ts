import { PrismaClient, TenantStatus, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const subdomain = 'apexglobal';
  const email = 'john.doe@apexglobal.com';

  console.log('Checking for existing demo company...');
  const existingTenant = await prisma.tenant.findUnique({
    where: { subdomain },
  });

  if (existingTenant) {
    console.log(`Demo company with subdomain "${subdomain}" already exists. Deleting first...`);
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // Check user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  console.log('Creating demo enquiry data...');
  // 1. Create Pending Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Apex Global LLP',
      subdomain: subdomain,
      websiteUrl: 'https://apexglobal.com',
      credits: 1000,
      status: TenantStatus.PENDING,
    },
  });

  // 2. Create Admin User (enquirer contact)
  const user = await prisma.user.create({
    data: {
      email: email,
      username: email,
      password: '$2a$10$89.l1W633lH6dEDe.mU5vud70hN9D7lXvE5D8F0z/h84w0wL2R8.2', // Hashed 'Admin@123'
      role: UserRole.ADMIN,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+91 98765 43210',
      isActive: false,
      tenantId: tenant.id,
    },
  });

  console.log('Demo enquiry created successfully!');
  console.log('Tenant:', JSON.stringify(tenant, null, 2));
  console.log('User:', JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
