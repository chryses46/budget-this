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

    // Get the bill
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

    // Mark the bill as paid
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date()
      }
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
