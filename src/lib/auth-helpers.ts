import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    const fallbackToken = request.cookies.get('auth-token-fallback')?.value
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
    const token = authToken || fallbackToken || authHeader

    // Debug logging for mobile issues
    console.log('Auth token present:', !!authToken)
    console.log('Fallback token present:', !!fallbackToken)
    console.log('Auth header present:', !!authHeader)
    console.log('User agent:', request.headers.get('user-agent'))
    console.log('All cookies:', request.cookies.getAll().map(c => c.name))

    if (!token) {
      return null
    }

    // Verify JWT token
    const payload = verifyToken(token)
    if (!payload) {
      console.log('JWT verification failed')
      return null
    }

    console.log('JWT verification successful for user:', payload.userId)
    return payload.userId
  } catch (error) {
    console.error('Error extracting user ID from token:', error)
    return null
  }
}

export async function requireAuth(request: NextRequest): Promise<{ userId: string } | { error: Response }> {
  const userId = await getAuthenticatedUserId(request)
  
  if (!userId) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  return { userId }
}
