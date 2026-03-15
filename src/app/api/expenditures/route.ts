import { NextRequest, NextResponse } from 'next/server'
import { expenditureSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { decryptQueryResult } from '@/lib/prisma-encryption-middleware'
import { requireApiAuth } from '@/lib/api-auth'

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

    const where: Parameters<typeof prisma.expenditure.findMany>[0]['where'] = { userId }
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
  } catch (error) {
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

    const result = await prisma.$transaction(async (tx) => {
      const expenditure = await tx.expenditure.create({
        data: {
          title,
          amount,
          categoryId,
          userId,
          accountId: effectiveAccount?.id ?? null,
          ...(createdAt && { createdAt })
        }
      })

      if (effectiveAccount) {
        await tx.accountTransaction.create({
          data: {
            accountId: effectiveAccount.id,
            type: 'withdrawal',
            amount,
            description: `Expenditure: ${title}`,
            userId
          }
        })
        await tx.account.update({
          where: { id: effectiveAccount.id },
          data: { balance: { decrement: amount } }
        })
      }

      return expenditure
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create expenditure' },
      { status: 500 }
    )
  }
}
