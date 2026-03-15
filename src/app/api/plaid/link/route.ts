import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // TODO: Implement Plaid Link token creation
    return NextResponse.json({
      message: 'Plaid integration coming soon'
    })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create Plaid link token' },
      { status: 500 }
    )
  }
}