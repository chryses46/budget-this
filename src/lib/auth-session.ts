import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'

export async function requireAuth(request: NextRequest): Promise<{ userId: string } | { error: Response }> {
  try {
    const session = await getSession()
    
    if (!session) {
      return {
        error: new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    return { userId: session.userId }
  } catch (error) {
    console.error('Error checking session:', error)
    return {
      error: new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
