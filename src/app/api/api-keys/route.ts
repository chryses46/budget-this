import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, hashForLookup } from '@/lib/field-encryption'
import { requireApiAuth } from '@/lib/api-auth'

/**
 * Create a new API key. Requires session only (not API key) so only the
 * logged-in user can create keys. The raw key is returned once and never stored.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() || null : null

    const secret = crypto.randomBytes(32).toString('base64')
    const keyHash = hashForLookup(secret)
    const keyEncrypted = encrypt(secret)

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyEncrypted
      }
    })

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key: secret,
      createdAt: apiKey.createdAt
    })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}

/**
 * List current user's API keys (id, name, createdAt, lastUsedAt).
 * Supports session or API key auth.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(keys)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    )
  }
}
