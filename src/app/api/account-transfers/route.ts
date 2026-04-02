import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { accountTransferSchema } from '@/lib/validations'
import { prisma, type TransactionClient } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await request.json()
    const { fromAccountId, toAccountId, amount, description } = accountTransferSchema.parse(body)

    const label = (description?.trim() || 'Transfer').slice(0, 500)

    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
      prisma.account.findFirst({ where: { id: toAccountId, userId } }),
    ])

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (fromAccount.balance < amount) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
    }

    const pairId = randomUUID()

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const out = await tx.accountTransaction.create({
        data: {
          accountId: fromAccountId,
          type: 'transfer_out',
          amount,
          description: label,
          userId,
          transferPairId: pairId,
          counterpartyAccountId: toAccountId,
        },
      })
      const inn = await tx.accountTransaction.create({
        data: {
          accountId: toAccountId,
          type: 'transfer_in',
          amount,
          description: label,
          userId,
          transferPairId: pairId,
          counterpartyAccountId: fromAccountId,
        },
      })
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amount } },
      })
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      })
      return { transferPairId: pairId, out, in: inn }
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message =
        error.issues.map((issue) => issue.message).join('; ') || 'Validation failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 })
  }
}
