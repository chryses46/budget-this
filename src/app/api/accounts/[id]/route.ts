import { NextRequest, NextResponse } from 'next/server'
import { updateAccountSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { decryptQueryResult } from '@/lib/prisma-encryption-middleware'
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
    const {
      name,
      type,
      subtype,
      institution,
      institutionId,
      balance,
      isMain,
      roundUpOnExpenditure,
      doesRoundupSave,
    } = updateAccountSchema.parse(body)

    // If this is being set as main account, unset other main accounts
    if (isMain) {
      await prisma.account.updateMany({
        where: { userId, isMain: true, id: { not: id } },
        data: { isMain: false }
      })
    }

    if (doesRoundupSave === true) {
      await prisma.account.updateMany({
        where: { userId, id: { not: id } },
        data: { doesRoundupSave: false }
      })
    }

    const account = await prisma.account.update({
      where: { id, userId },
      data: {
        name,
        type,
        subtype,
        institution,
        institutionId,
        balance,
        isMain,
        roundUpOnExpenditure,
        doesRoundupSave,
      },
      include: {
        accountTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        budgetCategories: true
      }
    })

    decryptQueryResult(account)
    return NextResponse.json(account)
  } catch (_error) {
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
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params

    await prisma.account.delete({
      where: { id, userId }
    })

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
