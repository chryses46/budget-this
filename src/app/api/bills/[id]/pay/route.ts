import { NextRequest, NextResponse } from 'next/server'
import { prisma, type TransactionClient } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params

    const bill = await prisma.bill.findFirst({
      where: { id, userId }
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      )
    }

    if (bill.isPaid) {
      return NextResponse.json(
        { error: 'Bill is already paid' },
        { status: 400 }
      )
    }

    if (!bill.accountId) {
      return NextResponse.json(
        { error: 'Assign an account to this bill before paying.' },
        { status: 400 }
      )
    }

    const accountId = bill.accountId

    const updatedBill = await prisma.$transaction(async (tx: TransactionClient) => {
      const paidBill = await tx.bill.update({
        where: { id },
        data: {
          isPaid: true,
          paidAt: new Date()
        }
      })

      await tx.accountTransaction.create({
        data: {
          accountId,
          type: 'withdrawal',
          amount: bill.amount,
          description: `Bill Payment: ${bill.title}`,
          userId
        }
      })

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: bill.amount
          }
        }
      })

      return paidBill
    })

    return NextResponse.json({
      message: 'Bill paid successfully',
      bill: updatedBill
    })
  } catch (error) {
    console.error('Error paying bill:', error)
    return NextResponse.json(
      { error: 'Failed to pay bill' },
      { status: 500 }
    )
  }
}
