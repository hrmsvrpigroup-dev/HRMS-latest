import { Request, Response } from 'express'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { prisma } from '../config/database'
import { sendSuccess, sendError } from '../utils/response.utils'

export const paymentController = {
  async createOrder(req: Request, res: Response) {
    try {
      const { credits } = req.body
      if (!credits || credits < 1) {
        return sendError(res, 'Invalid credit amount', 400)
      }

      // 1 credit = 1 INR
      const amountInPaise = credits * 100

      const keyId = process.env.RAZORPAY_KEY_ID
      const keySecret = process.env.RAZORPAY_KEY_SECRET

      if (!keyId || !keySecret) {
        // Return a mock order for simulation/testing
        return sendSuccess(res, {
          isMock: true,
          orderId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          amount: amountInPaise,
          currency: 'INR',
        }, 'Simulation order created successfully')
      }

      const instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }

      const order = await instance.orders.create(options)

      return sendSuccess(res, {
        isMock: false,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: keyId,
      }, 'Order created successfully')
    } catch (err: any) {
      console.error('Error creating order:', err)
      return sendError(res, err.message || 'Failed to create order', 500)
    }
  },

  async verifyPayment(req: Request, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendError(res, 'Missing payment parameters', 400)
      }

      if (razorpay_order_id.startsWith('mock_')) {
        // Skip verification for mock payments
      } else {
        const keySecret = process.env.RAZORPAY_KEY_SECRET || ''
        const body = razorpay_order_id + '|' + razorpay_payment_id
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(body.toString())
          .digest('hex')

        const isAuthentic = expectedSignature === razorpay_signature
        if (!isAuthentic) {
          return sendError(res, 'Payment verification failed', 400)
        }
      }

      // Payment verified! Now add credits to the tenant
      // Note: we're assuming the user is authenticated and we have their tenant ID from req.user
      const user = (req as any).user
      
      if (!user) {
        return sendError(res, 'Unauthorized', 401)
      }

      if (!user.tenantId) {
        // Super Admin buying credits
        const updatedSuperAdmin = await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: {
              increment: Number(credits)
            }
          }
        })
        return sendSuccess(res, { credits: updatedSuperAdmin.credits }, 'Payment successful and credits added to Super Admin wallet')
      }

      // Update tenant credits
      const tenant = await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          credits: {
            increment: credits
          }
        }
      })

      // Optionally record in CreditTransaction
      await prisma.creditTransaction.create({
        data: {
          tenantId: tenant.id,
          type: 'CREDIT',
          amount: credits,
          description: `Purchased ${credits} credits via Razorpay (Txn: ${razorpay_payment_id})`,
          balanceAfter: tenant.credits,
        }
      })

      return sendSuccess(res, { credits: tenant.credits }, 'Payment successful and credits added!')
    } catch (err: any) {
      console.error('Error verifying payment:', err)
      return sendError(res, err.message || 'Failed to verify payment', 500)
    }
  },

  async createPhonePeOrder(req: Request, res: Response) {
    try {
      const { credits } = req.body
      const user = (req as any).user

      if (!credits || credits < 1) {
        return sendError(res, 'Invalid credit amount', 400)
      }

      const amountInPaise = credits * 100
      const merchantTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(7)}`

      const mid = process.env.PHONEPE_MERCHANT_ID
      const saltKey = process.env.PHONEPE_SALT_KEY
      const saltIndex = process.env.PHONEPE_SALT_INDEX || '1'
      const envType = process.env.PHONEPE_ENV || 'SANDBOX'

      if (!mid || !saltKey) {
        // Simulation mode
        return sendSuccess(res, {
          isMock: true,
          merchantTransactionId,
          amount: amountInPaise,
          redirectUrl: `http://localhost:3000/superadmin/wallet?gateway=phonepe&txnId=${merchantTransactionId}&credits=${credits}`
        }, 'PhonePe Simulation Order created successfully')
      }

      let baseFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      try {
        baseFrontendUrl = new URL(baseFrontendUrl).origin
      } catch (e) {
        baseFrontendUrl = baseFrontendUrl.replace(/\/login\/?$/, '')
      }

      const payload = {
        merchantId: mid,
        merchantTransactionId,
        merchantUserId: user?.id || 'USER_GUEST',
        amount: amountInPaise,
        redirectUrl: `${baseFrontendUrl}/superadmin/wallet?gateway=phonepe&txnId=${merchantTransactionId}&credits=${credits}`,
        redirectMode: 'REDIRECT',
        paymentInstrument: {
          type: 'PAY_PAGE'
        }
      }

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
      const signString = base64Payload + '/pg/v1/pay' + saltKey
      const sha256 = crypto.createHash('sha256').update(signString).digest('hex')
      const xVerify = sha256 + '###' + saltIndex

      const baseUrl = envType === 'PRODUCTION'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox'

      // We'll perform request using dynamic fetch (Node 18+ has native fetch)
      const apiResponse = await fetch(`${baseUrl}/pg/v1/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerify,
        },
        body: JSON.stringify({ request: base64Payload })
      })

      const data = await apiResponse.json() as any
      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return sendSuccess(res, {
          isMock: false,
          merchantTransactionId,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url
        }, 'PhonePe Order created successfully')
      } else {
        return sendError(res, data.message || 'PhonePe order creation failed', 400)
      }
    } catch (err: any) {
      console.error('Error creating PhonePe order:', err)
      return sendError(res, err.message || 'Failed to create PhonePe order', 500)
    }
  },

  async verifyPhonePePayment(req: Request, res: Response) {
    try {
      const { merchantTransactionId, credits } = req.body
      const user = (req as any).user

      if (!merchantTransactionId || !credits) {
        return sendError(res, 'Missing parameter: merchantTransactionId or credits', 400)
      }

      const mid = process.env.PHONEPE_MERCHANT_ID
      const saltKey = process.env.PHONEPE_SALT_KEY
      const saltIndex = process.env.PHONEPE_SALT_INDEX || '1'
      const envType = process.env.PHONEPE_ENV || 'SANDBOX'

      if (merchantTransactionId.startsWith('TXN_') && (!mid || !saltKey)) {
        // Simulation bypass
      } else {
        // Real PhonePe verification
        const signString = `/pg/v1/status/${mid}/${merchantTransactionId}` + saltKey
        const sha256 = crypto.createHash('sha256').update(signString).digest('hex')
        const xVerify = sha256 + '###' + saltIndex

        const baseUrl = envType === 'PRODUCTION'
          ? 'https://api.phonepe.com/apis/hermes'
          : 'https://api-preprod.phonepe.com/apis/pg-sandbox'

        const apiResponse = await fetch(`${baseUrl}/pg/v1/status/${mid}/${merchantTransactionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': mid || ''
          }
        })

        const data = await apiResponse.json() as any
        if (!data.success || data.code !== 'PAYMENT_SUCCESS') {
          return sendError(res, data.message || 'PhonePe payment failed or pending', 400)
        }
      }

      // Add credits
      if (!user) {
        return sendError(res, 'Unauthorized', 401)
      }

      if (!user.tenantId) {
        const updatedSuperAdmin = await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: {
              increment: Number(credits)
            }
          }
        })
        return sendSuccess(res, { credits: updatedSuperAdmin.credits }, 'PhonePe payment verified successfully for Super Admin')
      }

      const tenant = await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          credits: {
            increment: Number(credits)
          }
        }
      })

      await prisma.creditTransaction.create({
        data: {
          tenantId: tenant.id,
          type: 'CREDIT',
          amount: Number(credits),
          description: `Purchased ${credits} credits via PhonePe (Txn: ${merchantTransactionId})`,
          balanceAfter: tenant.credits,
        }
      })

      return sendSuccess(res, { credits: tenant.credits }, 'PhonePe payment verified successfully!')
    } catch (err: any) {
      console.error('Error verifying PhonePe payment:', err)
      return sendError(res, err.message || 'Failed to verify PhonePe payment', 500)
    }
  },

  async verifySubscriptionPayment(req: Request, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName, subscriptionDuration, tenantId } = req.body

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendError(res, 'Missing payment parameters', 400)
      }

      if (!planName || !subscriptionDuration || !tenantId) {
        return sendError(res, 'Missing subscription details', 400)
      }

      // Verify payment signature
      if (razorpay_order_id.startsWith('mock_')) {
        // Skip verification for mock payments
      } else {
        const keySecret = process.env.RAZORPAY_KEY_SECRET || ''
        const body = razorpay_order_id + '|' + razorpay_payment_id
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(body.toString())
          .digest('hex')

        const isAuthentic = expectedSignature === razorpay_signature
        if (!isAuthentic) {
          return sendError(res, 'Payment verification failed', 400)
        }
      }

      // Payment verified! Now deduct subscription credits
      const { tenantService } = await import('../services/tenant.service')
      const tenant = await tenantService.deductSubscriptionCredits(tenantId, planName, subscriptionDuration)

      // Record payment transaction
      await prisma.paymentTransaction.create({
        data: {
          tenantId,
          amount: 0, // Amount is in credits, not rupees
          status: 'SUCCESS',
          paymentMethod: 'Razorpay',
          transactionId: razorpay_payment_id,
        },
      })

      return sendSuccess(res, { 
        credits: tenant.credits,
        message: 'Subscription payment successful and credits deducted!'
      }, 'Subscription activated successfully')
    } catch (err: any) {
      console.error('Error verifying subscription payment:', err)
      return sendError(res, err.message || 'Failed to verify subscription payment', 500)
    }
  },
}
