import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashForLookup, normalizeEmailForLookup } from '@/lib/field-encryption'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmailForLookup(String(email))
    const user = await prisma.user.findFirst({
      where: { emailHash: hashForLookup(normalizedEmail) },
      select: { id: true, mfaEnabled: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      mfaEnabled: user.mfaEnabled
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check MFA status' },
      { status: 500 }
    )
  }
}
