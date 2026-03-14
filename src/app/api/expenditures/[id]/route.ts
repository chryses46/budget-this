import { NextRequest, NextResponse } from 'next/server'
import { updateExpenditureSchema } from '@/lib/validations'
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
    const parsed = updateExpenditureSchema.parse(body)
    const { title, amount, categoryId, accountId, createdAt: createdAtInput } = parsed

    const createdAt =
      createdAtInput !== undefined && typeof createdAtInput === 'string' && !Number.isNaN(new Date(createdAtInput).getTime())
        ? new Date(createdAtInput)
        : undefined

    const data: { title?: string; amount?: number; categoryId?: string; accountId?: string | null; createdAt?: Date } = {}
    if (title !== undefined) data.title = title
    if (amount !== undefined) data.amount = amount
    if (categoryId !== undefined) data.categoryId = categoryId
    if (accountId !== undefined) data.accountId = accountId === '' ? null : accountId
    if (createdAt !== undefined) data.createdAt = createdAt

    const expenditure = await prisma.expenditure.update({
      where: { id, userId },
      data
    })

    return NextResponse.json(expenditure)
  } catch (error) {
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
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params

    await prisma.expenditure.delete({
      where: { id, userId }
    })

    return NextResponse.json({ message: 'Expenditure deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete expenditure' },
      { status: 500 }
    )
  }
}