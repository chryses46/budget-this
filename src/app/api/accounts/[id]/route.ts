import { NextRequest, NextResponse } from 'next/server'
import { updateAccountSchema } from '@/lib/validations'
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
    const { name, type, subtype, institution, institutionId, balance, isMain } = updateAccountSchema.parse(body)

    // If this is being set as main account, unset other main accounts
    if (isMain) {
      await prisma.account.updateMany({
        where: { userId, isMain: true, id: { not: id } },
        data: { isMain: false }
      })
    }

    const account = await prisma.account.update({
      where: { id, userId },
      data: { name, type, subtype, institution, institutionId, balance, isMain },
      include: {
        accountTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        budgetCategories: true
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update account' },
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

    await prisma.account.delete({
      where: { id, userId }
    })

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
