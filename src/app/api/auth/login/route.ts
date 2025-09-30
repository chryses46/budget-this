import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateMfaCode, sendMfaCode } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
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

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 400 }
      )
    }

    // Generate MFA code if MFA is enabled
    if (user.mfaEnabled) {
      const mfaCode = await generateMfaCode()
      await sendMfaCode(email, mfaCode)
      
      // TODO: Store MFA code in database with expiration
      
      return NextResponse.json({
        message: 'MFA code sent to your email',
        requiresMfa: true,
        userId: user.id
      })
    }

    // Create JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    })

    const response = NextResponse.json({
      message: 'Login successful',
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
