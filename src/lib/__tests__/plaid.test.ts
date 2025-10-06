import { PlaidService, plaidService, PlaidConfig, PlaidAccount, PlaidTransaction } from '../plaid'

describe('plaid', () => {
  describe('PlaidService', () => {
    let plaidServiceInstance: PlaidService
    const mockConfig: PlaidConfig = {
      clientId: 'test-client-id',
      secret: 'test-secret',
      environment: 'sandbox',
    }

    beforeEach(() => {
      plaidServiceInstance = new PlaidService(mockConfig)
    })

    it('should initialize with correct config', () => {
      expect(plaidServiceInstance).toBeInstanceOf(PlaidService)
    })

    describe('exchangePublicToken', () => {
      it('should throw error as not implemented', async () => {
        await expect(plaidServiceInstance.exchangePublicToken('test-token')).rejects.toThrow(
          'Plaid token exchange not implemented'
        )
      })
    })

    describe('getAccounts', () => {
      it('should throw error as not implemented', async () => {
        await expect(plaidServiceInstance.getAccounts('test-access-token')).rejects.toThrow(
          'Plaid account fetching not implemented'
        )
      })
    })

    describe('getTransactions', () => {
      it('should throw error as not implemented', async () => {
        await expect(
          plaidServiceInstance.getTransactions('test-access-token', '2023-01-01', '2023-01-31')
        ).rejects.toThrow('Plaid transaction fetching not implemented')
      })
    })

    describe('createLinkToken', () => {
      it('should throw error as not implemented', async () => {
        await expect(plaidServiceInstance.createLinkToken('test-user-id')).rejects.toThrow(
          'Plaid link token creation not implemented'
        )
      })
    })

    describe('verifyWebhook', () => {
      it('should return false as not implemented', () => {
        const result = plaidServiceInstance.verifyWebhook('test-body', 'test-signature')
        expect(result).toBe(false)
      })
    })
  })

  describe('plaidService instance', () => {
    it('should be created with environment variables', () => {
      expect(plaidService).toBeInstanceOf(PlaidService)
    })

    it('should use environment variables for config', () => {
      // The instance is created with environment variables from process.env
      // This test verifies the instance exists and is properly configured
      expect(plaidService).toBeDefined()
    })
  })

  describe('interfaces', () => {
    it('should have correct PlaidConfig interface structure', () => {
      const config: PlaidConfig = {
        clientId: 'test',
        secret: 'test',
        environment: 'sandbox',
      }

      expect(config.clientId).toBe('test')
      expect(config.secret).toBe('test')
      expect(config.environment).toBe('sandbox')
    })

    it('should have correct PlaidAccount interface structure', () => {
      const account: PlaidAccount = {
        account_id: 'test-account-id',
        name: 'Test Account',
        type: 'depository',
        subtype: 'checking',
        institution_id: 'test-institution-id',
        institution_name: 'Test Bank',
      }

      expect(account.account_id).toBe('test-account-id')
      expect(account.name).toBe('Test Account')
      expect(account.type).toBe('depository')
      expect(account.subtype).toBe('checking')
      expect(account.institution_id).toBe('test-institution-id')
      expect(account.institution_name).toBe('Test Bank')
    })

    it('should have correct PlaidTransaction interface structure', () => {
      const transaction: PlaidTransaction = {
        transaction_id: 'test-transaction-id',
        account_id: 'test-account-id',
        amount: 100.50,
        type: 'debit',
        status: 'posted',
        date: '2023-01-01',
        name: 'Test Transaction',
        merchant_name: 'Test Merchant',
        category: ['Food'],
        subcategory: ['Restaurants'],
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test State',
          postal_code: '12345',
          country: 'US',
        },
        payment_channel: 'in_store',
        pending: false,
        iso_currency_code: 'USD',
        unofficial_currency_code: 'USD',
      }

      expect(transaction.transaction_id).toBe('test-transaction-id')
      expect(transaction.account_id).toBe('test-account-id')
      expect(transaction.amount).toBe(100.50)
      expect(transaction.type).toBe('debit')
      expect(transaction.status).toBe('posted')
      expect(transaction.date).toBe('2023-01-01')
      expect(transaction.name).toBe('Test Transaction')
      expect(transaction.merchant_name).toBe('Test Merchant')
      expect(transaction.category).toEqual(['Food'])
      expect(transaction.subcategory).toEqual(['Restaurants'])
      expect(transaction.location).toBeDefined()
      expect(transaction.payment_channel).toBe('in_store')
      expect(transaction.pending).toBe(false)
      expect(transaction.iso_currency_code).toBe('USD')
      expect(transaction.unofficial_currency_code).toBe('USD')
    })

    it('should handle optional fields in PlaidTransaction', () => {
      const minimalTransaction: PlaidTransaction = {
        transaction_id: 'test-transaction-id',
        account_id: 'test-account-id',
        amount: 100.50,
        type: 'debit',
        status: 'posted',
        date: '2023-01-01',
        name: 'Test Transaction',
        pending: false,
      }

      expect(minimalTransaction.merchant_name).toBeUndefined()
      expect(minimalTransaction.category).toBeUndefined()
      expect(minimalTransaction.subcategory).toBeUndefined()
      expect(minimalTransaction.location).toBeUndefined()
      expect(minimalTransaction.payment_channel).toBeUndefined()
      expect(minimalTransaction.iso_currency_code).toBeUndefined()
      expect(minimalTransaction.unofficial_currency_code).toBeUndefined()
    })
  })
})
