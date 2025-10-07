import { NextRequest, NextResponse } from 'next/server'
import { updateBillSchema } from '@/lib/validations'
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
    const { title, amount, dayDue, frequency, budgetCategoryId } = updateBillSchema.parse(body)

    const bill = await prisma.bill.update({
      where: { id, userId },
      data: { title, amount, dayDue, frequency, budgetCategoryId }
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

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