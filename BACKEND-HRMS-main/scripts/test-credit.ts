import { prisma } from '../src/config/database';
import { creditController } from '../src/controllers/credit.controller';

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'HR' } });
  if (!user) return console.log('No HR user found');
  
  const req: any = {
    user: { id: user.id, role: user.role, tenantId: user.tenantId },
    tenantId: user.tenantId
  };
  
  const res: any = {
    status: (code: number) => ({
      json: (data: any) => console.log('Status:', code, data)
    }),
    json: (data: any) => console.log('JSON:', data)
  };
  
  console.log('Testing /credits');
  await creditController.list(req, res);
  
  console.log('\nTesting /credits/balance');
  await creditController.balance(req, res);
}

test().catch(console.error).finally(() => process.exit(0));
