import { NextRequest, NextResponse } from 'next/server'
import { accountTransactionSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params
    
    const transactions = await prisma.accountTransaction.findMany({
      where: { accountId: id, userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch account transactions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params
    const body = await request.json()
    const { type, amount, description } = accountTransactionSchema.parse(body)

    // Get the current account
    const account = await prisma.account.findFirst({
      where: { id, userId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Calculate new balance
    const amountChange = type === 'deposit' ? amount : -amount
    const newBalance = account.balance + amountChange

    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient funds' },
        { status: 400 }
      )
    }

    // Create transaction and update account balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the account transaction
      const transaction = await tx.accountTransaction.create({
        data: {
          accountId: id,
          type,
          amount,
          description,
          userId
        }
      })

      // Update account balance
      await tx.account.update({
        where: { id },
        data: { balance: newBalance }
      })

      return transaction
    })

    return NextResponse.json(result)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create account transaction' },
      { status: 500 }
    )
  }
}
