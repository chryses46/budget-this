import {
  registerSchema,
  loginSchema,
  mfaSchema,
  emailLoginSchema,
  billSchema,
  updateBillSchema,
  budgetCategorySchema,
  updateBudgetCategorySchema,
  expenditureSchema,
  updateExpenditureSchema,
  plaidLinkSchema,
  accountSchema,
  transactionSchema,
} from '../validations'

describe('validations', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      }

      expect(() => registerSchema.parse(validData)).not.toThrow()
    })

    it('should reject missing required fields', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        // missing email and password
      }

      expect(() => registerSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'password123',
      }

      expect(() => registerSchema.parse(invalidData)).toThrow()
    })

    it('should reject short password', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'short',
      }

      expect(() => registerSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty names', () => {
      const invalidData = {
        firstName: '',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      }

      expect(() => registerSchema.parse(invalidData)).toThrow()
    })
  })

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123',
      }

      expect(() => loginSchema.parse(validData)).not.toThrow()
    })

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      }

      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    it('should reject missing password', () => {
      const invalidData = {
        email: 'john@example.com',
      }

      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }

      expect(() => loginSchema.parse(invalidData)).toThrow()
    })
  })

  describe('mfaSchema', () => {
    it('should validate correct MFA code', () => {
      const validData = {
        code: '123456',
      }

      expect(() => mfaSchema.parse(validData)).not.toThrow()
    })

    it('should reject code that is too short', () => {
      const invalidData = {
        code: '12345',
      }

      expect(() => mfaSchema.parse(invalidData)).toThrow()
    })

    it('should reject code that is too long', () => {
      const invalidData = {
        code: '1234567',
      }

      expect(() => mfaSchema.parse(invalidData)).toThrow()
    })

    it('should accept non-numeric code (only length is validated)', () => {
      const validData = {
        code: 'abc123',
      }

      expect(() => mfaSchema.parse(validData)).not.toThrow()
    })
  })

  describe('emailLoginSchema', () => {
    it('should validate correct email', () => {
      const validData = {
        email: 'john@example.com',
      }

      expect(() => emailLoginSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      expect(() => emailLoginSchema.parse(invalidData)).toThrow()
    })
  })

  describe('billSchema', () => {
    it('should validate correct bill data', () => {
      const validData = {
        title: 'Electric Bill',
        amount: 150.50,
        dayDue: 15,
        frequency: 'Monthly',
      }

      expect(() => billSchema.parse(validData)).not.toThrow()
    })

    it('should reject negative amount', () => {
      const invalidData = {
        title: 'Electric Bill',
        amount: -150.50,
        dayDue: 15,
        frequency: 'Monthly',
      }

      expect(() => billSchema.parse(invalidData)).toThrow()
    })

    it('should reject day due out of range', () => {
      const invalidData = {
        title: 'Electric Bill',
        amount: 150.50,
        dayDue: 32,
        frequency: 'Monthly',
      }

      expect(() => billSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid frequency', () => {
      const invalidData = {
        title: 'Electric Bill',
        amount: 150.50,
        dayDue: 15,
        frequency: 'Daily',
      }

      expect(() => billSchema.parse(invalidData)).toThrow()
    })
  })

  describe('updateBillSchema', () => {
    it('should validate partial bill data', () => {
      const validData = {
        title: 'Updated Bill',
        amount: 200.00,
      }

      expect(() => updateBillSchema.parse(validData)).not.toThrow()
    })

    it('should validate empty object', () => {
      const validData = {}

      expect(() => updateBillSchema.parse(validData)).not.toThrow()
    })
  })

  describe('budgetCategorySchema', () => {
    it('should validate correct budget category data', () => {
      const validData = {
        title: 'Groceries',
        limit: 500.00,
      }

      expect(() => budgetCategorySchema.parse(validData)).not.toThrow()
    })

    it('should reject negative limit', () => {
      const invalidData = {
        title: 'Groceries',
        limit: -500.00,
      }

      expect(() => budgetCategorySchema.parse(invalidData)).toThrow()
    })
  })

  describe('expenditureSchema', () => {
    it('should validate correct expenditure data', () => {
      const validData = {
        title: 'Grocery Shopping',
        amount: 75.25,
        categoryId: 'category-123',
      }

      expect(() => expenditureSchema.parse(validData)).not.toThrow()
    })

    it('should reject negative amount', () => {
      const invalidData = {
        title: 'Grocery Shopping',
        amount: -75.25,
        categoryId: 'category-123',
      }

      expect(() => expenditureSchema.parse(invalidData)).toThrow()
    })

    it('should reject empty categoryId', () => {
      const invalidData = {
        title: 'Grocery Shopping',
        amount: 75.25,
        categoryId: '',
      }

      expect(() => expenditureSchema.parse(invalidData)).toThrow()
    })
  })

  describe('plaidLinkSchema', () => {
    it('should validate correct plaid link data', () => {
      const validData = {
        publicToken: 'public-token-123',
      }

      expect(() => plaidLinkSchema.parse(validData)).not.toThrow()
    })

    it('should reject empty public token', () => {
      const invalidData = {
        publicToken: '',
      }

      expect(() => plaidLinkSchema.parse(invalidData)).toThrow()
    })
  })

  describe('accountSchema', () => {
    it('should validate correct account data', () => {
      const validData = {
        plaidAccountId: 'account-123',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        institution: 'Test Bank',
        institutionId: 'inst-123',
      }

      expect(() => accountSchema.parse(validData)).not.toThrow()
    })

    it('should validate account without subtype', () => {
      const validData = {
        plaidAccountId: 'account-123',
        name: 'Checking Account',
        type: 'depository',
        institution: 'Test Bank',
        institutionId: 'inst-123',
      }

      expect(() => accountSchema.parse(validData)).not.toThrow()
    })
  })

  describe('transactionSchema', () => {
    it('should validate correct transaction data', () => {
      const validData = {
        plaidTransactionId: 'txn-123',
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 25.50,
        type: 'DEBIT',
        status: 'POSTED',
        date: '2023-01-01T00:00:00Z',
        name: 'Test Transaction',
        merchantName: 'Test Merchant',
        category: 'Food',
        subcategory: 'Restaurants',
        location: { address: '123 Main St' },
        paymentChannel: 'in_store',
        pending: false,
        isoCurrencyCode: 'USD',
        unofficialCurrencyCode: 'USD',
      }

      expect(() => transactionSchema.parse(validData)).not.toThrow()
    })

    it('should validate transaction with minimal data', () => {
      const validData = {
        plaidTransactionId: 'txn-123',
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 25.50,
        type: 'DEBIT',
        status: 'POSTED',
        date: '2023-01-01T00:00:00Z',
        name: 'Test Transaction',
      }

      expect(() => transactionSchema.parse(validData)).not.toThrow()
    })

    it('should reject invalid UUID for accountId', () => {
      const invalidData = {
        plaidTransactionId: 'txn-123',
        accountId: 'invalid-uuid',
        amount: 25.50,
        type: 'DEBIT',
        status: 'POSTED',
        date: '2023-01-01T00:00:00Z',
        name: 'Test Transaction',
      }

      expect(() => transactionSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid type', () => {
      const invalidData = {
        plaidTransactionId: 'txn-123',
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 25.50,
        type: 'INVALID',
        status: 'POSTED',
        date: '2023-01-01T00:00:00Z',
        name: 'Test Transaction',
      }

      expect(() => transactionSchema.parse(invalidData)).toThrow()
    })

    it('should reject invalid status', () => {
      const invalidData = {
        plaidTransactionId: 'txn-123',
        accountId: '123e4567-e89b-12d3-a456-426614174000',
        amount: 25.50,
        type: 'DEBIT',
        status: 'INVALID',
        date: '2023-01-01T00:00:00Z',
        name: 'Test Transaction',
      }

      expect(() => transactionSchema.parse(invalidData)).toThrow()
    })
  })
})
