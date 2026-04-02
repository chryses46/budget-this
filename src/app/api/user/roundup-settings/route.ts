import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { roundupSettingsSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roundupSavingsAccountId: true },
    })

    return NextResponse.json({
      roundupSavingsAccountId: user?.roundupSavingsAccountId ?? null,
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to load round-up settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await request.json()
    const { roundupSavingsAccountId } = roundupSettingsSchema.parse(body)

    if (roundupSavingsAccountId !== null) {
      const acc = await prisma.account.findFirst({
        where: { id: roundupSavingsAccountId, userId },
        select: { id: true },
      })
      if (!acc) {
        return NextResponse.json({ error: 'Savings account not found' }, { status: 400 })
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { roundupSavingsAccountId },
    })

    return NextResponse.json({ roundupSavingsAccountId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message =
        error.issues.map((issue) => issue.message).join('; ') || 'Validation failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to save round-up settings' }, { status: 500 })
  }
}
