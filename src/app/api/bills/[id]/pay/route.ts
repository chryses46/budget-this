import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const { id } = await params

    // Get the bill with its budget category
    const bill = await prisma.bill.findFirst({
      where: { id, userId },
      include: {
        budgetCategory: {
          select: {
            accountId: true
          }
        }
      }
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

    // Use transaction to ensure bill payment and account transaction are created together
    const updatedBill = await prisma.$transaction(async (tx) => {
      // Mark the bill as paid
      const paidBill = await tx.bill.update({
        where: { id },
        data: {
          isPaid: true,
          paidAt: new Date()
        }
      })

      // If the bill's budget category is linked to an account, create a withdrawal transaction
      if (bill.budgetCategory?.accountId) {
        // Create account transaction
        await tx.accountTransaction.create({
          data: {
            accountId: bill.budgetCategory.accountId,
            type: 'withdrawal',
            amount: bill.amount,
            description: `Bill Payment: ${bill.title}`,
            userId
          }
        })

        // Update account balance
        await tx.account.update({
          where: { id: bill.budgetCategory.accountId },
          data: {
            balance: {
              decrement: bill.amount
            }
          }
        })
      }

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
