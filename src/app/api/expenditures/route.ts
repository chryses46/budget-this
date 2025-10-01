import { NextRequest, NextResponse } from 'next/server'
import { expenditureSchema } from '@/lib/validations'
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
    
    const expenditures = await prisma.expenditure.findMany({
      where: { userId },
      include: {
        category: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(expenditures)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch expenditures' },
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
    const { title, amount, categoryId } = expenditureSchema.parse(body)

    const expenditure = await prisma.expenditure.create({
      data: {
        title,
        amount,
        categoryId,
        userId
      }
    })

    return NextResponse.json(expenditure)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create expenditure' },
      { status: 500 }
    )
  }
}
