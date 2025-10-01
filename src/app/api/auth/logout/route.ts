import { NextRequest, NextResponse } from 'next/server'
import { deleteSessionCookie } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    // Delete session cookie
    await deleteSessionCookie()

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}