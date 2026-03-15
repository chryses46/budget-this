import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: { findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns transactions for authenticated user', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([
        { id: 'tx-1', userId: 'user-1', amount: 100 },
      ] as any)
      mockPrisma.transaction.count.mockResolvedValue(1)

      const req = {
        url: 'http://localhost:3000/api/transactions',
      } as unknown as NextRequest

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.transactions).toHaveLength(1)
      expect(data.totalCount).toBe(1)
      expect(data.hasMore).toBe(false)
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })

    it('applies accountId and date filters', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([])
      mockPrisma.transaction.count.mockResolvedValue(0)

      const req = {
        url: 'http://localhost:3000/api/transactions?accountId=acc-1&startDate=2025-01-01&endDate=2025-01-31',
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            accountId: 'acc-1',
            date: expect.any(Object),
          }),
        })
      )
    })

    it('applies only startDate when endDate missing', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([])
      mockPrisma.transaction.count.mockResolvedValue(0)

      const req = {
        url: 'http://localhost:3000/api/transactions?startDate=2025-01-01',
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: { gte: new Date('2025-01-01') },
          }),
        })
      )
    })

    it('applies only endDate when startDate missing', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([])
      mockPrisma.transaction.count.mockResolvedValue(0)

      const req = {
        url: 'http://localhost:3000/api/transactions?endDate=2025-01-31',
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: { lte: expect.any(Date) },
          }),
        })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = { url: 'http://localhost:3000/api/transactions' } as unknown as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.transaction.findMany.mockRejectedValue(new Error('db error'))
      const req = { url: 'http://localhost:3000/api/transactions' } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch transactions')
    })
  })

  describe('POST', () => {
    it('creates transaction successfully', async () => {
      mockPrisma.transaction.create.mockResolvedValue({
        id: 'tx-1',
        plaidTransactionId: 'pid-1',
        accountId: 'acc-1',
        userId: 'user-1',
        amount: 50,
        date: new Date(),
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          plaidTransactionId: 'pid-1',
          accountId: 'acc-1',
          amount: 50,
          type: 'debit',
          status: 'posted',
          date: '2025-01-15',
          name: 'Test',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('tx-1')
      expect(mockPrisma.transaction.create).toHaveBeenCalled()
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = { json: jest.fn().mockResolvedValue({}) } as unknown as NextRequest
      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.transaction.create.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({
          accountId: 'acc-1',
          amount: 10,
          date: '2025-01-01',
          name: 'X',
        }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create transaction')
    })
  })
})
