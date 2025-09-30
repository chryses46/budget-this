import { NextRequest, NextResponse } from 'next/server'
import { updateBillSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

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
    const { title, amount, dayDue, frequency } = updateBillSchema.parse(body)

    const bill = await prisma.bill.update({
      where: { 
        id,
        userId // Ensure user owns this bill
      },
      data: {
        ...(title && { title }),
        ...(amount && { amount }),
        ...(dayDue && { dayDue }),
        ...(frequency && { frequency })
      }
    })

    return NextResponse.json(bill)
  } catch (error) {
    console.error('Error updating bill:', error)
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
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const { id } = await params

    await prisma.bill.delete({
      where: { 
        id,
        userId // Ensure user owns this bill
      }
    })

    return NextResponse.json({ message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}
