import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: {
      userId: string
      accountId?: string
      date?: {
        gte: Date
        lte: Date
      }
    } = { userId }
    
    if (accountId) {
      whereClause.accountId = accountId
    }
    
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            institution: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset
    })

    const totalCount = await prisma.transaction.count({
      where: whereClause
    })

    return NextResponse.json({
      transactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
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
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const body = await request.json()
    const {
      plaidTransactionId,
      accountId,
      amount,
      type,
      status,
      date,
      name,
      merchantName,
      category,
      subcategory,
      location,
      paymentChannel,
      pending,
      isoCurrencyCode,
      unofficialCurrencyCode
    } = body

    // Validate required fields
    if (!plaidTransactionId || !accountId || !amount || !type || !status || !date || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the account belongs to the user
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        userId 
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if transaction already exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { plaidTransactionId }
    })

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction already exists' },
        { status: 409 }
      )
    }

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
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            institution: true
          }
        }
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
