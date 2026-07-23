import api from './axios'

export interface CreditTransaction {
  id: string
  tenantId: string
  type: 'CREDIT' | 'DEBIT'
  amount: number
  description: string
  balanceAfter: number
  createdAt: string
  tenant?: {
    name: string
    subdomain: string
  }
}

export interface CreditBalance {
  balance: number
  balanceInRupees: number
  companyName: string
  costRules: {
    hrCreation: number
    employeeCreation: number
    planMonthly: {
      Starter: number
      Professional: number
      Enterprise: number
      Custom: number
    }
  }
}

export const creditApi = {
  list: () => api.get<{ data: CreditTransaction[] }>('/credits'),
  getBalance: () => api.get<{ data: CreditBalance }>('/credits/balance'),
}
