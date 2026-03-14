import { NextRequest, NextResponse } from 'next/server'
import { updateBudgetCategorySchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params
    const body = await request.json()
    const { title, limit } = updateBudgetCategorySchema.parse(body)

    const category = await prisma.budgetCategory.update({
      where: { id, userId },
      data: {
        ...(title !== undefined && { title }),
        ...(limit !== undefined && { limit })
      },
      include: {
        expenditures: {
          orderBy: { createdAt: 'desc' }
        },
        bills: {
          orderBy: { createdAt: 'desc' }
        },
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true
          }
        }
      }
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
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

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