import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    budgetCategory: { update: jest.fn(), delete: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'cat-1' })

describe('/api/budget-categories/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('PUT', () => {
    it('updates category successfully', async () => {
      mockPrisma.budgetCategory.update.mockResolvedValue({
        id: 'cat-1',
        title: 'Updated',
        limit: 600,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ title: 'Updated', limit: 600 }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('Updated')
      expect(mockPrisma.budgetCategory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cat-1', userId: 'user-1' },
        })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = { json: jest.fn().mockResolvedValue({}) } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.budgetCategory.update.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({ title: 'X' }),
      } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to update budget category')
    })
  })

  describe('DELETE', () => {
    it('deletes category successfully', async () => {
      mockPrisma.budgetCategory.delete.mockResolvedValue({} as any)

      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Budget category deleted successfully')
      expect(mockPrisma.budgetCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1' },
      })
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const res = await DELETE({} as NextRequest, { params: params() })
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.budgetCategory.delete.mockRejectedValue(new Error('db error'))
      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to delete budget category')
    })
  })
})
