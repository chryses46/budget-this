import { NextRequest, NextResponse } from 'next/server'
import { updateBudgetCategorySchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-session'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const { id } = await params
    const body = await request.json()
    const { title, limit } = updateBudgetCategorySchema.parse(body)

    const category = await prisma.budgetCategory.update({
      where: { 
        id,
        userId // Ensure user owns this category
      },
      data: {
        ...(title && { title }),
        ...(limit && { limit })
      },
      include: {
        expenditures: true
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating budget category:', error)
    return NextResponse.json(
      { error: 'Failed to update budget category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const { id } = await params

    await prisma.budgetCategory.delete({
      where: { 
        id,
        userId // Ensure user owns this category
      }
    })

    return NextResponse.json({ message: 'Budget category deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget category:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget category' },
      { status: 500 }
    )
  }
}
