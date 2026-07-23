import { prisma } from '../config/database'
import fs from 'fs'
import path from 'path'
import { PayslipService } from './payslip.service'

export const payrollService = {
  async listByTenant(tenantId: string) {
    return prisma.payroll.findMany({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 50,
    })
  },

  // HR: Get all employees with their salary/payroll details
  async getEmployeeSalaries(tenantId: string) {
    return prisma.employee.findMany({
      where: { tenantId, status: { not: 'INACTIVE' } },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        salaryGross: true,
        employmentType: true,
        joiningDate: true,
        department: { select: { name: true } },
        designation: { select: { title: true } },
        payrollDetails: {
          select: {
            salaryStructure: true,
            basicSalary: true,
            paymentType: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
            panNumber: true,
            uanNumber: true,
            pfEnabled: true,
            esiEnabled: true,
          },
        },
        payroll: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 1,
          select: {
            month: true,
            year: true,
            basicSalary: true,
            hra: true,
            allowances: true,
            deductions: true,
            pf: true,
            tax: true,
            netSalary: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { firstName: 'asc' },
    })
  },

  // HR: Generate payroll for a specific month/year
  async generatePayroll(tenantId: string, month: number, year: number) {
    const employees = await prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { payrollDetails: true },
    })

    const results = []
    for (const emp of employees) {
      const monthlyCTC = (emp.salaryGross || 0) / 12
      const basic = monthlyCTC * 0.5
      const hra = basic * 0.5
      
      // Prevent negative Special Allowance by capping LTA at remaining balance
      const lta = Math.min(3000, Math.max(0, monthlyCTC - basic - hra))
      
      const pfEnabled = emp.payrollDetails?.pfEnabled ?? false
      const employerPf = pfEnabled ? Math.min(1800, Math.max(0, (monthlyCTC - hra) * 0.12)) : 0
      
      const specialAllowance = Math.max(0, monthlyCTC - basic - hra - lta - employerPf)
      const allowances = lta + specialAllowance
      
      const pfDeduction = pfEnabled ? Math.min(1800, basic * 0.12) : 0
      const tax = monthlyCTC > 0 ? 200 : 0
      const deductions = pfDeduction + tax
      const netSalary = Math.max(0, (basic + hra + allowances) - deductions)

      const record = await prisma.payroll.upsert({
        where: {
          tenantId_employeeId_month_year: {
            tenantId,
            employeeId: emp.id,
            month,
            year,
          },
        },
        update: {
          basicSalary: basic,
          hra,
          allowances,
          deductions,
          pf: pfDeduction,
          tax,
          netSalary,
          status: 'PROCESSED',
        },
        create: {
          tenantId,
          employeeId: emp.id,
          month,
          year,
          basicSalary: basic,
          hra,
          allowances,
          deductions,
          pf: pfDeduction,
          tax,
          netSalary,
          status: 'PROCESSED',
        },
      })
      results.push(record)
    }
    return results
  },

  // HR: Get payroll history for a specific month/year
  async getPayrollByMonthYear(tenantId: string, month: number, year: number) {
    return prisma.payroll.findMany({
      where: { tenantId, month, year },
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
          },
        },
      },
      orderBy: { employee: { firstName: 'asc' } },
    })
  },

  // HR: Update payroll status to PAID and generate payslip PDF
  async markAsPaid(tenantId: string, payrollId: string) {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId, tenantId },
      include: {
        employee: {
          include: {
            payrollDetails: true,
            department: true,
            designation: true,
            tenant: true,
            addressInfo: true,
          }
        }
      }
    })

    if (!payroll) {
      throw new Error('Payroll record not found')
    }

    const emp = payroll.employee
    const tenant = emp.tenant
    const details = emp.payrollDetails
    
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const totalDays = new Date(payroll.year, payroll.month, 0).getDate()

    const payslipData = {
      companyName: tenant.name,
      companyLogoUrl: tenant.logoUrl,
      subdomain: tenant.subdomain,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      designation: emp.designation?.title || 'Employee',
      location: emp.addressInfo?.city || 'Hyderabad',
      panNumber: details?.panNumber || '',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
      bankName: details?.bankName || '',
      bankAccountNumber: details?.accountNumber || '',
      uanNumber: details?.uanNumber || '',
      pfNumber: details?.uanNumber ? 'PF-' + details.uanNumber : '-',
      esicNumber: details?.esiEnabled ? 'ESIC-' + emp.employeeCode : '-',
      daysPaid: totalDays,
      lossOfPay: 0,
      monthName: MONTHS[payroll.month - 1],
      year: payroll.year,
      basic: payroll.basicSalary,
      hra: payroll.hra,
      lta: Math.min(3000, payroll.allowances),
      specialAllowance: Math.max(0, payroll.allowances - Math.min(3000, payroll.allowances)),
      professionalTax: payroll.tax,
      pfDeduction: payroll.pf,
      otherDeductions: Math.max(0, payroll.deductions - payroll.pf - payroll.tax),
      netSalary: payroll.netSalary
    }

    const pdfBuffer = await PayslipService.generatePayslipPDF(payslipData)
    
    // Ensure payslip directory exists in public uploads
    const publicUploadsDir = path.join(__dirname, '../../public/uploads/payslips')
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true })
    }

    const fileName = `payslip-${payrollId}.pdf`
    const localFilePath = path.join(publicUploadsDir, fileName)
    fs.writeFileSync(localFilePath, pdfBuffer)

    const fileUrl = `/uploads/payslips/${fileName}`

    return prisma.payroll.update({
      where: { id: payrollId, tenantId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        slipUrl: fileUrl,
      },
    })
  },

  // HR: Update employee salary details
  async updateEmployeeSalary(tenantId: string, employeeId: string, data: {
    salaryGross?: number
    salaryStructure?: string
    basicSalary?: number
    paymentType?: string
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    panNumber?: string
    uanNumber?: string
    pfEnabled?: boolean
    esiEnabled?: boolean
  }) {
    // Verify employee belongs to tenant
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    })
    if (!employee) throw new Error('Employee not found')

    // Update main salary gross on employee record
    if (data.salaryGross !== undefined) {
      await prisma.employee.update({
        where: { id: employeeId },
        data: { salaryGross: data.salaryGross },
      })
    }

    // Upsert payroll details
    const { salaryGross, ...payrollDetailsData } = data
    return prisma.employeePayrollDetails.upsert({
      where: { employeeId },
      update: payrollDetailsData,
      create: { employeeId, ...payrollDetailsData },
    })
  },

  // HR: Manually upload salary slip PDF & sync to employee portal
  async uploadPayslip(params: {
    tenantId: string
    employeeId: string
    month: number
    year: number
    netSalary?: number
    slipUrl: string
  }) {
    const { tenantId, employeeId, month, year, netSalary, slipUrl } = params

    // Fetch employee details to calculate standard details if record doesn't exist
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { payrollDetails: true }
    })
    if (!emp) throw new Error('Employee not found')

    const monthlyCTC = (emp.salaryGross || 0) / 12
    const basic = monthlyCTC * 0.5
    const hra = basic * 0.5
    const lta = Math.min(3000, Math.max(0, monthlyCTC - basic - hra))
    const pfEnabled = emp.payrollDetails?.pfEnabled ?? false
    const employerPf = pfEnabled ? Math.min(1800, Math.max(0, (monthlyCTC - hra) * 0.12)) : 0
    const specialAllowance = Math.max(0, monthlyCTC - basic - hra - lta - employerPf)
    const allowances = lta + specialAllowance
    const pfDeduction = pfEnabled ? Math.min(1800, basic * 0.12) : 0
    const tax = monthlyCTC > 0 ? 200 : 0
    const deductions = pfDeduction + tax
    const calculatedNetSalary = Math.max(0, (basic + hra + allowances) - deductions)

    const finalNetSalary = netSalary !== undefined ? netSalary : calculatedNetSalary

    // Create or update payroll record setting it as PAID
    const payroll = await prisma.payroll.upsert({
      where: {
        tenantId_employeeId_month_year: {
          tenantId,
          employeeId,
          month,
          year,
        },
      },
      update: {
        netSalary: finalNetSalary,
        status: 'PAID',
        paidAt: new Date(),
        slipUrl,
      },
      create: {
        tenantId,
        employeeId,
        month,
        year,
        basicSalary: basic,
        hra,
        allowances,
        deductions,
        pf: pfDeduction,
        tax,
        netSalary: finalNetSalary,
        status: 'PAID',
        paidAt: new Date(),
        slipUrl,
      },
    })

    // Send email notification to employee
    try {
      const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
      const subject = `Payslip Available for ${MONTHS[month - 1]} ${year}`
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Payslip Available</h2>
          <p>Hello <strong>${emp.firstName} ${emp.lastName}</strong>,</p>
          <p>Your payslip for <strong>${MONTHS[month - 1]} ${year}</strong> has been uploaded by HR and is now available in your portal.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Period:</strong> ${MONTHS[month - 1]} ${year}</p>
            <p style="margin: 0 0 10px 0;"><strong>Net Pay:</strong> ₹${finalNetSalary.toLocaleString('en-IN')}</p>
            <p style="margin: 0 0 10px 0;"><strong>Portal URL:</strong> <a href="https://hrmsvrpigroup.com/employee/payslips">View in Portal</a></p>
          </div>
  
          <p>You can view, print, or download this payslip at any time from the "Payslips" section in your employee dashboard.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 0.8em; color: #94a3b8; text-align: center;">Thank you,<br>HRMS Operations Team</p>
        </div>
      `
      
      const { notificationService } = require('./notification.service')
      await notificationService.sendEmail(emp.email, subject, htmlBody)
      console.log(`Payslip email notification sent to ${emp.email}`)
    } catch (e) {
      console.error('Failed to send email notification:', e)
    }

    return payroll
  },
}
