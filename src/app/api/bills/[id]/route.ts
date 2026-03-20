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

    let accountIdUpdate: string | null | undefined = parsed.accountId
    if (accountIdUpdate !== undefined && accountIdUpdate !== null) {
      const owned = await prisma.account.findFirst({
        where: { id: accountIdUpdate, userId },
        select: { id: true }
      })
      if (!owned) {
        return NextResponse.json(
          { error: 'Account not found or access denied' },
          { status: 400 }
        )
      }
    }

    const bill = await prisma.bill.update({
      where: { id, userId },
      data: {
        ...(parsed.title !== undefined && { title: parsed.title }),
        ...(parsed.amount !== undefined && { amount: parsed.amount }),
        ...(parsed.dayDue !== undefined && { dayDue: parsed.dayDue }),
        ...(parsed.frequency !== undefined && { frequency: parsed.frequency }),
        ...(parsed.budgetCategoryId !== undefined && { budgetCategoryId: parsed.budgetCategoryId }),
        ...(parsed.accountId !== undefined && { accountId: parsed.accountId }),
        ...(parsed.isAutopay !== undefined && { isAutopay: parsed.isAutopay }),
      }
    })

    return NextResponse.json(bill)
  } catch (_error) {
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
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}