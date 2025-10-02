import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const verifyEmailSchema = z.object({
  code: z.string().min(6).max(6),
  userId: z.string().uuid()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, userId } = verifyEmailSchema.parse(body)

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Find the verification code
    const mfaCode = await prisma.mfaCode.findFirst({
      where: {
        userId: userId,
        code: code,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (!mfaCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Mark the code as used
    await prisma.mfaCode.update({
      where: { id: mfaCode.id },
      data: { used: true }
    })

    // Mark the user's email as verified
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true }
    })

    return NextResponse.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
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
