import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 5, // Fetch latest 5 transactions for each account
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()
    const { plaidAccountId, name, type, subtype, institution, institutionId } = body

    const account = await prisma.account.create({
      data: {
        plaidAccountId,
        name,
        type,
        subtype,
        institution,
        institutionId,
        userId
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}