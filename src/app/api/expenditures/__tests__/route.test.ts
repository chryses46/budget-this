import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

jest.mock('@/lib/api-auth', () => ({ requireApiAuth: jest.fn() }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenditure: { findMany: jest.fn(), count: jest.fn() },
    account: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const mockRequireApiAuth = requireApiAuth as jest.MockedFunction<typeof requireApiAuth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

function buildTxMock(opts: {
  userRoundup?: string | null
  eff: { id: string; balance: number; roundUpOnExpenditure: boolean }
  accountFindFirst?: jest.Mock
  accountFindUnique?: jest.Mock
}) {
  const accountTransactionCreate = jest.fn().mockResolvedValue({})
  const expenditureCreate = jest.fn().mockResolvedValue({ id: 'exp-1' })
  const accountUpdate = jest.fn().mockResolvedValue({})
  const userFindUnique = jest
    .fn()
    .mockResolvedValue({ roundupSavingsAccountId: opts.userRoundup ?? null })

  const accountFindFirst =
    opts.accountFindFirst ??
    jest.fn().mockResolvedValue(opts.eff)

  const accountFindUnique =
    opts.accountFindUnique ??
    jest.fn().mockImplementation(async (args: { where: { id: string } }) => ({
      id: args.where.id,
      balance: 500,
    }))

  const mockTx = {
    user: { findUnique: userFindUnique },
    expenditure: { create: expenditureCreate },
    accountTransaction: { create: accountTransactionCreate },
    account: {
      findFirst: accountFindFirst,
      findUnique: accountFindUnique,
      update: accountUpdate,
    },
  }

  return { mockTx, accountTransactionCreate }
}

describe('/api/expenditures', () => {
  beforeEach(() => {
    mockRequireApiAuth.mockReset()
    mockRequireApiAuth.mockResolvedValue({ userId: 'user-1' })
    mockPrisma.expenditure.findMany.mockReset()
    mockPrisma.expenditure.count.mockReset()
    mockPrisma.account.findFirst.mockReset()
    mockPrisma.$transaction.mockReset()
    mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
      const { mockTx } = buildTxMock({
        eff: { id: 'acc-1', balance: 1000, roundUpOnExpenditure: false },
      })
      return fn(mockTx)
    })
  })

  describe('GET', () => {
    it('returns expenditures with pagination', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([
        { id: 'exp-1', title: 'Coffee', userId: 'user-1' },
      ] as never)
      mockPrisma.expenditure.count.mockResolvedValue(1)

      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.pagination).toEqual(
        expect.objectContaining({ page: 1, limit: 20, total: 1 })
      )
      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' }, skip: 0, take: 20 })
      )
    })

    it('applies title and categoryId filters', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([])
      mockPrisma.expenditure.count.mockResolvedValue(0)

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({
            title: 'Food',
            categoryId: 'cat-1',
          }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            title: { contains: 'Food' },
            categoryId: 'cat-1',
          }),
        })
      )
    })

    it('applies from and to date filters', async () => {
      mockPrisma.expenditure.findMany.mockResolvedValue([])
      mockPrisma.expenditure.count.mockResolvedValue(0)

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({
            from: '2024-01-01',
            to: '2024-01-31',
          }),
        },
      } as unknown as NextRequest

      await GET(req)

      expect(mockPrisma.expenditure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            createdAt: expect.objectContaining({
              gte: new Date('2024-01-01'),
              lte: expect.any(Date),
            }),
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
      mockPrisma.expenditure.findMany.mockRejectedValue(new Error('db error'))
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as unknown as NextRequest
      const res = await GET(req)
      const data = await res.json()
      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch expenditures')
    })
  })

  describe('POST', () => {
    it('creates expenditure successfully', async () => {
      let accountTransactionCreate: jest.Mock = jest.fn()
      // No accountId in body → first findFirst is primary account lookup
      mockPrisma.account.findFirst.mockResolvedValueOnce({ id: 'acc-1' } as never)

      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
        const built = buildTxMock({
          eff: { id: 'acc-1', balance: 1000, roundUpOnExpenditure: false },
        })
        accountTransactionCreate = built.accountTransactionCreate
        return fn(built.mockTx)
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Lunch',
          amount: 15,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('exp-1')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(accountTransactionCreate).toHaveBeenCalledTimes(1)
    })

    it('uses body accountId when valid for user', async () => {
      const accountId = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'
      mockPrisma.account.findFirst.mockResolvedValueOnce({ id: accountId } as never)

      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
        const built = buildTxMock({
          eff: { id: accountId, balance: 1000, roundUpOnExpenditure: false },
        })
        return fn(built.mockTx)
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Lunch',
          amount: 15,
          categoryId: 'cat-1',
          accountId,
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId: 'user-1' },
        select: { id: true },
      })
    })

    it('returns 400 on validation error', async () => {
      const req = {
        json: jest.fn().mockResolvedValue({
          title: '',
          amount: -1,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest
      const res = await POST(req)
      const data = await res.json()
      expect(res.status).toBe(400)
      expect(data.error).toBeDefined()
    })

    it('creates round-up deposit and extra withdrawal when configured', async () => {
      const savingsId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef'
      mockPrisma.account.findFirst.mockResolvedValueOnce({ id: 'acc-1' } as never)

      const findFirst = jest
        .fn()
        .mockResolvedValueOnce({
          id: 'acc-1',
          balance: 100,
          roundUpOnExpenditure: true,
        })
        .mockResolvedValueOnce({ id: savingsId })
        .mockResolvedValueOnce(null)

      const findUnique = jest
        .fn()
        .mockResolvedValueOnce({ id: 'acc-1', balance: 100 })
        .mockResolvedValueOnce({ id: savingsId, balance: 0 })

      let accountTransactionCreate: jest.Mock = jest.fn()
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
        const built = buildTxMock({
          userRoundup: savingsId,
          eff: { id: 'acc-1', balance: 100, roundUpOnExpenditure: true },
          accountFindFirst: findFirst,
          accountFindUnique: findUnique,
        })
        accountTransactionCreate = built.accountTransactionCreate
        return fn(built.mockTx)
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Coffee',
          amount: 3.45,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(accountTransactionCreate).toHaveBeenCalledTimes(3)
    })

    it('skips round-up when amount is already a whole dollar', async () => {
      const savingsId = 'b2c3d4e5-f6a7-4890-b123-456789abcdef'
      mockPrisma.account.findFirst.mockResolvedValueOnce({ id: 'acc-1' } as never)

      let accountTransactionCreate: jest.Mock = jest.fn()
      mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
        const built = buildTxMock({
          userRoundup: savingsId,
          eff: { id: 'acc-1', balance: 100, roundUpOnExpenditure: true },
        })
        accountTransactionCreate = built.accountTransactionCreate
        return fn(built.mockTx)
      })

      const req = {
        json: jest.fn().mockResolvedValue({
          title: 'Coffee',
          amount: 5,
          categoryId: 'cat-1',
        }),
      } as unknown as NextRequest

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(accountTransactionCreate).toHaveBeenCalledTimes(1)
    })
  })
})
