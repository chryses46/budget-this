import { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: { findUnique: jest.fn(), delete: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'key-1' })

describe('/api/api-keys/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  it('deletes api key when owner', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      userId: 'user-1',
    } as any)
    mockPrisma.apiKey.delete.mockResolvedValue({} as any)

    const res = await DELETE({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } })
  })

  it('returns 404 when key not found', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null)

    const res = await DELETE({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('API key not found')
    expect(mockPrisma.apiKey.delete).not.toHaveBeenCalled()
  })

  it('returns 404 when key belongs to another user', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      userId: 'other-user',
    } as any)

    const res = await DELETE({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('API key not found')
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const res = await DELETE({} as NextRequest, { params: params() })
    expect(res.status).toBe(401)
  })

  it('returns 500 when prisma throws', async () => {
    mockPrisma.apiKey.findUnique.mockRejectedValue(new Error('db error'))
    const res = await DELETE({} as NextRequest, { params: params() })
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to revoke API key')
  })
})
