import { Response } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth.middleware'
import { payrollService } from '../services/payroll.service'
import { sendError, sendSuccess } from '../utils/response.utils'
const pdfParse = require('pdf-parse')

export const payrollController = {
  async list(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)

    try {
      if (req.user?.role === 'EMPLOYEE') {
        const employee = await prisma.employee.findUnique({ where: { userId: req.user.id } })
        if (!employee) return sendError(res, 'Employee profile not found', 404)
        
        const items = await prisma.payroll.findMany({
          where: { tenantId, employeeId: employee.id },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        })
        return sendSuccess(res, items)
      } else {
        const items = await payrollService.listByTenant(tenantId)
        return sendSuccess(res, items)
      }
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to list payroll', 500)
    }
  },

  async downloadPayslip(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)
    
    try {
      const { id } = req.params
      const payroll = await prisma.payroll.findUnique({
        where: { id, tenantId },
        select: { slipUrl: true, employee: { select: { userId: true } } }
      })

      if (!payroll) return sendError(res, 'Payslip not found', 404)

      // Ensure employees can only download their own payslips
      if (req.user?.role === 'EMPLOYEE' && payroll.employee.userId !== req.user.id) {
        return sendError(res, 'Unauthorized to view this payslip', 403)
      }

      if (!payroll.slipUrl) {
        return sendError(res, 'Payslip PDF has not been generated yet', 400)
      }

      const filePath = path.join(__dirname, '../../public', payroll.slipUrl)
      if (!fs.existsSync(filePath)) {
        return sendError(res, 'Payslip file is missing on the server', 404)
      }

      res.download(filePath)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to download payslip', 500)
    }
  },

  // HR: Get all employees with salary details
  async getEmployeeSalaries(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const data = await payrollService.getEmployeeSalaries(tenantId)
      return sendSuccess(res, data)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch salary data', 500)
    }
  },

  // HR: Generate payroll for a given month/year
  async generatePayroll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { month, year } = req.body
      if (!month || !year) return sendError(res, 'Month and year are required', 400)
      const results = await payrollService.generatePayroll(tenantId, Number(month), Number(year))
      return sendSuccess(res, results, `Payroll generated for ${month}/${year} — ${results.length} records`)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to generate payroll', 500)
    }
  },

  // HR: Get payroll records by month/year
  async getPayrollByMonthYear(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { month, year } = req.query
      if (!month || !year) return sendError(res, 'Month and year query params required', 400)
      const data = await payrollService.getPayrollByMonthYear(tenantId, Number(month), Number(year))
      return sendSuccess(res, data)
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to fetch payroll records', 500)
    }
  },

  // HR: Mark payroll as paid
  async markAsPaid(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { id } = req.params
      const updated = await payrollService.markAsPaid(tenantId, id)
      return sendSuccess(res, updated, 'Payroll marked as paid')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update payroll', 500)
    }
  },

  // HR: Update employee salary/payroll details
  async updateEmployeeSalary(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)
      const { employeeId } = req.params
      const data = req.body
      const result = await payrollService.updateEmployeeSalary(tenantId, employeeId, data)
      return sendSuccess(res, result, 'Salary details updated successfully')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to update salary', 500)
    }
  },

  // HR: Manually upload salary slip PDF
  async uploadPayslip(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.tenantId ?? req.user?.tenantId
      if (!tenantId) return sendError(res, 'Tenant context not found', 400)

      const { employeeId, month, year, netSalary, autoDetect } = req.body
      if (!month || !year) {
        return sendError(res, 'Month and year are required', 400)
      }

      if (!autoDetect && !employeeId) {
        return sendError(res, 'Employee ID is required when auto-detect is disabled', 400)
      }

      if (!req.file) {
        return sendError(res, 'Salary slip file is required', 400)
      }

      let detectedEmployeeId = employeeId

      if (autoDetect === 'true' || autoDetect === true) {
        // Parse PDF to auto-detect employee
        const dataBuffer = fs.readFileSync(req.file.path)
        try {
          const pdfData = await pdfParse(dataBuffer)
          const text = pdfData.text

          // Get all active employees for this tenant
          const employees = await prisma.employee.findMany({
            where: { tenantId, status: 'ACTIVE' },
            select: { id: true, employeeCode: true, firstName: true, lastName: true }
          })

          const matches: any[] = []

          for (const emp of employees) {
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase()
            const code = emp.employeeCode.toLowerCase()
            
            // Check for exact employee code match first
            if (text.toLowerCase().includes(code)) {
              matches.push(emp)
            } else if (text.toLowerCase().includes(fullName)) {
              matches.push(emp)
            }
          }

          if (matches.length === 0) {
            // Delete the uploaded file since we failed to detect
            fs.unlinkSync(req.file.path)
            return sendError(res, 'Could not auto-detect any employee from this salary slip. Please uncheck Auto-detect and select the employee manually.', 404)
          }

          if (matches.length > 1) {
            // Check if any matched by employee code specifically (higher confidence)
            const codeMatches = matches.filter(emp => text.toLowerCase().includes(emp.employeeCode.toLowerCase()))
            if (codeMatches.length === 1) {
              detectedEmployeeId = codeMatches[0].id
            } else {
              fs.unlinkSync(req.file.path)
              return sendError(res, `Multiple employees detected (${matches.map(m => m.firstName).join(', ')}). Please select the employee manually.`, 400)
            }
          } else {
            detectedEmployeeId = matches[0].id
          }

          // Auto-Extraction of Payroll Details
          const updates: any = {}

          // 1. Bank Name
          const bankNameMatch = text.match(/(?:Bank Name|Bank)\s*:\s*([A-Za-z\s]+?)(?=\n|$|A\/c|Account)/i)
          if (bankNameMatch && bankNameMatch[1].trim()) updates.bankName = bankNameMatch[1].trim()

          // 2. Account Number
          const accMatch = text.match(/(?:A\/C No|Account No|Acc No|Account Number|A\/c Number)\s*[:.-]?\s*(\d{8,18})/i)
          if (accMatch) updates.accountNumber = accMatch[1].trim()

          // 3. UAN
          const uanMatch = text.match(/(?:UAN|UAN No|UAN Number)\s*[:.-]?\s*(\d{12})/i)
          if (uanMatch) updates.uanNumber = uanMatch[1].trim()

          // 4. PF (often alphanumeric with slashes)
          const pfMatch = text.match(/(?:PF No|PF Number|EPF No)\s*[:.-]?\s*([A-Z0-9/]{10,25})/i)
          if (pfMatch) {
            // If we found a PF, let's mark pfEnabled true. But we don't have a direct 'pfNumber' field in DB, only uanNumber and pfEnabled.
            updates.pfEnabled = true
          }
          if (uanMatch) updates.pfEnabled = true

          // 5. ESI
          const esiMatch = text.match(/(?:ESI No|ESIC No|ESI Number)\s*[:.-]?\s*(\d{10,17})/i)
          if (esiMatch) updates.esiEnabled = true

          // 6. Basic Salary
          const basicMatch = text.match(/(?:Basic|Basic Salary)\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i)
          let parsedBasic = 0
          if (basicMatch) {
            const val = parseFloat(basicMatch[1].replace(/,/g, ''))
            if (!isNaN(val) && val > 0) {
              parsedBasic = val
              updates.basicSalary = val
            }
          }

          // 7. Gross Salary / Total Earnings
          const grossMatch = text.match(/(?:Gross|Gross Salary|Gross Earnings|Total Earnings|Total Payable)\s*[:.-]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i)
          if (grossMatch) {
            const grossVal = parseFloat(grossMatch[1].replace(/,/g, ''))
            if (!isNaN(grossVal) && grossVal > 0) {
              // Update the Annual Gross (CTC)
              updates.salaryGross = grossVal * 12
            }
          } else if (parsedBasic > 0) {
            // If we found basic but no gross, estimate Annual Gross (assuming Basic is 50% of Monthly Gross)
            updates.salaryGross = parsedBasic * 2 * 12
          }

          if (Object.keys(updates).length > 0) {
            // Update the employee profile automatically
            try {
              await payrollService.updateEmployeeSalary(tenantId, detectedEmployeeId, updates)
            } catch (updateErr) {
              console.log('Failed to auto-update extracted details:', updateErr)
              // We do not fail the upload just because extraction update failed.
            }
          }

        } catch (parseError) {
          fs.unlinkSync(req.file.path)
          return sendError(res, 'Failed to read PDF document for auto-detection. Ensure it is a valid text-based PDF.', 400)
        }
      }

      const fileUrl = `/uploads/payslips/${req.file.filename}`

      const result = await payrollService.uploadPayslip({
        tenantId,
        employeeId: detectedEmployeeId,
        month: Number(month),
        year: Number(year),
        netSalary: netSalary ? Number(netSalary) : undefined,
        slipUrl: fileUrl,
      })

      return sendSuccess(res, result, 'Salary slip uploaded successfully')
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to upload salary slip', 500)
    }
  },
}
