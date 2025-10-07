import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // Reset all paid bills for the user
    const result = await prisma.bill.updateMany({
      where: { 
        userId,
        isPaid: true
      },
      data: {
        isPaid: false,
        paidAt: null
      }
    })

    return NextResponse.json({
      message: 'Monthly bill reset completed',
      billsReset: result.count
    })
  } catch (error) {
    console.error('Error resetting monthly bills:', error)
    return NextResponse.json(
      { error: 'Failed to reset monthly bills' },
      { status: 500 }
    )
  }
}
