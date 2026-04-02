import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { expenditureSchema } from '@/lib/validations'
import { prisma, type TransactionClient } from '@/lib/prisma'
import { decryptQueryResult } from '@/lib/prisma-encryption-middleware'
import { requireApiAuth } from '@/lib/api-auth'
import { roundUpSpareCents } from '@/lib/roundup'

type ExpenditureWhere = {
  userId: string
  title?: { contains: string }
  categoryId?: string
  createdAt?: { gte?: Date; lte?: Date }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth
    const { searchParams } = request.nextUrl
    const title = searchParams.get('title')?.trim() || undefined
    const from = searchParams.get('from')?.trim()
    const to = searchParams.get('to')?.trim()
    const categoryId = searchParams.get('categoryId')?.trim() || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: ExpenditureWhere = { userId }
    if (title) {
      where.title = { contains: title }
    }
    if (categoryId) {
      where.categoryId = categoryId
    }
    if (from || to) {
      where.createdAt = {}
      if (from) {
        const fromDate = new Date(from)
        if (!Number.isNaN(fromDate.getTime())) where.createdAt.gte = fromDate
      }
      if (to) {
        const toDate = new Date(to)
        if (!Number.isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999)
          where.createdAt.lte = toDate
        }
      }
    }

    const [expenditures, total] = await Promise.all([
      prisma.expenditure.findMany({
        where,
        include: {
          category: {
            select: { title: true }
          },
          account: {
            select: { id: true, name: true, type: true, balance: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.expenditure.count({ where })
    ])

    decryptQueryResult(expenditures)
    return NextResponse.json({
      data: expenditures,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch expenditures' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await request.json()
    const parsed = expenditureSchema.parse(body)
    const { title, amount, categoryId, accountId: bodyAccountId, createdAt: createdAtInput } = parsed

    const createdAt =
      createdAtInput && !Number.isNaN(new Date(createdAtInput).getTime())
        ? new Date(createdAtInput)
        : undefined

    // Resolve effective account: body accountId (if valid for user) else primary account
    let effectiveAccount: { id: string } | null = null
    if (bodyAccountId) {
      const account = await prisma.account.findFirst({
        where: { id: bodyAccountId, userId },
        select: { id: true }
      })
      if (account) effectiveAccount = account
    }
    if (!effectiveAccount) {
      const primary = await prisma.account.findFirst({
        where: { userId, isMain: true },
        select: { id: true }
      })
      effectiveAccount = primary
    }

    const spare = roundUpSpareCents(amount)

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { roundupSavingsAccountId: true }
      })

      let effFull: {
        id: string
        balance: number
        roundUpOnExpenditure: boolean
      } | null = null

      if (effectiveAccount) {
        const row = await tx.account.findFirst({
          where: { id: effectiveAccount.id, userId },
          select: { id: true, balance: true, roundUpOnExpenditure: true }
        })
        if (!row) {
          throw Object.assign(new Error('Account not found'), { code: 'BAD_ACCOUNT' })
        }
        effFull = row
        if (effFull.balance < amount) {
          throw Object.assign(new Error('Insufficient funds'), { code: 'INSUFFICIENT' })
        }
      }

      const expenditure = await tx.expenditure.create({
        data: {
          title,
          amount,
          categoryId,
          userId,
          accountId: effFull?.id ?? null,
          ...(createdAt && { createdAt })
        }
      })

      if (effFull) {
        await tx.accountTransaction.create({
          data: {
            accountId: effFull.id,
            type: 'withdrawal',
            amount,
            description: `Expenditure: ${title}`,
            userId
          }
        })
        await tx.account.update({
          where: { id: effFull.id },
          data: { balance: { decrement: amount } }
        })
      }

      const canRoundUp =
        effFull?.roundUpOnExpenditure &&
        !!user?.roundupSavingsAccountId &&
        spare > 1e-6

      if (canRoundUp) {
        const savingsRow = await tx.account.findFirst({
          where: { id: user!.roundupSavingsAccountId!, userId },
          select: { id: true }
        })
        if (savingsRow) {
          const designatedSource = await tx.account.findFirst({
            where: { userId, doesRoundupSave: true },
            select: { id: true }
          })
          const sourceId = designatedSource?.id ?? effFull!.id

          let sourceAcc = await tx.account.findUnique({
            where: { id: sourceId },
            select: { id: true, balance: true }
          })
          let destAcc = await tx.account.findUnique({
            where: { id: savingsRow.id },
            select: { id: true, balance: true }
          })

          if (!sourceAcc || !destAcc) {
            throw Object.assign(new Error('Round-up account resolution failed'), { code: 'ROUNDUP' })
          }

          const rdesc = `Round-up (expenditure): ${title}`

          if (sourceAcc.id === destAcc.id) {
            if (sourceAcc.balance < spare) {
              throw Object.assign(new Error('Insufficient funds for round-up'), { code: 'INSUFFICIENT' })
            }
            await tx.accountTransaction.create({
              data: {
                accountId: sourceAcc.id,
                type: 'withdrawal',
                amount: spare,
                description: rdesc,
                userId
              }
            })
            await tx.account.update({
              where: { id: sourceAcc.id },
              data: { balance: { decrement: spare } }
            })
          } else {
            if (sourceAcc.balance < spare) {
              throw Object.assign(new Error('Insufficient funds for round-up'), { code: 'INSUFFICIENT' })
            }
            await tx.accountTransaction.create({
              data: {
                accountId: sourceAcc.id,
                type: 'withdrawal',
                amount: spare,
                description: rdesc,
                userId,
                counterpartyAccountId: destAcc.id
              }
            })
            await tx.accountTransaction.create({
              data: {
                accountId: destAcc.id,
                type: 'deposit',
                amount: spare,
                description: rdesc,
                userId,
                counterpartyAccountId: sourceAcc.id
              }
            })
            await tx.account.update({
              where: { id: sourceAcc.id },
              data: { balance: { decrement: spare } }
            })
            await tx.account.update({
              where: { id: destAcc.id },
              data: { balance: { increment: spare } }
            })
          }
        }
      }

      return expenditure
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message =
        error.issues.map((issue) => issue.message).join('; ') || 'Validation failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code
      if (code === 'INSUFFICIENT') {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }
      if (code === 'BAD_ACCOUNT') {
        return NextResponse.json({ error: 'Account not found' }, { status: 400 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to create expenditure' },
      { status: 500 }
    )
  }
}
