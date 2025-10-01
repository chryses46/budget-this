// Plaid service utilities
// This file will contain Plaid API integration logic

export interface PlaidConfig {
  clientId: string
  secret: string
  environment: 'sandbox' | 'development' | 'production'
}

export interface PlaidAccount {
  account_id: string
  name: string
  type: string
  subtype: string | null
  institution_id: string
  institution_name: string
}

export interface PlaidTransaction {
  transaction_id: string
  account_id: string
  amount: number
  type: 'debit' | 'credit'
  status: 'pending' | 'posted' | 'cancelled'
  date: string
  name: string
  merchant_name?: string
  category?: string[]
  subcategory?: string[]
  location?: {
    address?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
  }
  payment_channel?: string
  pending: boolean
  iso_currency_code?: string
  unofficial_currency_code?: string
}

export class PlaidService {
  private config: PlaidConfig

  constructor(config: PlaidConfig) {
    this.config = config
  }

  // TODO: Implement Plaid API methods
  // - exchangePublicToken(publicToken: string): Promise<string>
  // - getAccounts(accessToken: string): Promise<PlaidAccount[]>
  // - getTransactions(accessToken: string, startDate: string, endDate: string): Promise<PlaidTransaction[]>
  // - createLinkToken(userId: string): Promise<string>
  // - verifyWebhook(webhookBody: string, webhookSignature: string): boolean

  async exchangePublicToken(publicToken: string): Promise<string> {
    // TODO: Implement token exchange
    throw new Error('Plaid token exchange not implemented')
  }

  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    // TODO: Implement account fetching
    throw new Error('Plaid account fetching not implemented')
  }

  async getTransactions(
    accessToken: string, 
    startDate: string, 
    endDate: string
  ): Promise<PlaidTransaction[]> {
    // TODO: Implement transaction fetching
    throw new Error('Plaid transaction fetching not implemented')
  }

  async createLinkToken(userId: string): Promise<string> {
    // TODO: Implement link token creation
    throw new Error('Plaid link token creation not implemented')
  }

  verifyWebhook(webhookBody: string, webhookSignature: string): boolean {
    // TODO: Implement webhook verification
    return false
  }
}

// Export a default instance (will be configured with environment variables)
export const plaidService = new PlaidService({
  clientId: process.env.PLAID_CLIENT_ID || '',
  secret: process.env.PLAID_SECRET || '',
  environment: (process.env.PLAID_ENVIRONMENT as 'sandbox' | 'development' | 'production') || 'sandbox'
})
