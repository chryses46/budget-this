import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with that email exists, we sent a password reset link.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now

    // Store reset token in database
    await prisma.passwordReset.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
      }
    })

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`
    
    const emailResult = await sendPasswordResetEmail(email, resetUrl, user.firstName)
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to user for security
    }

    return NextResponse.json({
      message: 'If an account with that email exists, we sent a password reset link.'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    )
  }
}
