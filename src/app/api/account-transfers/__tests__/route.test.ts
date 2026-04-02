import { NextRequest } from 'next/server'
import { POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/account-transfers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
  })

  it('creates paired transfer_out and transfer_in and updates balances', async () => {
    const fromId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
    const toId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef'

    mockPrisma.account.findFirst
      .mockResolvedValueOnce({ id: fromId, balance: 200, userId: 'user-1' } as never)
      .mockResolvedValueOnce({ id: toId, balance: 50, userId: 'user-1' } as never)

    const accountTransactionCreate = jest.fn().mockResolvedValue({})
    const accountUpdate = jest.fn().mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        accountTransaction: { create: accountTransactionCreate },
        account: { update: accountUpdate },
      })
    )

    const req = {
      json: jest.fn().mockResolvedValue({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: 25,
        description: 'Move cash',
      }),
    } as unknown as NextRequest

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.transferPairId).toBeDefined()
    expect(accountTransactionCreate).toHaveBeenCalledTimes(2)
    expect(accountTransactionCreate.mock.calls[0][0].data.type).toBe('transfer_out')
    expect(accountTransactionCreate.mock.calls[1][0].data.type).toBe('transfer_in')
    expect(accountUpdate).toHaveBeenCalledTimes(2)
  })

  it('returns 400 when insufficient funds', async () => {
    const fromId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
    const toId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef'

    mockPrisma.account.findFirst
      .mockResolvedValueOnce({ id: fromId, balance: 10, userId: 'user-1' } as never)
      .mockResolvedValueOnce({ id: toId, balance: 0, userId: 'user-1' } as never)

    const req = {
      json: jest.fn().mockResolvedValue({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: 25,
      }),
    } as unknown as NextRequest

    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error).toBe('Insufficient funds')
  })

  it('returns 404 when an account is missing', async () => {
    const fromId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
    const toId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef'

    mockPrisma.account.findFirst.mockResolvedValueOnce({ id: fromId, balance: 100 } as never).mockResolvedValueOnce(null)

    const req = {
      json: jest.fn().mockResolvedValue({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: 5,
      }),
    } as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 401 when not authenticated', async () => {
    mockRequireApiAuth.mockResolvedValue(
      NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    )
    const req = {
      json: jest.fn().mockResolvedValue({
        fromAccountId: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
        toAccountId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef',
        amount: 1,
      }),
    } as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
