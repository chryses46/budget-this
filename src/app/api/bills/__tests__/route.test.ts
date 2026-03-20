import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { findMany: jest.fn(), create: jest.fn() },
    account: { findFirst: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/bills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns bills for authenticated user', async () => {
      const bills = [{ id: 'bill-1', title: 'Rent', userId: 'user-1' }]
      mockPrisma.bill.findMany.mockResolvedValue(bills as any)

      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(bills)
      expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })

    it('applies search and frequency filters', async () => {
      mockPrisma.bill.findMany.mockResolvedValue([])

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({ search: 'Rent', type: 'Monthly' }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            title: { contains: 'Rent' },
            frequency: 'Monthly',
          }),
        })
      )
    })

    it('applies isAutopay filter when isAutopay=true', async () => {
      mockPrisma.bill.findMany.mockResolvedValue([])

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({ isAutopay: 'true' }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.bill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isAutopay: true,
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
      mockPrisma.bill.findMany.mockRejectedValue(new Error('db error'))
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch bills')
    })
  })

  describe('POST', () => {
    it('creates bill successfully with default account when accountId not provided', async () => {
      const mainAccId = '00000000-0000-4000-8000-000000000001'
      mockPrisma.account.findFirst.mockResolvedValue({ id: mainAccId } as any)
      mockPrisma.bill.create.mockResolvedValue({
        id: 'bill-1',
        title: 'Rent',
        amount: 1000,
        dayDue: 1,
        frequency: 'Monthly',
        userId: 'user-1',
        accountId: mainAccId,
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Rent',
          amount: 1000,
          dayDue: 1,
          frequency: 'Monthly',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.title).toBe('Rent')
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', isMain: true },
        select: { id: true },
      })
      expect(mockPrisma.bill.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Rent',
          amount: 1000,
          dayDue: 1,
          frequency: 'Monthly',
          accountId: mainAccId,
          userId: 'user-1',
        }),
      })
    })

    it('creates bill with provided accountId when user owns account', async () => {
      const accountId = 'a1b2c3d4-e5f6-4789-a012-345678901234'
      mockPrisma.account.findFirst.mockResolvedValue({ id: accountId } as any)
      mockPrisma.bill.create.mockResolvedValue({
        id: 'bill-1',
        title: 'Rent',
        amount: 1000,
        dayDue: 1,
        frequency: 'Monthly',
        userId: 'user-1',
        accountId,
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Rent',
          amount: 1000,
          dayDue: 1,
          frequency: 'Monthly',
          accountId,
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(200)
      expect(mockPrisma.bill.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountId,
        }),
      })
    })

    it('returns 500 on validation error', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ title: '', amount: -1 }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create bill')
    })
  })
})
