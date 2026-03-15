import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

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
