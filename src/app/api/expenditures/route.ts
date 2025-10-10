import { NextRequest, NextResponse } from 'next/server'
import { expenditureSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const userId = session.user.id
    
    const expenditures = await prisma.expenditure.findMany({
      where: { userId },
      include: {
        category: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(expenditures)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch expenditures' },
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
    const { title, amount, categoryId } = expenditureSchema.parse(body)

    // Check if the budget category has a linked account
    const budgetCategory = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
      select: { accountId: true }
    })

    // Use transaction to ensure both expenditure and account transaction are created together
    const result = await prisma.$transaction(async (tx) => {
      // Create the expenditure
      const expenditure = await tx.expenditure.create({
        data: {
          title,
          amount,
          categoryId,
          userId
        }
      })

      // If the budget category is linked to an account, create a withdrawal transaction
      if (budgetCategory?.accountId) {
        // Create account transaction
        await tx.accountTransaction.create({
          data: {
            accountId: budgetCategory.accountId,
            type: 'withdrawal',
            amount,
            description: `Expenditure: ${title}`,
            userId
          }
        })

        // Update account balance
        await tx.account.update({
          where: { id: budgetCategory.accountId },
          data: {
            balance: {
              decrement: amount
            }
          }
        })
      }

      return expenditure
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create expenditure' },
      { status: 500 }
    )
  }
}
