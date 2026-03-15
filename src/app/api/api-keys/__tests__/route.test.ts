import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/field-encryption', () => ({
  hashForLookup: jest.fn((s: string) => 'hash-' + s),
  encrypt: jest.fn((s: string) => 'encrypted-' + s),
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: { findMany: jest.fn(), create: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const getServerSession = jest.requireMock('next-auth').getServerSession as jest.Mock
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/api-keys', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns api keys for authenticated user', async () => {
      mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'key-1', name: 'Test', createdAt: new Date(), lastUsedAt: null },
      ] as any)

      const req = {} as NextRequest
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })

    it('returns 401 when not authenticated', async () => {
      mockRequireApiAuth.mockResolvedValue(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
      const res = await GET({} as NextRequest)
      expect(res.status).toBe(401)
    })

    it('returns 500 when prisma throws', async () => {
      mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
      mockPrisma.apiKey.findMany.mockRejectedValue(new Error('db error'))
      const res = await GET({} as NextRequest)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to list API keys')
    })
  })

  describe('POST', () => {
    it('creates api key when session exists', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-1',
        name: 'My Key',
        keyHash: 'hash-x',
        keyEncrypted: 'enc-x',
        createdAt: new Date(),
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ name: 'My Key' }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('key-1')
      expect(data.name).toBe('My Key')
      expect(data.key).toBeDefined()
      expect(mockPrisma.apiKey.create).toHaveBeenCalled()
    })

    it('creates api key with null name when body name is whitespace', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'key-2',
        name: null,
        keyHash: 'hash-y',
        keyEncrypted: 'enc-y',
        createdAt: new Date(),
      } as any)

      const req = {
        json: jest.fn().mockResolvedValue({ name: '   ' }),
      } as unknown as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: null }) })
      )
    })

    it('returns 401 when no session', async () => {
      getServerSession.mockResolvedValue(null)
      const req = { json: jest.fn().mockResolvedValue({}) } as unknown as NextRequest
      const res = await POST(req)
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Authentication required' })
    })

    it('returns 500 when prisma throws', async () => {
      getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
      mockPrisma.apiKey.create.mockRejectedValue(new Error('db error'))
      const req = { json: jest.fn().mockResolvedValue({}) } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to create API key')
    })
  })
})
