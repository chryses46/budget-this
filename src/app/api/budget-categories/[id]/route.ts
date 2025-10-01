import { NextRequest, NextResponse } from 'next/server'
import { updateBudgetCategorySchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const { id } = await params
    const body = await request.json()
    const { title, limit } = updateBudgetCategorySchema.parse(body)

    const category = await prisma.budgetCategory.update({
      where: { id, userId },
      data: { title, limit }
    })

    return NextResponse.json(category)
  } catch (error) {
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const { id } = await params

    await prisma.budgetCategory.delete({
      where: { id, userId }
    })

    return NextResponse.json({ message: 'Budget category deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete budget category' },
      { status: 500 }
    )
  }
}