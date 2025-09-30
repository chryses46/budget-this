import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateMfaCode, sendMfaCode } from '@/lib/auth'

const emailLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = emailLoginSchema.parse(body)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      )
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 400 }
      )
    }

    // Generate MFA code
    const mfaCode = await generateMfaCode()
    
    // Send MFA code via email
    await sendMfaCode(email, mfaCode)
    
    // TODO: Store MFA code in database with expiration
    // For now, we'll just return success

    return NextResponse.json({
      message: 'Verification code sent to your email',
      requiresMfa: true,
      userId: user.id
    })
  } catch (error) {
    console.error('Email login error:', error)
    return NextResponse.json(
      { error: 'Email login failed' },
      { status: 500 }
    )
  }
}
