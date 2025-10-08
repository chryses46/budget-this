import { NextRequest, NextResponse } from 'next/server'
import { billSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id
    
    const bills = await prisma.bill.findMany({
      where: { userId },
      include: {
        budgetCategory: {
          select: {
            id: true,
            title: true,
            limit: true
          }
        }
      },
      orderBy: { dayDue: 'asc' }
    })

    return NextResponse.json(bills)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { title, amount, dayDue, frequency, budgetCategoryId } = billSchema.parse(body)

    const bill = await prisma.bill.create({
      data: {
        title,
        amount,
        dayDue,
        frequency,
        budgetCategoryId,
        userId
      }
    })

    return NextResponse.json(bill)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
