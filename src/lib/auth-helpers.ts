import { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  try {
    const authToken = request.cookies.get('auth-token')?.value

    if (!authToken) {
      return null
    }

    // Verify JWT token
    const payload = verifyToken(authToken)
    if (!payload) {
      return null
    }

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
