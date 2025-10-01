import { NextRequest, NextResponse } from 'next/server'
import { budgetCategorySchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-session'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult
    
    const categories = await prisma.budgetCategory.findMany({
      where: { userId },
      include: {
        expenditures: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching budget categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget categories' },
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
    const { title, limit } = budgetCategorySchema.parse(body)

    const category = await prisma.budgetCategory.create({
      data: {
        title,
        limit,
        userId
      },
      include: {
        expenditures: true
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating budget category:', error)
    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    )
  }
}
