import { NextRequest } from 'next/server'
import { POST } from '../route'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>

describe('/api/plaid/link', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  it('returns coming soon message when authenticated', async () => {
    const req = {} as NextRequest
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Plaid integration coming soon')
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const req = {} as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 500 when requireApiAuth throws', async () => {
    mockRequireApiAuth.mockRejectedValue(new Error('auth error'))
    const req = {} as NextRequest
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to create Plaid link token')
  })
})
