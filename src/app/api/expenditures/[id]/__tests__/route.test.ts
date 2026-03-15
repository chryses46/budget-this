import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenditure: { update: jest.fn(), delete: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'exp-1' })

describe('/api/expenditures/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('PUT', () => {
    it('updates expenditure successfully', async () => {
      mockPrisma.expenditure.update.mockResolvedValue({
        id: 'exp-1',
        title: 'Updated',
        amount: 25,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ title: 'Updated', amount: 25 }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('Updated')
      expect(mockPrisma.expenditure.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exp-1', userId: 'user-1' },
        })
      )
    })

    it('updates with createdAt date string', async () => {
      mockPrisma.expenditure.update.mockResolvedValue({
        id: 'exp-1',
        title: 'X',
        createdAt: new Date('2024-01-15'),
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'X',
          createdAt: '2024-01-15T00:00:00Z',
        }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      expect(res.status).toBe(200)
      expect(mockPrisma.expenditure.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'X',
            createdAt: expect.any(Date),
          }),
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
      mockPrisma.expenditure.update.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({ title: 'X' }),
      } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to update expenditure')
    })
  })

  describe('DELETE', () => {
    it('deletes expenditure successfully', async () => {
      mockPrisma.expenditure.delete.mockResolvedValue({} as any)

      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Expenditure deleted successfully')
      expect(mockPrisma.expenditure.delete).toHaveBeenCalledWith({
        where: { id: 'exp-1', userId: 'user-1' },
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
      mockPrisma.expenditure.delete.mockRejectedValue(new Error('db error'))
      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to delete expenditure')
    })
  })
})
