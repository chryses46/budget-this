import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => {
  const mockTx = {
    accountTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
    account: { update: jest.fn().mockResolvedValue({}) },
  }
  return {
    prisma: {
      accountTransaction: { findMany: jest.fn(), create: jest.fn() },
      account: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockTx)),
    },
  }
})

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'acc-1' })

describe('/api/accounts/[id]/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns transactions for account', async () => {
      const transactions = [{ id: 'tx-1', accountId: 'acc-1', amount: 100 }]
      mockPrisma.accountTransaction.findMany.mockResolvedValue(transactions as any)

      const req = {} as NextRequest
      const res = await GET(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(transactions)
      expect(mockPrisma.accountTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId: 'acc-1', userId: 'user-1' },
        })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const res = await GET({} as NextRequest, { params: params() })
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.accountTransaction.findMany.mockRejectedValue(new Error('db error'))
      const res = await GET({} as NextRequest, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch account transactions')
    })
  })

  describe('POST', () => {
    it('creates deposit transaction and updates balance', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acc-1',
        balance: 100,
        userId: 'user-1',
      } as any)
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          accountTransaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          account: { update: jest.fn().mockResolvedValue({}) },
        }
        return fn(tx)
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          type: 'deposit',
          amount: 50,
          description: 'Test deposit',
        }),
      } as unknown as NextRequest

      const res = await POST(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('tx-1')
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
      })
    })

    it('returns 404 when account not found', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null)

      const req = {
        json: jest.fn().mockResolvedValue({
          type: 'deposit',
          amount: 50,
          description: 'Test',
        }),
      } as unknown as NextRequest

      const res = await POST(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Account not found')
    })

    it('returns 400 when insufficient funds', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acc-1',
        balance: 10,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          type: 'withdrawal',
          amount: 100,
          description: 'Test',
        }),
      } as unknown as NextRequest

      const res = await POST(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Insufficient funds')
    })

    it('returns 400 when body fails validation', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          type: 'invalid',
          amount: -5,
          description: '',
        }),
      } as unknown as NextRequest

      const res = await POST(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBeDefined()
      expect(mockPrisma.account.findFirst).not.toHaveBeenCalled()
    })

    it('returns 500 on server error', async () => {
      mockPrisma.account.findFirst.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({
          type: 'deposit',
          amount: 10,
          description: 'Test',
        }),
      } as unknown as NextRequest
      const res = await POST(req, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create account transaction')
    })
  })
})
