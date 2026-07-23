import { Response } from 'express'

import { prisma } from '../config/database'
import { AuthRequest } from '../middleware/auth.middleware'
import { sendError, sendSuccess } from '../utils/response.utils'

import path from 'path'
import fs from 'fs'

export const documentController = {
  async list(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) {
      return sendError(res, 'Tenant context not found', 400)
    }

    const items = await prisma.document.findMany({
      where: { tenantId },
      include: { employee: true },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    })

    return sendSuccess(res, items)
  },

  async upload(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)
    
    const { employeeId, type } = req.body
    if (!employeeId || !type) return sendError(res, 'employeeId and type are required', 400)

    const file = req.file
    if (!file) return sendError(res, 'No file uploaded', 400)

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, tenantId }
    })
    if (!employee) return sendError(res, 'Employee not found', 404)

    // Ensure employee specific directory exists
    const dirName = `${employee.firstName.replace(/\\s+/g, '')}${employee.lastName.replace(/\\s+/g, '')}_${employee.employeeCode}`
    const employeeDir = path.join(process.cwd(), 'uploads', 'documents', dirName)
    
    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true })
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    const filePath = path.join(employeeDir, filename)
    
    // Write file from memory to disk
    fs.writeFileSync(filePath, file.buffer)
    
    // Save to DB
    const relativeUrl = `/uploads/documents/${dirName}/${filename}`
    const document = await prisma.document.create({
      data: {
        tenantId,
        employeeId: employee.id,
        name: file.originalname,
        type,
        fileUrl: relativeUrl,
        fileSize: file.size,
        verified: false,
      }
    })

    return sendSuccess(res, document)
  },

  async replace(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)
    
    const { id } = req.params
    const file = req.file
    if (!file) return sendError(res, 'No file uploaded', 400)

    const existingDoc = await prisma.document.findFirst({
      where: { id, tenantId },
      include: { employee: true }
    })
    
    if (!existingDoc) return sendError(res, 'Document not found', 404)

    // Delete old file
    const oldFilePath = path.join(process.cwd(), existingDoc.fileUrl)
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath)
    }

    // Save new file
    const employee = existingDoc.employee
    const dirName = `${employee.firstName.replace(/\\s+/g, '')}${employee.lastName.replace(/\\s+/g, '')}_${employee.employeeCode}`
    const employeeDir = path.join(process.cwd(), 'uploads', 'documents', dirName)
    
    if (!fs.existsSync(employeeDir)) {
      fs.mkdirSync(employeeDir, { recursive: true })
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    const filePath = path.join(employeeDir, filename)
    
    fs.writeFileSync(filePath, file.buffer)

    // Update DB
    const relativeUrl = `/uploads/documents/${dirName}/${filename}`
    const updatedDoc = await prisma.document.update({
      where: { id },
      data: {
        name: file.originalname,
        fileUrl: relativeUrl,
        fileSize: file.size,
        uploadedAt: new Date(),
        verified: false, // Reset verification on replace
      }
    })

    return sendSuccess(res, updatedDoc)
  },

  async delete(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)

    const { id } = req.params

    try {
      const existingDoc = await prisma.document.findFirst({
        where: { id, tenantId }
      })

      if (!existingDoc) return sendError(res, 'Document not found', 404)

      // Delete physical file from disk
      // fileUrl is of format /uploads/documents/[dirName]/[filename]
      // Replace leading slash if present, or just slice relative url.
      const cleanedUrl = existingDoc.fileUrl.startsWith('/') ? existingDoc.fileUrl.slice(1) : existingDoc.fileUrl
      const filePath = path.join(process.cwd(), cleanedUrl)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      // Delete from database
      await prisma.document.delete({
        where: { id }
      })

      return sendSuccess(res, null, 'Document deleted successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to delete document', 500)
    }
  },

  async verify(req: AuthRequest, res: Response) {
    const tenantId = req.tenantId ?? req.user?.tenantId
    if (!tenantId) return sendError(res, 'Tenant context not found', 400)

    const { id } = req.params

    try {
      const existingDoc = await prisma.document.findFirst({
        where: { id, tenantId }
      })

      if (!existingDoc) return sendError(res, 'Document not found', 404)

      const updatedDoc = await prisma.document.update({
        where: { id },
        data: { verified: true }
      })

      return sendSuccess(res, updatedDoc, 'Document verified successfully')
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to verify document', 500)
    }
  }
}

