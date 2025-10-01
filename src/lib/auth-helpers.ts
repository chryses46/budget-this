import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  try {
    const authToken = request.cookies.get('auth-token')?.value

    // Debug logging for mobile issues
    console.log('Auth token present:', !!authToken)
    console.log('User agent:', request.headers.get('user-agent'))
    console.log('All cookies:', request.cookies.getAll().map(c => c.name))

    if (!authToken) {
      return null
    }

    // Verify JWT token
    const payload = verifyToken(authToken)
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
