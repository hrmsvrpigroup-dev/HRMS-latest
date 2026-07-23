import api from './axios'

export const paymentApi = {
  createOrder: async (credits: number) => {
    const response = await api.post('/payments/create-order', { credits })
    return response.data.data
  },

  verifyPayment: async (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
    credits: number
  ) => {
    const response = await api.post('/payments/verify', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      credits
    })
    return response.data.data
  },

  createPhonePeOrder: async (credits: number) => {
    const response = await api.post('/payments/phonepe/create-order', { credits })
    return response.data.data
  },

  verifyPhonePePayment: async (merchantTransactionId: string, credits: number) => {
    const response = await api.post('/payments/phonepe/verify', {
      merchantTransactionId,
      credits
    })
    return response.data.data
  }
}
