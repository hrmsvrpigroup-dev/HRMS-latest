import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

console.log('Testing DATABASE_URL:', process.env.DATABASE_URL)

async function test() {
  const prisma = new PrismaClient()
  try {
    await prisma.$connect()
    console.log('Prisma connected successfully!')
    const count = await prisma.user.count()
    console.log('User count:', count)
  } catch (err: any) {
    console.error('Prisma connection error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()
