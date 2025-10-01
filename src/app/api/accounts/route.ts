import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10 // Get latest 10 transactions per account
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return authResult.error
    }
    const { userId } = authResult

    const body = await request.json()
    const { 
      plaidAccountId, 
      name, 
      type, 
      subtype, 
      institution, 
      institutionId 
    } = body

    // Validate required fields
    if (!plaidAccountId || !name || !type || !institution || !institutionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: { plaidAccountId }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account already exists' },
        { status: 409 }
      )
    }

    const account = await prisma.account.create({
      data: {
        plaidAccountId,
        name,
        type,
        subtype,
        institution,
        institutionId,
        userId
      },
      include: {
        transactions: true
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
