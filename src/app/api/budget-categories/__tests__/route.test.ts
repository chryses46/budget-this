import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    budgetCategory: { findMany: jest.fn(), create: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/budget-categories', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns categories for authenticated user', async () => {
      const categories = [{ id: 'cat-1', title: 'Food', userId: 'user-1' }]
      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories as any)

      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(categories)
      expect(mockPrisma.budgetCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })

    it('filters expenditures by current month when currentMonthOnly=true', async () => {
      const categories = [{ id: 'cat-1', title: 'Food', userId: 'user-1' }]
      mockPrisma.budgetCategory.findMany.mockResolvedValue(categories as any)

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({ currentMonthOnly: 'true' }),
        },
      } as unknown as NextRequest

      const res = await GET(req)
      expect(res.status).toBe(200)
      const call = mockPrisma.budgetCategory.findMany.mock.calls[0][0]
      expect(call.include.expenditures.where).toBeDefined()
      expect(call.include.expenditures.where.createdAt).toEqual(
        expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) })
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
      mockPrisma.budgetCategory.findMany.mockRejectedValue(new Error('db error'))
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch budget categories')
    })
  })

  describe('POST', () => {
    it('creates category successfully', async () => {
      mockPrisma.budgetCategory.create.mockResolvedValue({
        id: 'cat-1',
        title: 'Food',
        limit: 500,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ title: 'Food', limit: 500 }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('Food')
      expect(mockPrisma.budgetCategory.create).toHaveBeenCalled()
    })

    it('returns 500 on validation error', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ title: '' }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create budget category')
    })
  })
})
