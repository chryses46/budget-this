import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production')

export interface SessionPayload {
  userId: string
  email: string
  firstName: string
  lastName: string
  iat?: number
  exp?: number
}

export async function createSession(payload: Omit<SessionPayload, 'iat' | 'exp'>) {
  const session = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)

  return session
}

export async function verifySession(session: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value

  console.log('getSession - Cookie found:', !!session)
  console.log('getSession - Session length:', session?.length || 0)

  if (!session) {
    console.log('getSession - No session cookie found')
    return null
  }

  const verified = await verifySession(session)
  console.log('getSession - Session verified:', !!verified)
  return verified
}

export async function setSessionCookie(session: string) {
  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Always secure for Heroku (HTTPS)
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    domain: process.env.NODE_ENV === 'production' ? '.budget-this.com' : undefined // Allow subdomain access
  }
  
  console.log('setSessionCookie - Environment:', process.env.NODE_ENV)
  console.log('setSessionCookie - Cookie options:', cookieOptions)
  
  cookieStore.set('session', session, cookieOptions)
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies()
  // Delete with same options as set
  cookieStore.set('session', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Expire immediately
    domain: process.env.NODE_ENV === 'production' ? '.budget-this.com' : undefined
  })
}
