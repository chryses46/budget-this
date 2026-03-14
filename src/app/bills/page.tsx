'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { billSchema, BillInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { Plus, Edit, Trash2, Calendar, DollarSign, CheckCircle, Search } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'

interface Bill {
  id: string
  title: string
  amount: number
  dayDue: number
  frequency: 'Weekly' | 'Monthly' | 'Yearly'
  budgetCategoryId?: string
  budgetCategory?: {
    id: string
    title: string
    limit: number
  }
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
}

export default function BillsPage() {
  const { user, isLoading: userLoading } = useUser()
  const [bills, setBills] = useState<Bill[]>([])
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [filterAutopay, setFilterAutopay] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema) as Resolver<BillInput>,
    defaultValues: { isAutopay: false },
  })

  useEffect(() => {
    if (user && !userLoading) {
      fetchBills()
      fetchBudgetCategories()
    }
  }, [user, userLoading])

  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills')
      if (response.ok) {
        const data = await response.json()
        setBills(data)
      } else {
        setBills([])
      }
    } catch (error) {
      setBills([])
    } finally {
      setIsLoading(false)
      setIsInitialLoad(false)
    }
  }

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch = !searchQuery.trim() ||
        bill.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchesType = !typeFilter || bill.frequency === typeFilter
      const matchesAutopay = !filterAutopay || bill.isAutopay === filterAutopay
      return matchesSearch && matchesType && matchesAutopay
    })
  }, [bills, searchQuery, typeFilter, filterAutopay])

  const fetchBudgetCategories = async () => {
    try {
      const response = await fetch('/api/budget-categories')
      if (response.ok) {
        const data = await response.json()
        setBudgetCategories(data)
      } else {
        setBudgetCategories([])
      }
    } catch (error) {
      setBudgetCategories([])
    }
  }

  const onSubmit = async (data: BillInput) => {
    try {
      if (editingBill) {
        // Update existing bill
        const response = await fetch(`/api/bills/${editingBill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          await fetchBills()
        }
      } else {
        // Create new bill
        const response = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          await fetchBills()
        }
      }
      
      reset()
      setShowForm(false)
      setEditingBill(null)
    } catch (error) {
    }
  }

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill)
    reset(bill)
    setShowForm(true)
    // Scroll to top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    
    try {
      const response = await fetch(`/api/bills/${id}`, { method: 'DELETE' })
      
      if (response.ok) {
        await fetchBills()
      }
    } catch (error) {
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingBill(null)
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

  const displayAsPaid = (bill: Bill) => isPaidThisPeriod(bill) || isAutopayDue(bill)

  const isBillLate = (bill: Bill) => {
    if (displayAsPaid(bill)) return false
    const today = new Date()
    const currentDay = today.getDate()
    if (bill.frequency === 'Monthly') {
      return currentDay > bill.dayDue
    }
    if (bill.frequency === 'Weekly') {
      const billDate = new Date(bill.createdAt)
      const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff > 7
    }
    if (bill.frequency === 'Yearly') {
      const billDate = new Date(bill.createdAt)
      const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff > 365
    }
    return false
  }

  const handlePayBill = async (bill: Bill) => {
    if (!bill.budgetCategoryId) {
      alert('This bill must be assigned to a budget category before it can be paid.')
      return
    }

    if (!confirm(`Are you sure you want to mark ${bill.title} as paid for $${bill.amount.toFixed(2)}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchBills()
        alert('Bill marked as paid!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to pay bill')
      }
    } catch (error) {
      alert('Failed to pay bill')
    }
  }

  if (userLoading || (isLoading && isInitialLoad)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {userLoading ? 'Loading user...' : 'Loading bills...'}
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to view your bills.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="bills" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills</h1>
          <button
            onClick={() => {
              setShowForm(true)
              // Scroll to top to show the form
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </button>
        </div>

        {/* Search by bill name or type and autopay */}
        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="bill-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search by name
            </label>
            <div className="relative">
              <input
                id="bill-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                aria-label="Search bills by name"
                placeholder="e.g. Rent, Electric"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <label htmlFor="bill-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bill type
            </label>
            <select
              id="bill-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All types</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
            <label htmlFor="is-autopay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Autopay
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is-autopay"
                checked={filterAutopay}
                onChange={() => setFilterAutopay(!filterAutopay)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        {/*Bill Total */}
        {filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{bills.length === 0 ? 'No bills yet' : 'No matching bills'}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{bills.length === 0 ? 'Get started by adding your first bill' : 'Try a different search or filter'}</p>
              <button
                onClick={() => {
                  setShowForm(true)
                  // Scroll to top to show the form
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Bill
              </button>
            </div>
          ) : (
          <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 flex flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 col-sm">
                Monthly Bill Total :
                <p className="text-3xl font-bold text-gray-900 dark:text-white">${filteredBills.reduce((total, bill) => total + (bill.frequency === 'Monthly' ? bill.amount : 0), 0).toFixed(2)}</p>
              </h2>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 col-sm">
                Today&apos;s Date:
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{new Date().toLocaleDateString()}</p>
              </h2>
            </div>
          </div>
          )}
        {/*Edit Bill Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingBill ? 'Edit Bill' : 'Add New Bill'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.title ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...register('amount', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        errors.amount ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="dayDue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Day Due
                  </label>
                  <input
                    {...register('dayDue', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    max="31"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.dayDue ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {errors.dayDue && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dayDue.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Frequency
                  </label>
                  <select
                    {...register('frequency')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.frequency ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                  {errors.frequency && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.frequency.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="budgetCategoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Budget Category (Optional)
                  </label>
                  <select
                    {...register('budgetCategoryId')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.budgetCategoryId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">No Budget Category</option>
                    {budgetCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title} (Limit: ${category.limit.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {errors.budgetCategoryId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.budgetCategoryId.message}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    {...register('isAutopay')}
                    id="isAutopay"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="isAutopay" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Is Autopay
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingBill ? 'Update Bill' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bills List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{bills.length === 0 ? 'No bills yet' : 'No matching bills'}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{bills.length === 0 ? 'Get started by adding your first bill' : 'Try a different search or filter'}</p>
              {bills.length === 0 && (
              <button
                onClick={() => {
                  setShowForm(true)
                  // Scroll to top to show the form
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Bill
              </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBills.map((bill) => (
                <div key={bill.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">{bill.title}</h3>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="flex items-center whitespace-nowrap">
                            {/*<DollarSign className="h-4 w-4 mr-1 flex-shrink-0" />*/}
                            ${bill.amount.toFixed(2)}
                          </span>
                          <span className="flex items-center whitespace-nowrap">
                            <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                          {bill.dayDue}{
                          bill.dayDue === 1 ? 'st' : 
                          bill.dayDue === 2 ? 'nd' : 
                          bill.dayDue === 3 ? 'rd' : 
                          bill.dayDue === 21 ? 'st' :
                          bill.dayDue === 22 ? 'nd' :
                          bill.dayDue === 23 ? 'rd' :
                          bill.dayDue === 31 ? 'st' :
                          'th'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:gap-4">
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {bill.frequency}
                          </span>
                          {bill.budgetCategory && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-600 rounded-full text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
                              {bill.budgetCategory.title}
                            </span>
                          )}
                          {displayAsPaid(bill) && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-600 rounded-full text-xs text-green-700 dark:text-green-300 whitespace-nowrap">
                              Paid
                            </span>
                          )}
                          {!bill.isPaid && isBillLate(bill) && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-600 rounded-full text-xs text-red-700 dark:text-red-300 whitespace-nowrap">
                              Late
                            </span>
                          )}
                          {bill.isAutopay && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-600 rounded-full text-xs text-yellow-700 dark:text-yellow-300 whitespace-nowrap">
                              Autopay
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end sm:justify-start space-x-2 flex-shrink-0">
                      {bill.budgetCategoryId && !bill.isPaid && !bill.isAutopay && !displayAsPaid(bill) && (
                        <button
                          onClick={() => handlePayBill(bill)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400"
                          title="Pay Bill"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(bill)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Edit Bill"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Bill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
