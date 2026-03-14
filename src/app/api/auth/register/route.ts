import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { hashForLookup } from '@/lib/field-encryption'
import { hashPassword, generateMfaCode, sendVerificationEmail } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password } = registerSchema.parse(body)

    const emailHash = hashForLookup(email)

    // Check if user already exists (by email hash)
    const existingUser = await prisma.user.findFirst({
      where: { emailHash }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user (emailHash for lookup; firstName, lastName, email encrypted by middleware)
    const user = await prisma.user.create({
      data: {
        emailHash,
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
    
    // Store code hash in database with expiration (24 hours); code sent by email, not stored in plain
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)
    
    await prisma.mfaCode.create({
      data: {
        codeHash: hashForLookup(verificationCode),
        userId: user.id,
        expiresAt: expiresAt
      }
    })
    
    // Send verification email
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
