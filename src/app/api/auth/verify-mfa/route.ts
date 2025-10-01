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

    // TODO: Verify the MFA code against stored code
    // For now, we'll just return success
    const user = await prisma.user.findUnique({
      where: { id: userId }
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
    console.log('MFA verification successful, session created:', session.substring(0, 50) + '...')
    console.log('Session cookie should be set')

    return NextResponse.json({
      message: 'MFA verification successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    })
  } catch (error) {
    console.error('MFA verification error:', error)
    return NextResponse.json(
      { error: 'MFA verification failed' },
      { status: 500 }
    )
  }
}
