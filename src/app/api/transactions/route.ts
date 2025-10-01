import { NextRequest, NextResponse } from 'next/server'
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: Record<string, unknown> = { userId }
    
    if (accountId) {
      whereClause.accountId = accountId
    }
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else if (startDate) {
      whereClause.date = {
        gte: new Date(startDate)
      }
    } else if (endDate) {
      whereClause.date = {
        lte: new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { date: 'desc' },
      include: {
        account: {
          select: { name: true, institution: true }
        }
      }
    })

    const totalCount = await prisma.transaction.count({ where: whereClause })

    return NextResponse.json({
      transactions,
      totalCount,
      hasMore: offset + limit < totalCount,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
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
    const { plaidTransactionId, accountId, amount, type, status, date, name, merchantName, category, subcategory, location, paymentChannel, pending, isoCurrencyCode, unofficialCurrencyCode } = body

    const transaction = await prisma.transaction.create({
      data: {
        plaidTransactionId,
        accountId,
        userId,
        amount,
        type,
        status,
        date: new Date(date),
        name,
        merchantName,
        category,
        subcategory,
        location,
        paymentChannel,
        pending: pending || false,
        isoCurrencyCode,
        unofficialCurrencyCode
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}