import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashForLookup, normalizeEmailForLookup } from '@/lib/field-encryption'
import { verifyPassword } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmailForLookup(email)
    // Find user by email hash
    const user = await prisma.user.findFirst({
      where: { emailHash: hashForLookup(normalizedEmail) }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email not verified' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // In development, bypass MFA so password-only login is allowed
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json({
      valid: true,
      mfaEnabled: isDev ? false : user.mfaEnabled,
      userId: user.id
    })

  } catch (error) {
    console.error('Credential validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
