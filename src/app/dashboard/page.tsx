'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, TrendingUp, AlertCircle, Plus, CreditCard, PieChart } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'

interface Bill {
  id: string
  title: string
  amount: number
  dayDue: number
  frequency: 'Weekly' | 'Monthly' | 'Yearly'
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

interface DashboardData {
  totalAccounts: number
  topBills: Array<{ title: string; amount: number }>
  upcomingBills: Array<{ title: string; amount: number; dayDue: number; frequency: string }>
  spendingCategories: Array<{ category: string; amount: number; remaining: number }>
  burnDownData: Array<{ month: string; remaining: number }>
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
      
      // Fetch bills and budget categories in parallel
      const [billsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/bills'),
        fetch('/api/budget-categories')
      ])

      const bills: Bill[] = billsResponse.ok ? await billsResponse.json() : []
      const categories: BudgetCategory[] = categoriesResponse.ok ? await categoriesResponse.json() : []

      // Process bills data
      const topBills = bills
        .sort((a, b) => b.amount - a.amount) // Highest to lowest
        .slice(0, 5)
        .map(bill => ({
          title: bill.title,
          amount: bill.amount
        }))

      // Calculate upcoming bills (next 5 due dates)
      const upcomingBills = calculateUpcomingBills(bills).slice(0, 5)

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

      setData({
        totalAccounts: 0, // Will be updated when bank accounts are connected
        topBills,
        upcomingBills,
        spendingCategories,
        burnDownData: [] // Will be implemented when bank accounts are connected
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setData({
        totalAccounts: 0,
        topBills: [],
        upcomingBills: [],
        spendingCategories: [],
        burnDownData: []
      })
    } finally {
      setIsLoading(false)
    }
  }

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

        return {
          title: bill.title,
          amount: bill.amount,
          dayDue: nextDueDate.getDate(),
          frequency: bill.frequency,
          dueDate: nextDueDate
        }
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()) // Soonest first
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
          {/* Total Accounts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Total Accounts</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">$0.00</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/accounts" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Connect Bank Account
              </Link>
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
                      <span className="text-gray-900 dark:text-white">{bill.title}</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Due on {bill.dayDue}</p>
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

          {/* Burn Down Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Burn Down Chart</h3>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            {data?.burnDownData.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No data available</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Add bills and budget categories to see your burn down chart</p>
              </div>
            ) : (
              <div className="h-32 flex items-end justify-between">
                {data?.burnDownData.map((point, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="bg-indigo-600 w-8 rounded-t"
                      style={{ height: `${(point.remaining / 10000) * 100}px` }}
                    ></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{point.month}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
