import { NextRequest, NextResponse } from 'next/server'
import { accountSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id
    
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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

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

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}