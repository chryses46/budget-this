import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('GET', () => {
    it('returns accounts for authenticated user', async () => {
      const accounts = [{ id: 'acc-1', name: 'Checking', userId: 'user-1' }]
      mockPrisma.account.findMany.mockResolvedValue(accounts as any)

      const req = { headers: { get: () => null } } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toEqual(accounts)
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = {} as NextRequest
      const res = await GET(req)
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.account.findMany.mockRejectedValue(new Error('db error'))
      const req = {} as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch accounts')
    })
  })

  describe('POST', () => {
    it('creates account successfully', async () => {
      mockPrisma.account.create.mockResolvedValue({
        id: 'acc-1',
        name: 'Savings',
        type: 'depository',
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          name: 'Savings',
          type: 'depository',
          balance: 0,
          isMain: false,
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toBe('Savings')
      expect(mockPrisma.account.create).toHaveBeenCalled()
    })

    it('unsets other main accounts when isMain is true', async () => {
      mockPrisma.account.updateMany.mockResolvedValue({} as any)
      mockPrisma.account.create.mockResolvedValue({
        id: 'acc-1',
        name: 'Main',
        type: 'depository',
        isMain: true,
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          name: 'Main',
          type: 'depository',
          isMain: true,
        }),
      } as unknown as NextRequest

      await POST(req)

      expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isMain: true },
        data: { isMain: false },
      })
    })

    it('clears doesRoundupSave on other accounts when doesRoundupSave is true', async () => {
      mockPrisma.account.updateMany.mockResolvedValue({} as any)
      mockPrisma.account.create.mockResolvedValue({ id: 'acc-new' } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          name: 'Checking',
          type: 'checking',
          balance: 0,
          isMain: false,
          doesRoundupSave: true,
        }),
      } as unknown as NextRequest

      await POST(req)

      expect(mockPrisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { doesRoundupSave: false },
      })
      expect(mockPrisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ doesRoundupSave: true }),
        })
      )
    })

    it('returns 500 on validation error', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({ name: '', type: 'depository' }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create account')
    })
  })
})
