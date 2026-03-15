import { NextRequest, NextResponse } from 'next/server'
import { accountSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { decryptQueryResult } from '@/lib/prisma-encryption-middleware'
import { requireApiAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth
    
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        accountTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        budgetCategories: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(accounts)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
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
    const { name, type, subtype, institution, institutionId, balance, isMain } = accountSchema.parse(body)

    // If this is being set as main account, unset other main accounts
    if (isMain) {
      await prisma.account.updateMany({
        where: { userId, isMain: true },
        data: { isMain: false }
      })
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        subtype,
        institution,
        institutionId,
        balance,
        isMain,
        userId
      },
      include: {
        accountTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        budgetCategories: true
      }
    })

    decryptQueryResult(account)
    return NextResponse.json(account)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}