import { NextRequest, NextResponse } from 'next/server'
import { budgetCategorySchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

function getCurrentMonthUtcRange() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth
    const currentMonthOnly = request.nextUrl.searchParams.get('currentMonthOnly') === 'true'
    const { start: monthStart, end: monthEnd } = getCurrentMonthUtcRange()

    const categories = await prisma.budgetCategory.findMany({
      where: { userId },
      include: {
        expenditures: {
          ...(currentMonthOnly
            ? {
                where: {
                  createdAt: { gte: monthStart, lte: monthEnd }
                }
              }
            : {}),
          orderBy: { createdAt: 'desc' }
        },
        bills: {
          orderBy: { createdAt: 'desc' }
        },
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(categories)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to fetch budget categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await request.json()
    const { title, limit } = budgetCategorySchema.parse(body)

    const category = await prisma.budgetCategory.create({
      data: {
        title,
        limit,
        userId
      },
      include: {
        expenditures: {
          orderBy: { createdAt: 'desc' }
        },
        bills: {
          orderBy: { createdAt: 'desc' }
        },
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true
          }
        }
      }
    })

    return NextResponse.json(category)
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    )
  }
}
