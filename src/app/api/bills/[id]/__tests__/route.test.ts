import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { update: jest.fn(), delete: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'bill-1' })

describe('/api/bills/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('PUT', () => {
    it('updates bill successfully', async () => {
      mockPrisma.bill.update.mockResolvedValue({
        id: 'bill-1',
        title: 'Updated Rent',
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ title: 'Updated Rent' }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('Updated Rent')
      expect(mockPrisma.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bill-1', userId: 'user-1' },
        })
      )
    })

    it('updates bill with multiple optional fields', async () => {
      mockPrisma.bill.update.mockResolvedValue({
        id: 'bill-1',
        amount: 200,
        dayDue: 20,
        frequency: 'Yearly',
        isAutopay: true,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          amount: 200,
          dayDue: 20,
          frequency: 'Yearly',
          budgetCategoryId: 'cat-1',
          isAutopay: true,
        }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      expect(res.status).toBe(200)
      expect(mockPrisma.bill.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 200,
            dayDue: 20,
            frequency: 'Yearly',
            budgetCategoryId: 'cat-1',
            isAutopay: true,
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
      mockPrisma.bill.update.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({ title: 'X' }),
      } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to update bill')
    })
  })

  describe('DELETE', () => {
    it('deletes bill successfully', async () => {
      mockPrisma.bill.delete.mockResolvedValue({} as any)

      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Bill deleted successfully')
      expect(mockPrisma.bill.delete).toHaveBeenCalledWith({
        where: { id: 'bill-1', userId: 'user-1' },
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
      mockPrisma.bill.delete.mockRejectedValue(new Error('db error'))
      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to delete bill')
    })
  })
})
