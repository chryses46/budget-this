import { NextRequest, NextResponse } from 'next/server'
import { billSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult
    
    const bills = await prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(bills)
  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
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
    const { title, amount, dayDue, frequency } = billSchema.parse(body)

    const bill = await prisma.bill.create({
      data: {
        title,
        amount,
        dayDue,
        frequency,
        userId
      }
    })

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error creating bill:', error)
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
