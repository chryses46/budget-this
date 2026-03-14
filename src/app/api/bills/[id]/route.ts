import { NextRequest, NextResponse } from 'next/server'
import { updateBillSchema } from '@/lib/validations'
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
    const parsed = updateBillSchema.parse(body)

    const bill = await prisma.bill.update({
      where: { id, userId },
      data: {
        ...(parsed.title !== undefined && { title: parsed.title }),
        ...(parsed.amount !== undefined && { amount: parsed.amount }),
        ...(parsed.dayDue !== undefined && { dayDue: parsed.dayDue }),
        ...(parsed.frequency !== undefined && { frequency: parsed.frequency }),
        ...(parsed.budgetCategoryId !== undefined && { budgetCategoryId: parsed.budgetCategoryId }),
        ...(parsed.isAutopay !== undefined && { isAutopay: parsed.isAutopay }),
      }
    })

    return NextResponse.json(bill)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update bill' },
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

    await prisma.bill.delete({
      where: { id, userId }
    })

    return NextResponse.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}