import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { updateMany: jest.fn() },
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/bills/reset-monthly', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  it('resets paid bills and returns count', async () => {
    mockPrisma.bill.updateMany.mockResolvedValue({ count: 3 } as any)

    const res = await POST({} as NextRequest)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Monthly bill reset completed')
    expect(data.billsReset).toBe(3)
    expect(mockPrisma.bill.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isPaid: true },
      data: { isPaid: false, paidAt: null },
    })
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const res = await POST({} as NextRequest)
    expect(res.status).toBe(401)
  })

  it('returns 500 when prisma throws', async () => {
    mockPrisma.bill.updateMany.mockRejectedValue(new Error('db error'))
    const res = await POST({} as NextRequest)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to reset monthly bills')
  })
})
