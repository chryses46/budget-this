import nodemailer from 'nodemailer'

const fromEmail = "verify@budget-this.com"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendMfaCode(email: string, code: string): Promise<void> {
  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Your MFA Code - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your MFA Code</h2>
        <p>Your multi-factor authentication code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('MFA email sent successfully:', result.messageId)
  } catch (error) {
    console.error('Failed to send MFA email:', error)
    throw error
  }
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Verify Your Email - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Your email verification code is:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: 'Reset Your Password - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
      </div>
    `,
  }

  await transporter.sendMail(mailOptions)
}