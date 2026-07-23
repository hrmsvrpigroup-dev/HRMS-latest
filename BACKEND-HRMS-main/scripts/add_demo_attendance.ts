import { PrismaClient, EmployeeStatus, AttendanceStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding demo employees and attendance...')

  // Find an active tenant
  const tenant = await prisma.tenant.findFirst({
    where: { status: 'ACTIVE' }
  })

  if (!tenant) {
    console.log('No active tenant found. Please ensure there is an active tenant first.')
    return
  }

  console.log(`Using tenant: ${tenant.name} (${tenant.id})`)

  // 1. Create a few employees
  const employees = [
    {
      tenantId: tenant.id,
      employeeCode: 'EMP002',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob.jones@demo.com',
      joiningDate: new Date('2025-03-10'),
      status: EmployeeStatus.ACTIVE
    },
    {
      tenantId: tenant.id,
      employeeCode: 'EMP003',
      firstName: 'Charlie',
      lastName: 'Brown',
      email: 'charlie.brown@demo.com',
      joiningDate: new Date('2025-05-20'),
      status: EmployeeStatus.INACTIVE
    }
  ]

  const createdEmployees = []
  for (const empData of employees) {
    const emp = await prisma.employee.upsert({
      where: {
        tenantId_employeeCode: {
          tenantId: tenant.id,
          employeeCode: empData.employeeCode
        }
      },
      update: {},
      create: empData
    })
    createdEmployees.push(emp)
    console.log(`Created/found employee: ${emp.firstName} ${emp.lastName}`)
  }

  // 2. Create Attendance records for June 1, 2026 (Today)
  // Alice is Present, Bob is On Leave, Charlie is Inactive (so no attendance or maybe just to show up in Inactive count, employee status is INACTIVE)
  const today = new Date('2026-06-01T00:00:00.000Z')
  
  // Alice: Present
  await prisma.attendance.upsert({
    where: {
      tenantId_employeeId_date: {
        tenantId: tenant.id,
        employeeId: createdEmployees[0].id,
        date: today
      }
    },
    update: { status: AttendanceStatus.PRESENT, clockIn: new Date('2026-06-01T09:00:00.000Z') },
    create: {
      tenantId: tenant.id,
      employeeId: createdEmployees[0].id,
      date: today,
      status: AttendanceStatus.PRESENT,
      clockIn: new Date('2026-06-01T09:00:00.000Z')
    }
  })

  // Bob: On Leave
  await prisma.attendance.upsert({
    where: {
      tenantId_employeeId_date: {
        tenantId: tenant.id,
        employeeId: createdEmployees[1].id,
        date: today
      }
    },
    update: { status: AttendanceStatus.ON_LEAVE },
    create: {
      tenantId: tenant.id,
      employeeId: createdEmployees[1].id,
      date: today,
      status: AttendanceStatus.ON_LEAVE
    }
  })

  console.log('Demo attendance data added successfully for 2026-06-01!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
