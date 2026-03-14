import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

/**
 * Revoke (delete) an API key. Requires session or API key auth; key must belong to the user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { id } = await params

    const apiKey = await prisma.apiKey.findUnique({
      where: { id }
    })

    if (!apiKey || apiKey.userId !== userId) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    await prisma.apiKey.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
