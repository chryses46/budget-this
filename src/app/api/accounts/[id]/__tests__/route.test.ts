import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'acc-1' })

describe('/api/accounts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  describe('PUT', () => {
    it('updates account successfully', async () => {
      mockPrisma.account.update.mockResolvedValue({
        id: 'acc-1',
        name: 'Updated',
        userId: 'user-1',
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({
          name: 'Updated',
          type: 'depository',
        }),
      } as unknown as NextRequest

      const res = await PUT(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toBe('Updated')
      expect(mockPrisma.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc-1', userId: 'user-1' },
          data: expect.objectContaining({ name: 'Updated' }),
        })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const req = { json: jest.fn().mockResolvedValue({ name: 'X' }) } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockPrisma.account.update.mockRejectedValue(new Error('db error'))
      const req = {
        json: jest.fn().mockResolvedValue({ name: 'X', type: 'depository' }),
      } as unknown as NextRequest
      const res = await PUT(req, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to update account')
    })
  })

  describe('DELETE', () => {
    it('deletes account successfully', async () => {
      mockPrisma.account.delete.mockResolvedValue({} as any)

      const req = {} as NextRequest
      const res = await DELETE(req, { params: params() })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Account deleted successfully')
      expect(mockPrisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'acc-1', userId: 'user-1' },
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
      mockPrisma.account.delete.mockRejectedValue(new Error('db error'))
      const res = await DELETE({} as NextRequest, { params: params() })
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to delete account')
    })
  })
})
