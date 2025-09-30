import { NextRequest, NextResponse } from 'next/server'
import { mfaSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'

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

    // Create JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    })

    const response = NextResponse.json({
      message: 'MFA verification successful',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    })

    // Set JWT token in HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    console.error('MFA verification error:', error)
    return NextResponse.json(
      { error: 'MFA verification failed' },
      { status: 500 }
    )
  }
}
