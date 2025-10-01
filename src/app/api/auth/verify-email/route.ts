import { NextRequest, NextResponse } from 'next/server'
import { mfaSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { createSession, setSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code: _code } = mfaSchema.parse(body)
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // TODO: Verify the email verification code against stored code
    // For now, we'll just mark the email as verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create session
    const session = await createSession({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    })

    // Set session cookie
    await setSessionCookie(session)

    return NextResponse.json({
      message: 'Email verification successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Email verification failed' },
      { status: 500 }
    )
  }
}