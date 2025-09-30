import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateMfaCode(): Promise<string> {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const { sendVerificationEmail: sendEmail } = await import('./email')
  const result = await sendEmail(email, code)
  
  if (!result.success) {
    console.error('Failed to send verification email:', result.error)
    // For development, still log the code
    console.log(`Verification code for ${email}: ${code}`)
  }
}

export async function sendMfaCode(email: string, code: string): Promise<void> {
  const { sendMfaCode: sendEmail } = await import('./email')
  const result = await sendEmail(email, code)
  
  if (!result.success) {
    console.error('Failed to send MFA email:', result.error)
    // For development, still log the code
    console.log(`MFA code for ${email}: ${code}`)
  }
}
