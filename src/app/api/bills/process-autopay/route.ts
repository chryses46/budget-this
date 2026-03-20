import { NextRequest, NextResponse } from 'next/server'
import { prisma, type TransactionClient } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

type Frequency = 'Weekly' | 'Monthly' | 'Yearly'

function isAutopayDue(frequency: Frequency, dayDue: number, createdAt: Date): boolean {
  const today = new Date()
  const currentDay = today.getDate()
  if (frequency === 'Monthly') {
    return currentDay >= dayDue
  }
  if (frequency === 'Weekly') {
    const billDate = new Date(createdAt)
    const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff >= 7
  }
  if (frequency === 'Yearly') {
    const billDate = new Date(createdAt)
    const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff >= 365
  }
  return false
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const bills = await prisma.bill.findMany({
      where: {
        userId,
        isAutopay: true,
        isPaid: false
      }
    })

    const dueBills = bills.filter((bill) =>
      isAutopayDue(bill.frequency as Frequency, bill.dayDue, bill.createdAt)
    )

    const processed: string[] = []
    for (const bill of dueBills) {
      const updated = await prisma.$transaction(async (tx: TransactionClient) => {
        const result = await tx.bill.updateMany({
          where: { id: bill.id, isPaid: false },
          data: { isPaid: true, paidAt: new Date() }
        })
        if (result.count !== 1) return false
        if (bill.accountId) {
          await tx.accountTransaction.create({
            data: {
              accountId: bill.accountId,
              type: 'withdrawal',
              amount: bill.amount,
              description: `Bill Payment: ${bill.title}`,
              userId
            }
          })
          await tx.account.update({
            where: { id: bill.accountId },
            data: { balance: { decrement: bill.amount } }
          })
        }
        return true
      })
      if (updated) processed.push(bill.id)
    }

    return NextResponse.json({
      message: 'Autopay processing completed',
      processed: processed.length,
      billIds: processed
    })
  } catch (error) {
    console.error('Error processing autopay bills:', error)
    return NextResponse.json(
      { error: 'Failed to process autopay bills' },
      { status: 500 }
    )
  }
}
