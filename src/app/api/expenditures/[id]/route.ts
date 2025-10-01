import { NextRequest, NextResponse } from 'next/server'
import { updateExpenditureSchema } from '@/lib/validations'
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
    const { title, amount, categoryId } = updateExpenditureSchema.parse(body)

    // If categoryId is being updated, verify the new category belongs to the user
    if (categoryId) {
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
    }

    const expenditure = await prisma.expenditure.update({
      where: { 
        id,
        userId // Ensure user owns this expenditure
      },
      data: {
        ...(title && { title }),
        ...(amount && { amount }),
        ...(categoryId && { categoryId })
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(expenditure)
  } catch (error) {
    console.error('Error updating expenditure:', error)
    return NextResponse.json(
      { error: 'Failed to update expenditure' },
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

    await prisma.expenditure.delete({
      where: { 
        id,
        userId // Ensure user owns this expenditure
      }
    })

    return NextResponse.json({ message: 'Expenditure deleted successfully' })
  } catch (error) {
    console.error('Error deleting expenditure:', error)
    return NextResponse.json(
      { error: 'Failed to delete expenditure' },
      { status: 500 }
    )
  }
}
