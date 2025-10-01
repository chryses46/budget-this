import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, mfaCode } = body

    if (!userId || !mfaCode) {
      return NextResponse.json(
        { error: 'User ID and MFA code are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate MFA code format
    if (mfaCode.length !== 6 || !/^\d+$/.test(mfaCode)) {
      return NextResponse.json(
        { error: 'Invalid MFA code format' },
        { status: 400 }
      )
    }

    // Find valid MFA code in database
    const validMfaCode = await prisma.mfaCode.findFirst({
      where: {
        userId: userId,
        code: mfaCode,
        used: false,
        expiresAt: {
          gt: new Date() // Not expired
        }
      }
    })

    if (!validMfaCode) {
      return NextResponse.json(
        { error: 'Invalid or expired MFA code' },
        { status: 400 }
      )
    }

    // Mark MFA code as used
    await prisma.mfaCode.update({
      where: { id: validMfaCode.id },
      data: { used: true }
    })

    // MFA code is valid - create a temporary session
    // We'll use a simple approach by setting a cookie that indicates MFA is verified
    const response = NextResponse.json({
      message: 'MFA verification successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    })

    // Set a temporary cookie to indicate MFA verification
    response.cookies.set('mfa-verified', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/'
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
