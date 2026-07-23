import PDFDocument from 'pdfkit'
import { Blob } from 'buffer'
import { logoBase64 } from '../assets/logo.base64'


interface InvoiceData {
  invoiceNumber: string
  companyName: string
  legalCompanyName: string
  gstNumber: string
  panNumber: string
  address: {
    line1: string
    line2: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  planType: string
  subscriptionDuration: string
  subscriptionStartDate: string
  subscriptionEndDate: string
  billingAmount: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  transactionId: string
  invoiceDate: string
}

export class InvoiceService {
  private static getPlanPrice(planType: string): number {
    const prices: Record<string, number> = {
      'Starter': 999,
      'Professional': 2499,
      'Enterprise': 4999,
      'Custom': 0,
    }
    return prices[planType] || 0
  }

  private static getDurationMultiplier(duration: string): number {
    const multipliers: Record<string, number> = {
      'Monthly': 1,
      'Quarterly': 3,
      'Half Yearly': 6,
      'Yearly': 12,
    }
    return multipliers[duration] || 1
  }

  static generateInvoiceData(companyData: any): InvoiceData {
    const planPrice = this.getPlanPrice(companyData.planType)
    const durationMultiplier = this.getDurationMultiplier(companyData.subscriptionDuration)
    const billingAmount = planPrice * durationMultiplier
    const taxAmount = billingAmount * 0.18 // 18% GST
    const totalAmount = billingAmount + taxAmount

    return {
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      companyName: companyData.companyName,
      legalCompanyName: companyData.legalCompanyName,
      gstNumber: companyData.gstNumber || 'N/A',
      panNumber: companyData.panNumber || 'N/A',
      address: {
        line1: companyData.addressLine1,
        line2: companyData.addressLine2 || '',
        city: companyData.city,
        state: companyData.state,
        postalCode: companyData.postalCode,
        country: companyData.country,
      },
      planType: companyData.planType,
      subscriptionDuration: companyData.subscriptionDuration,
      subscriptionStartDate: companyData.subscriptionStartDate,
      subscriptionEndDate: companyData.subscriptionEndDate,
      billingAmount,
      taxAmount,
      totalAmount,
      paymentMethod: 'Online Payment',
      transactionId: `TXN-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
    }
  }

  static async generatePDFInvoice(invoiceData: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 })
        const chunks: Buffer[] = []

        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        // Reset default font
        doc.font('Helvetica')

        // -------------------------
        // HEADER ROW
        // -------------------------
        const topY = 40

        // Left Side: Brand Logo (VR PI GROUP OF COMPANIES)
        const logoBuffer = Buffer.from(logoBase64, 'base64')
        doc.image(logoBuffer, 50, topY, { width: 130 })

        // Right Side: INVOICE title
        doc.fontSize(28).fillColor('#1e293b').font('Helvetica-Bold').text('INVOICE', 0, topY, { align: 'right' })
        doc.fontSize(10).fillColor('#334155').font('Helvetica')
        doc.text(`Invoice No: ${invoiceData.invoiceNumber}`, 0, topY + 35, { align: 'right' })
        doc.text(`Date: ${invoiceData.invoiceDate}`, 0, topY + 50, { align: 'right' })

        // Divider (moved down to accommodate the logo height which is ~91 points)
        doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#e2e8f0').lineWidth(1).stroke()

        // -------------------------
        // BILLING & SUBSCRIPTION
        // -------------------------
        const infoY = 160

        // Bill To (Left)
        doc.fontSize(11).fillColor('#64748b').font('Helvetica-Bold').text('BILLED TO:', 50, infoY)
        doc.fontSize(12).fillColor('#1e293b').font('Helvetica-Bold').text(invoiceData.legalCompanyName, 50, infoY + 20)
        doc.fontSize(10).fillColor('#475569').font('Helvetica')
        doc.text(invoiceData.address.line1, 50, infoY + 38)
        let addressY = infoY + 52
        if (invoiceData.address.line2) {
            doc.text(invoiceData.address.line2, 50, addressY)
            addressY += 14
        }
        doc.text(`${invoiceData.address.city}, ${invoiceData.address.state} ${invoiceData.address.postalCode}`, 50, addressY)
        doc.text(invoiceData.address.country, 50, addressY + 14)
        doc.fillColor('#64748b').text(`GST: ${invoiceData.gstNumber}  |  PAN: ${invoiceData.panNumber}`, 50, addressY + 35)

        // Subscription Info (Right)
        doc.fontSize(11).fillColor('#64748b').font('Helvetica-Bold').text('SUBSCRIPTION DETAILS:', 300, infoY)
        
        doc.fontSize(10)
        doc.fillColor('#475569').font('Helvetica').text('Plan Type:', 300, infoY + 22)
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(invoiceData.planType, 380, infoY + 22)
        
        doc.fillColor('#475569').font('Helvetica').text('Duration:', 300, infoY + 38)
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(invoiceData.subscriptionDuration, 380, infoY + 38)
        
        doc.fillColor('#475569').font('Helvetica').text('Start Date:', 300, infoY + 54)
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(new Date(invoiceData.subscriptionStartDate).toLocaleDateString(), 380, infoY + 54)
        
        doc.fillColor('#475569').font('Helvetica').text('End Date:', 300, infoY + 70)
        doc.fillColor('#1e293b').font('Helvetica-Bold').text(new Date(invoiceData.subscriptionEndDate).toLocaleDateString(), 380, infoY + 70)
        
        // -------------------------
        // LINE ITEMS TABLE
        // -------------------------
        const tableTop = 320
        const tableLeft = 50
        const tableWidth = 495
        const rowHeight = 35

        // Table Header
        doc.rect(tableLeft, tableTop, tableWidth, rowHeight).fillColor('#f8fafc').fill()
        doc.rect(tableLeft, tableTop, tableWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(1).stroke()
        doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold')
        doc.text('DESCRIPTION', tableLeft + 15, tableTop + 12)
        doc.text('AMOUNT (INR)', tableLeft + tableWidth - 100, tableTop + 12, { width: 85, align: 'right' })

        // Row 1: Plan
        let currentY = tableTop + rowHeight
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(1).stroke()
        doc.fillColor('#1e293b').font('Helvetica').fontSize(10)
        doc.text(`Subscription Plan - ${invoiceData.planType} (${invoiceData.subscriptionDuration})`, tableLeft + 15, currentY + 12)
        doc.text(`${invoiceData.billingAmount.toFixed(2)}`, tableLeft + tableWidth - 100, currentY + 12, { width: 85, align: 'right' })
        
        // Row 2: Tax
        currentY += rowHeight
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).strokeColor('#e2e8f0').lineWidth(1).stroke()
        doc.text(`GST (18%)`, tableLeft + 15, currentY + 12)
        doc.text(`${invoiceData.taxAmount.toFixed(2)}`, tableLeft + tableWidth - 100, currentY + 12, { width: 85, align: 'right' })

        // Total Row
        currentY += rowHeight
        doc.rect(tableLeft, currentY, tableWidth, rowHeight + 5).fillColor('#4f46e5').fill()
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
        doc.text('Total Amount', tableLeft + 15, currentY + 13)
        doc.text(`INR ${invoiceData.totalAmount.toFixed(2)}`, tableLeft + tableWidth - 120, currentY + 13, { width: 105, align: 'right' })

        // -------------------------
        // PAYMENT INFO
        // -------------------------
        const paymentY = currentY + rowHeight + 40
        
        doc.fillColor('#64748b').fontSize(11).font('Helvetica-Bold').text('PAYMENT INFORMATION', tableLeft, paymentY)
        doc.fillColor('#475569').fontSize(10).font('Helvetica')
        doc.text(`Method: `, tableLeft, paymentY + 22).font('Helvetica-Bold').fillColor('#1e293b').text(invoiceData.paymentMethod, tableLeft + 100, paymentY + 22)
        doc.fillColor('#475569').font('Helvetica').text(`Transaction ID: `, tableLeft, paymentY + 38).font('Helvetica-Bold').fillColor('#1e293b').text(invoiceData.transactionId, tableLeft + 100, paymentY + 38)

        // -------------------------
        // FOOTER
        // -------------------------
        const footerY = 725
        doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e2e8f0').lineWidth(1).stroke()
        
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
        doc.text('This is a computer-generated invoice and does not require a physical signature.', 50, footerY + 12, { align: 'center', width: 495 })
        doc.text('Terms: All prices are in Indian Rupees (INR). GST is calculated at 18% as per current tax laws.', 50, footerY + 24, { align: 'center', width: 495 })
        doc.text('VR PI Group of Companies © 2021 | support@vrpigroup.co.in', 50, footerY + 36, { align: 'center', width: 495 })

        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  static async createInvoiceRecord(invoiceData: InvoiceData, tenantId: string, prisma: any) {
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber: invoiceData.invoiceNumber,
        billingAmount: invoiceData.billingAmount,
        taxAmount: invoiceData.taxAmount,
        totalAmount: invoiceData.totalAmount,
        paymentMethod: invoiceData.paymentMethod,
        transactionId: invoiceData.transactionId,
        invoiceDate: new Date(invoiceData.invoiceDate),
        subscriptionPeriod: invoiceData.subscriptionDuration,
        status: 'PAID',
      },
    })

    if (invoiceData.transactionId) {
      await prisma.paymentTransaction.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          transactionId: invoiceData.transactionId,
          amount: invoiceData.totalAmount,
          status: 'SUCCESS',
          paymentMethod: invoiceData.paymentMethod,
        },
      })
    }
    
    // Also log to audit for history
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'INVOICE_GENERATED',
        entity: 'Invoice',
        entityId: invoiceData.invoiceNumber,
        details: invoiceData,
        createdAt: new Date(),
      },
    })

    return invoice
  }
}

export default InvoiceService
