import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bill: { findMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockTxStub)),
  },
}))

const mockTxStub = {
  bill: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  accountTransaction: { create: jest.fn().mockResolvedValue({}) },
  account: { update: jest.fn().mockResolvedValue({}) },
}

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/bills/process-autopay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
    ;(mockPrisma.$transaction as jest.Mock).mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockTxStub))
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const res = await POST({} as NextRequest)
    expect(res.status).toBe(401)
  })

  it('processes due autopay bills and creates account transaction and decrements balance', async () => {
    const dueBill = {
      id: 'bill-1',
      userId: 'user-1',
      title: 'Streaming',
      amount: 15,
      frequency: 'Monthly',
      dayDue: 1,
      isAutopay: true,
      isPaid: false,
      accountId: 'a1b2c3d4-e5f6-4789-a012-345678901234',
      createdAt: new Date('2025-01-01'),
    }
    mockPrisma.bill.findMany.mockResolvedValue([dueBill] as any)

    const res = await POST({} as NextRequest)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.message).toBe('Autopay processing completed')
    expect(data.processed).toBe(1)
    expect(data.billIds).toEqual(['bill-1'])
    expect(mockPrisma.bill.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isAutopay: true, isPaid: false },
    })
    expect(mockTxStub.bill.updateMany).toHaveBeenCalledWith({
      where: { id: 'bill-1', isPaid: false },
      data: { isPaid: true, paidAt: expect.any(Date) },
    })
    expect(mockTxStub.accountTransaction.create).toHaveBeenCalledWith({
      data: {
        accountId: 'a1b2c3d4-e5f6-4789-a012-345678901234',
        type: 'withdrawal',
        amount: 15,
        description: 'Bill Payment: Streaming',
        userId: 'user-1',
      },
    })
    expect(mockTxStub.account.update).toHaveBeenCalledWith({
      where: { id: 'a1b2c3d4-e5f6-4789-a012-345678901234' },
      data: { balance: { decrement: 15 } },
    })
  })

  it('updates bill as paid but does not create transaction when bill has no accountId', async () => {
    const dueBillNoAccount = {
      id: 'bill-2',
      userId: 'user-1',
      title: 'Misc',
      amount: 10,
      frequency: 'Monthly',
      dayDue: 1,
      isAutopay: true,
      isPaid: false,
      accountId: null,
      createdAt: new Date('2025-01-01'),
    }
    mockPrisma.bill.findMany.mockResolvedValue([dueBillNoAccount] as any)

    const res = await POST({} as NextRequest)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.processed).toBe(1)
    expect(mockTxStub.bill.updateMany).toHaveBeenCalled()
    expect(mockTxStub.accountTransaction.create).not.toHaveBeenCalled()
    expect(mockTxStub.account.update).not.toHaveBeenCalled()
  })

  it('does not create transaction or decrement when bill was already paid by another request', async () => {
    const dueBill = {
      id: 'bill-1',
      userId: 'user-1',
      title: 'Streaming',
      amount: 15,
      frequency: 'Monthly',
      dayDue: 1,
      isAutopay: true,
      isPaid: false,
      accountId: 'a1b2c3d4-e5f6-4789-a012-345678901234',
      createdAt: new Date('2025-01-01'),
    }
    mockPrisma.bill.findMany.mockResolvedValue([dueBill] as any)
    mockTxStub.bill.updateMany.mockResolvedValueOnce({ count: 0 })

    const res = await POST({} as NextRequest)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.processed).toBe(0)
    expect(data.billIds).toEqual([])
    expect(mockTxStub.accountTransaction.create).not.toHaveBeenCalled()
    expect(mockTxStub.account.update).not.toHaveBeenCalled()
  })

  it('returns 500 when prisma throws', async () => {
    mockPrisma.bill.findMany.mockRejectedValue(new Error('db error'))
    const res = await POST({} as NextRequest)
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error).toBe('Failed to process autopay bills')
  })
})
