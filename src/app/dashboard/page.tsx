'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, TrendingUp, AlertCircle, Plus, CreditCard, PieChart, CheckCircle, Star, Receipt } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'

interface Bill {
  id: string
  title: string
  amount: number
  dayDue: number
  frequency: 'Weekly' | 'Monthly' | 'Yearly'
  isPaid: boolean
  paidAt?: string
  isAutopay?: boolean
  createdAt: string
  updatedAt: string
}

interface BudgetCategory {
  id: string
  title: string
  limit: number
  createdAt: string
  updatedAt: string
  expenditures: Array<{
    id: string
    title: string
    amount: number
    categoryId: string
    createdAt: string
    updatedAt: string
  }>
}

interface Account {
  id: string
  name: string
  type: string
  subtype?: string
  institution?: string
  institutionId?: string
  balance: number
  isMain: boolean
  createdAt: string
  updatedAt: string
}

interface LastExpenditure {
  id: string
  title: string
  amount: number
  createdAt: string
  category?: { title: string }
}

interface DashboardData {
  totalAccounts: number
  totalAssets: number
  accounts: Account[]
  topBills: Array<{ title: string; amount: number }>
  upcomingBills: Array<{ title: string; amount: number; dayDue: number; frequency: string; isPaid: boolean; paidAt?: string; paidThisPeriod?: boolean }>
  spendingCategories: Array<{ category: string; amount: number; remaining: number }>
  last5Expenditures: LastExpenditure[]
  burnDownLineData: Array<{ day: number; assets: number }>
  burnDownDaysInMonth: number
}

const chartPadding = { top: 8, right: 8, bottom: 28, left: 52 }
const chartWidth = 280
const chartHeight = 140

function BurnDownLineChart({
  points,
  daysInMonth
}: {
  points: Array<{ day: number; assets: number }>
  daysInMonth: number
}) {
  if (points.length < 2) return null
  const maxAssets = Math.max(...points.map(p => p.assets), 1)
  const minAssets = Math.min(...points.map(p => p.assets), 0)
  const yRange = maxAssets - minAssets || 1
  const w = chartWidth - chartPadding.left - chartPadding.right
  const h = chartHeight - chartPadding.top - chartPadding.bottom
  const x = (day: number) => chartPadding.left + ((day - 1) / (daysInMonth - 1 || 1)) * w
  const y = (assets: number) => chartPadding.top + h - ((assets - minAssets) / yRange) * h
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.day)} ${y(p.assets)}`).join(' ')
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-[280px] h-[140px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x={chartPadding.left - 8}
          y={chartPadding.top + h / 2}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 dark:fill-gray-400"
          transform={`rotate(-90 ${chartPadding.left - 8} ${chartPadding.top + h / 2})`}
        >
          Total Cash Assets
        </text>
        <text
          x={chartPadding.left + w / 2}
          y={chartHeight - 4}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 dark:fill-gray-400"
        >
          Days in month
        </text>
        <line
          x1={chartPadding.left}
          y1={chartPadding.top}
          x2={chartPadding.left}
          y2={chartPadding.top + h}
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth="1"
        />
        <line
          x1={chartPadding.left}
          y1={chartPadding.top + h}
          x2={chartPadding.left + w}
          y2={chartPadding.top + h}
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth="1"
        />
        <path
          d={pathD}
          fill="none"
          className="stroke-indigo-600 dark:stroke-indigo-400"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(p.day)}
            cy={y(p.assets)}
            r="3"
            className="fill-indigo-600 dark:fill-indigo-400"
          />
        ))}
      </svg>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && !userLoading) {
      fetchDashboardData()
    }
  }, [user, userLoading])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch bills, budget categories, accounts, last 5 expenditures, and current-month categories (for burn down) in parallel
      const [billsResponse, categoriesResponse, accountsResponse, expendituresResponse, categoriesCurrentMonthResponse] = await Promise.all([
        fetch('/api/bills'),
        fetch('/api/budget-categories'),
        fetch('/api/accounts'),
        fetch('/api/expenditures?limit=5&page=1'),
        fetch('/api/budget-categories?currentMonthOnly=true')
      ])

      const bills: Bill[] = billsResponse.ok ? await billsResponse.json() : []
      const categories: BudgetCategory[] = categoriesResponse.ok ? await categoriesResponse.json() : []
      const accounts: Account[] = accountsResponse.ok ? await accountsResponse.json() : []
      const expendituresJson = expendituresResponse.ok ? await expendituresResponse.json() : { data: [] }
      const last5Expenditures: LastExpenditure[] = expendituresJson.data ?? []
      const categoriesCurrentMonth: BudgetCategory[] = categoriesCurrentMonthResponse.ok ? await categoriesCurrentMonthResponse.json() : []

      // Process bills data
      const topBills = bills
        .sort((a, b) => b.amount - a.amount) // Highest to lowest
        .slice(0, 5)
        .map(bill => ({
          title: bill.title,
          amount: bill.amount
        }))

      // Calculate upcoming bills (next 5 not yet paid this period, by due date)
      const upcomingBills = calculateUpcomingBills(bills)

      // Process budget categories for spending data
      const spendingCategories = categories
        .map(category => {
          const totalSpent = (category.expenditures || []).reduce((sum, exp) => sum + exp.amount, 0)
          const remaining = category.limit - totalSpent
          return {
            category: category.title,
            amount: totalSpent,
            remaining: remaining
          }
        })
        .sort((a, b) => a.remaining - b.remaining) // Least remaining first (most urgent)
        .slice(0, 5)

      // Calculate total assets from all accounts
      const totalAssets = accounts.reduce((sum, account) => sum + account.balance, 0)

      // Burn down: estimate how much money you'll have left at end of month based on current expenditures
      const currentMonthExpendituresTotal = categoriesCurrentMonth.reduce(
        (sum, cat) => sum + (cat.expenditures || []).reduce((s, exp) => s + exp.amount, 0),
        0
      )
      const now = new Date()
      const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      // Bills still to pay this period (not yet paid / not autopay due)
      const isBillPaidThisPeriod = (b: Bill) => {
        if (b.isPaid && b.paidAt) {
          const paidAt = new Date(b.paidAt)
          if (b.frequency === 'Monthly' || b.frequency === 'Weekly') {
            if (paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()) return true
          } else if (b.frequency === 'Yearly' && paidAt.getFullYear() === now.getFullYear()) return true
        }
        if (b.isAutopay) {
          const currentDay = now.getDate()
          if (b.frequency === 'Monthly' && currentDay >= b.dayDue) return true
          if (b.frequency === 'Weekly') {
            const billDate = new Date(b.createdAt)
            const daysDiff = Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff >= 7) return true
          }
          if (b.frequency === 'Yearly') {
            const billDate = new Date(b.createdAt)
            const daysDiff = Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff >= 365) return true
          }
        }
        return false
      }
      const billsRemainingThisMonth = bills
        .filter(b => !isBillPaidThisPeriod(b))
        .reduce((sum, b) => sum + b.amount, 0)

      // Projected spending for rest of month from current burn rate (expenditures only)
      const dayOfMonth = now.getDate()
      const daysElapsed = Math.max(1, dayOfMonth)
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daysLeft = Math.max(0, daysInMonth - dayOfMonth)
      const dailyBurnRate = currentMonthExpendituresTotal / daysElapsed
      const projectedExpendituresRestOfMonth = dailyBurnRate * daysLeft

      const estimatedEndOfMonth =
        totalAssets - billsRemainingThisMonth - currentMonthExpendituresTotal - projectedExpendituresRestOfMonth

      // Start-of-month assets = current assets + what we've spent/paid out this month
      const billsPaidThisMonth = bills
        .filter(b => isBillPaidThisPeriod(b))
        .reduce((sum, b) => sum + b.amount, 0)
      const startOfMonthAssets = totalAssets + currentMonthExpendituresTotal + billsPaidThisMonth

      const assetsDay1 = Math.max(0, startOfMonthAssets)
      const assetsToday = Math.max(0, totalAssets)
      const assetsEndOfMonth = Math.max(0, estimatedEndOfMonth)

      const linePoints: Array<{ day: number; assets: number }> = [
        { day: 1, assets: assetsDay1 },
        { day: dayOfMonth, assets: assetsToday },
        { day: daysInMonth, assets: assetsEndOfMonth }
      ]
      const burnDownLineData = linePoints
        .filter((p, i, arr) => arr.findIndex(x => x.day === p.day) === i)
        .sort((a, b) => a.day - b.day)

      setData({
        totalAccounts: accounts.length,
        totalAssets,
        accounts,
        topBills,
        upcomingBills,
        spendingCategories,
        last5Expenditures,
        burnDownLineData,
        burnDownDaysInMonth: daysInMonth
      })
    } catch (error) {
      setData({
        totalAccounts: 0,
        totalAssets: 0,
        accounts: [],
        topBills: [],
        upcomingBills: [],
        spendingCategories: [],
        last5Expenditures: [],
        burnDownLineData: [],
        burnDownDaysInMonth: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  /** True if bill was manually paid in the current period (month/year); past periods do not count as paid. */
  const isPaidThisPeriod = (bill: Bill) => {
    if (!bill.isPaid || !bill.paidAt) return false
    const today = new Date()
    const paidAt = new Date(bill.paidAt)
    if (bill.frequency === 'Monthly' || bill.frequency === 'Weekly') {
      return paidAt.getMonth() === today.getMonth() && paidAt.getFullYear() === today.getFullYear()
    }
    if (bill.frequency === 'Yearly') {
      return paidAt.getFullYear() === today.getFullYear()
    }
    return false
  }

  /** True if bill is autopay and we're at or past the due date for the current period (show as paid in UI). */
  const isAutopayDue = (bill: Bill) => {
    if (!bill.isAutopay) return false
    const today = new Date()
    const currentDay = today.getDate()
    if (bill.frequency === 'Monthly') {
      return currentDay >= bill.dayDue
    }
    if (bill.frequency === 'Weekly') {
      const billDate = new Date(bill.createdAt)
      const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 7
    }
    if (bill.frequency === 'Yearly') {
      const billDate = new Date(bill.createdAt)
      const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff >= 365
    }
    return false
  }

  const displayAsPaid = (bill: Bill) => isPaidThisPeriod(bill) || isAutopayDue(bill)

  const calculateUpcomingBills = (bills: Bill[]) => {
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    return bills
      .map(bill => {
        // Calculate next due date based on frequency and dayDue
        let nextDueDate = new Date(currentYear, currentMonth, bill.dayDue)
        
        if (bill.dayDue < currentDay) {
          // If the day has passed this month, move to next month
          nextDueDate = new Date(currentYear, currentMonth + 1, bill.dayDue)
        }

        // Adjust for different frequencies
        if (bill.frequency === 'Weekly') {
          // For weekly bills, find the next occurrence
          const daysUntilNext = (7 - (today.getDay() - 1)) % 7
          nextDueDate = new Date(today.getTime() + daysUntilNext * 24 * 60 * 60 * 1000)
        } else if (bill.frequency === 'Yearly') {
          // For yearly bills, check if it's already passed this year
          if (nextDueDate < today) {
            nextDueDate = new Date(currentYear + 1, currentMonth, bill.dayDue)
          }
        }

        const paid = displayAsPaid(bill)
        const paidThisPeriod = isPaidThisPeriod(bill)

        return {
          title: bill.title,
          amount: bill.amount,
          dayDue: nextDueDate.getDate(),
          frequency: bill.frequency,
          isPaid: paid,
          paidAt: bill.paidAt,
          paidThisPeriod,
          dueDate: nextDueDate
        }
      })
      .filter(b => !b.isPaid) // Only show bills not yet paid this period (truly "upcoming")
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()) // Soonest first
      .slice(0, 5)
      .map(({ dueDate, ...bill }) => bill) // Remove dueDate from final result
  }

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {userLoading ? 'Loading user...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Please log in</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to view your dashboard.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Assets */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Total Assets</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${data?.totalAssets.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{data?.totalAccounts || 0} account{(data?.totalAccounts || 0) !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            {/* Accounts Section */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Accounts</h4>
              {data?.accounts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400 mb-3">No accounts added yet</p>
                  <Link href="/accounts" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {data?.accounts
                    .sort((a, b) => b.balance - a.balance) // Sort by balance (highest to lowest)
                    .slice(0, 3)
                    .map((account) => (
                    <div key={account.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                        <div>
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-900 dark:text-white text-sm font-medium">{account.name}</span>
                            {account.isMain && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {account.type}{account.subtype && ` • ${account.subtype}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ${account.balance.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {data?.accounts && data.accounts.length > 3 && (
                    <div className="pt-2">
                      <Link href="/accounts" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-sm">
                        <Plus className="h-3 w-3 mr-2" />
                        View All {data.accounts.length} Accounts
                      </Link>
                    </div>
                  )}
                  <Link href="/accounts" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md 
              hover:bg-indigo-700 flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                {data?.totalAccounts === 0 ? 'Add Account' : 'Manage Accounts'}
              </Link>
                </div>
                
              )}
            </div>
          </div>

          {/* Top 5 Bills */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Top 5 Bills</h3>
              <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {data?.topBills.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No bills added yet</p>
                <Link href="/bills" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center mx-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Bill
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.topBills.map((bill, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">{bill.title}</span>
                    <span className="font-medium text-gray-900 dark:text-white">${bill.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Bills */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Next 5 Upcoming Bills</h3>
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {data?.upcomingBills.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No upcoming bills</p>
                <Link href="/bills" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center mx-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bills
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.upcomingBills.map((bill, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900 dark:text-white">{bill.title}</span>
                        {bill.isPaid && (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Due on the {bill.dayDue}{
                        bill.dayDue === 1 ? 'st' : 
                        bill.dayDue === 2 ? 'nd' : 
                        bill.dayDue === 3 ? 'rd' : 
                        bill.dayDue === 21 ? 'st' :
                        bill.dayDue === 22 ? 'nd' :
                        bill.dayDue === 23 ? 'rd' :
                        bill.dayDue === 31 ? 'st' :
                        'th'}
                        {bill.paidThisPeriod && bill.paidAt && (
                          <span className="ml-2 text-green-600 dark:text-green-400">
                            • Paid on {new Date(bill.paidAt).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">${bill.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spending Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Top 5 Spending Categories</h3>
              <PieChart className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {data?.spendingCategories.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No spending data yet</p>
                <Link href="/budget" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center mx-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget Categories
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.spendingCategories.map((category, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <span className="text-gray-900 dark:text-white">{category.category}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ${category.remaining.toFixed(2)} remaining
                      </p>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">${category.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Last 5 Expenditures */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Last 5 Expenditures</h3>
              <Receipt className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {data?.last5Expenditures.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No expenditures yet</p>
                <Link href="/expenditures" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center mx-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expenditure
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.last5Expenditures.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <div>
                      <span className="text-gray-900 dark:text-white">{exp.title}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(exp.createdAt).toLocaleDateString()}
                        {exp.category?.title && ` • ${exp.category.title}`}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">${exp.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/expenditures" className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-sm">
                    View all expenditures
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Burn Down Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Burn Down Chart</h3>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {!data?.burnDownLineData.length || data.burnDownDaysInMonth === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No data available</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Add accounts, bills and expenditures to see your burn down</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total cash assets from start of month to projected end of month
                </p>
                <BurnDownLineChart
                  points={data.burnDownLineData}
                  daysInMonth={data.burnDownDaysInMonth}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
