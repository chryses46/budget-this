import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashForLookup } from '@/lib/field-encryption'
import { prisma } from '@/lib/prisma'

/**
 * Try to read API key from request. Supports:
 * - Authorization: Bearer <key>
 * - X-API-Key: <key>
 */
function getApiKeyFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const key = authHeader.slice(7).trim()
    if (key.length > 0) return key
  }
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey?.trim()) return xApiKey.trim()
  return null
}

/**
 * Require authentication for API routes. Accepts either:
 * - Valid NextAuth session (browser client)
 * - Valid API key in Authorization: Bearer <key> or X-API-Key: <key>
 *
 * Returns { userId } on success, or a NextResponse (401) to return to the client.
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return { userId: session.user.id }
  }

  const apiKey = getApiKeyFromRequest(request)
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  let keyHash: string
  try {
    keyHash = hashForLookup(apiKey)
  } catch {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash }
  })

  if (!apiKeyRecord) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() }
  })

  return { userId: apiKeyRecord.userId }
}
