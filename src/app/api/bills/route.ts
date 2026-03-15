import { NextRequest, NextResponse } from 'next/server'
import { billSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

const FREQUENCY_VALUES = ['Monthly', 'Yearly', 'Weekly'] as const

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')?.trim() || undefined
    const typeParam = searchParams.get('type')?.trim()
    const filterAutopay = searchParams.get('isAutopay')?.trim() === 'true' ? true : false
    const frequency = typeParam && FREQUENCY_VALUES.includes(typeParam as (typeof FREQUENCY_VALUES)[number])
      ? (typeParam as (typeof FREQUENCY_VALUES)[number])
      : undefined

    const where: { 
      userId: string; 
      title?: { contains: string }; 
      frequency?: (typeof FREQUENCY_VALUES)[number];
      isAutopay?: boolean
    } = { userId }
    if (search) {
      where.title = { contains: search }
    }
    if (frequency) {
      where.frequency = frequency
    }
    if (filterAutopay) {
      where.isAutopay = true
    }

    const bills = await prisma.bill.findMany({
      where,
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
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await request.json()
    const { title, amount, dayDue, frequency, budgetCategoryId, isAutopay } = billSchema.parse(body)

    const bill = await prisma.bill.create({
      data: {
        title,
        amount,
        dayDue,
        frequency,
        budgetCategoryId,
        isAutopay: isAutopay ?? false,
        userId
      }
    })

    return NextResponse.json(bill)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}
