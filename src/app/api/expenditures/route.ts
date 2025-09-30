import { NextRequest, NextResponse } from 'next/server'
import { expenditureSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult
    
    const expenditures = await prisma.expenditure.findMany({
      where: { userId },
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(expenditures)
  } catch (error) {
    console.error('Error fetching expenditures:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenditures' },
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
    const { title, amount, categoryId } = expenditureSchema.parse(body)

    // Verify the category belongs to the user
    const category = await prisma.budgetCategory.findFirst({
      where: { 
        id: categoryId,
        userId 
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const expenditure = await prisma.expenditure.create({
      data: {
        title,
        amount,
        categoryId,
        userId
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(expenditure)
  } catch (error) {
    console.error('Error creating expenditure:', error)
    return NextResponse.json(
      { error: 'Failed to create expenditure' },
      { status: 500 }
    )
  }
}
