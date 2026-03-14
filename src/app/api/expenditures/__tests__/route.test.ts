import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => {
  const mockTx = {
    expenditure: { create: jest.fn().mockResolvedValue({ id: 'exp-1' }) },
    accountTransaction: { create: jest.fn().mockResolvedValue({}) },
    account: { update: jest.fn().mockResolvedValue({}) },
  }
  return {
    prisma: {
      expenditure: { findMany: jest.fn(), count: jest.fn() },
      account: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockTx)),
    },
  }
})

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/expenditures', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns expenditures with pagination', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([
        { id: 'exp-1', title: 'Coffee', userId: 'user-1' },
      ] as any)
      mockPrisma.expenditure.count.mockResolvedValue(1)

      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.pagination).toEqual(
        expect.objectContaining({ page: 1, limit: 20, total: 1 })
      )
      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 20 })
      )
    })

    it('applies title and categoryId filters', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([])
      mockPrisma.expenditure.count.mockResolvedValue(0)

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({
            title: 'Food',
            categoryId: 'cat-1',
          }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            title: { contains: 'Food' },
            categoryId: 'cat-1',
          }),
        })
      )
    })

    it('applies from and to date filters', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([])
      mockPrisma.expenditure.count.mockResolvedValue(0)

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({
            from: '2024-01-01',
            to: '2024-01-31',
          }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            createdAt: expect.objectContaining({
              gte: new Date('2024-01-01'),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as unknown as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.expenditure.findMany.mockRejectedValue(new Error('db error'))
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch expenditures')
    })
  })

  describe('POST', () => {
    it('creates expenditure successfully', async () => {
      mockPrisma.account.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'acc-1' } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Lunch',
          amount: 15,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('exp-1')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('uses body accountId when valid for user', async () => {
      const accountId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
      mockPrisma.account.findFirst.mockResolvedValueOnce({ id: accountId } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Lunch',
          amount: 15,
          categoryId: 'cat-1',
          accountId,
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId: 'user-1' },
        select: { id: true },
      })
    })

    it('returns 500 on validation error', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          title: '',
          amount: -1,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create expenditure')
    })
  })
})
