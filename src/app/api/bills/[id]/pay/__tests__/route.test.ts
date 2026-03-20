import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
      const tx = {
        bill: { update: jest.fn().mockResolvedValue({ id: 'bill-1', isPaid: true }) },
        accountTransaction: { create: jest.fn().mockResolvedValue({}) },
        account: { update: jest.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    }),
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const params = () => Promise.resolve({ id: 'bill-1' })

describe('/api/bills/[id]/pay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  it('returns 400 when bill has no accountId', async () => {
    mockPrisma.bill.findFirst.mockResolvedValue({
      id: 'bill-1',
      userId: 'user-1',
      amount: 100,
      title: 'Rent',
      isPaid: false,
      accountId: null,
    } as any)

    const res = await POST({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Assign an account to this bill before paying.')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('marks bill as paid successfully and creates account transaction when bill has accountId', async () => {
    const mockTx = {
      bill: { update: jest.fn().mockResolvedValue({ id: 'bill-1', isPaid: true }) },
      accountTransaction: { create: jest.fn().mockResolvedValue({}) },
      account: { update: jest.fn().mockResolvedValue({}) },
    }
    ;(mockPrisma.$transaction as jest.Mock).mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockTx))
    mockPrisma.bill.findFirst.mockResolvedValue({
      id: 'bill-1',
      userId: 'user-1',
      amount: 50,
      title: 'Sub',
      isPaid: false,
      accountId: 'acc-1',
    } as any)

    const res = await POST({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Bill paid successfully')
    expect(data.bill).toBeDefined()
    expect(mockTx.accountTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 'acc-1',
        type: 'withdrawal',
        amount: 50,
        description: 'Bill Payment: Sub',
      }),
    })
    expect(mockTx.account.update).toHaveBeenCalledWith({
      where: { id: 'acc-1' },
      data: { balance: { decrement: 50 } },
    })
  })

  it('returns 404 when bill not found', async () => {
    mockPrisma.bill.findFirst.mockResolvedValue(null)

    const res = await POST({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toBe('Bill not found')
  })

  it('returns 400 when bill already paid', async () => {
    mockPrisma.bill.findFirst.mockResolvedValue({
      id: 'bill-1',
      userId: 'user-1',
      isPaid: true,
    } as any)

    const res = await POST({} as NextRequest, { params: params() })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toBe('Bill is already paid')
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const res = await POST({} as NextRequest, { params: params() })
    expect(res.status).toBe(401)
  })

  it('returns 500 when prisma throws', async () => {
    mockPrisma.bill.findFirst.mockRejectedValue(new Error('db error'))
    const res = await POST({} as NextRequest, { params: params() })
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to pay bill')
  })
})
