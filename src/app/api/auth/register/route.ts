import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateMfaCode, sendVerificationEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        emailVerified: false,
        mfaEnabled: true,
      }
    })

    // Generate verification code
    const verificationCode = await generateMfaCode()
    
    // TODO: Store verification code in database with expiration
    // For now, we'll just send it via email
    await sendVerificationEmail(email, verificationCode)

    return NextResponse.json({
      message: 'User created successfully. Please check your email for verification code.',
      userId: user.id
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
