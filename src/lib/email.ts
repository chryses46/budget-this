import nodemailer from 'nodemailer'

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// Send email verification
export async function sendVerificationEmail(email: string, verificationCode: string) {
  const transporter = createTransporter()
  
  const mailOptions = {
    from: `"Budget This" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to Budget This!</h2>
        <p>Please verify your email address by entering this code in the application:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 4px; margin: 0;">${verificationCode}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create an account with Budget This, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Budget This - Your Personal Finance Tracker</p>
      </div>
    `,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('Verification email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending verification email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send MFA code
export async function sendMfaCode(email: string, mfaCode: string) {
  const transporter = createTransporter()
  
  const mailOptions = {
    from: `"Budget This" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your MFA Code - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Multi-Factor Authentication</h2>
        <p>Here's your MFA code to complete your login:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 4px; margin: 0;">${mfaCode}</h1>
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please secure your account immediately.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Budget This - Your Personal Finance Tracker</p>
      </div>
    `,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('MFA email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending MFA email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetUrl: string, firstName: string) {
  const transporter = createTransporter()
  
  const mailOptions = {
    from: `"Budget This" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your Password - Budget This',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password for your Budget This account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">Budget This - Your Personal Finance Tracker</p>
      </div>
    `,
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent:', result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error('Error sending password reset email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Test email configuration
export async function testEmailConfiguration() {
  const transporter = createTransporter()
  
  try {
    await transporter.verify()
    console.log('Email configuration is valid')
    return { success: true, message: 'Email configuration is valid' }
  } catch (error) {
    console.error('Email configuration error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email configuration failed' 
    }
  }
}
