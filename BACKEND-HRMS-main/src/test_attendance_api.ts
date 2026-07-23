import { generateAccessToken } from './utils/jwt.utils'
import { prisma } from './config/database'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function main() {
  // Find a tenant and user
  const user = await prisma.user.findFirst({
    where: { role: 'HR' }
  })
  if (!user) {
    console.log('No HR user found.')
    return
  }

  const token = generateAccessToken({
    userId: user.id,
    role: user.role,
    tenantId: user.tenantId,
    email: user.email
  })

  console.log(`Generated token for HR User: ${user.email}`)

  const res = await axios.get('http://localhost:5000/api/attendance', {
    headers: { Authorization: `Bearer ${token}` }
  })

  console.log('API RESPONSE START')
  console.log(JSON.stringify(res.data, null, 2))
  console.log('API RESPONSE END')
}

main().catch(console.error)
