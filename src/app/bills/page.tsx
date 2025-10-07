'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { billSchema, BillInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { Plus, Edit, Trash2, Calendar, DollarSign, CheckCircle } from 'lucide-react'
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BillInput>({
    resolver: zodResolver(billSchema),
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
    }
  }

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
          const updatedBill = await response.json()
          setBills(bills.map(bill => 
            bill.id === editingBill.id ? updatedBill : bill
          ))
        } else {
        }
      } else {
        // Create new bill
        const response = await fetch('/api/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          const newBill = await response.json()
          setBills([...bills, newBill])
        } else {
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
        setBills(bills.filter(bill => bill.id !== id))
      } else {
      }
    } catch (error) {
    }
  }

  const handleCancel = () => {
    reset()
    setShowForm(false)
    setEditingBill(null)
  }

  const isBillLate = (bill: Bill) => {
    if (bill.isPaid) return false
    
    const today = new Date()
    const currentDay = today.getDate()
    
    // For monthly bills, check if we're past the due day this month
    if (bill.frequency === 'Monthly') {
      return currentDay > bill.dayDue
    }
    
    // For weekly bills, check if it's been more than 7 days since creation
    if (bill.frequency === 'Weekly') {
      const billDate = new Date(bill.createdAt)
      const daysDiff = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff > 7
    }
    
    // For yearly bills, check if it's been more than 365 days since creation
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
        // Update the bill in the local state
        setBills(bills.map(b => 
          b.id === bill.id 
            ? { ...b, isPaid: true, paidAt: new Date().toISOString() }
            : b
        ))
        alert('Bill marked as paid!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to pay bill')
      }
    } catch (error) {
      alert('Failed to pay bill')
    }
  }

  if (userLoading || isLoading) {
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

        {/*Bill Total */}
        {bills.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bills yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first bill</p>
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
          <div className="text-center bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Monthly Bill Total :
              <p className="text-3xl font-bold text-gray-900 dark:text-white">${bills.reduce((total, bill) => total + (bill.frequency === 'Monthly' ? bill.amount : 0), 0).toFixed(2)}</p>
            </h2>
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
          {bills.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bills yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first bill</p>
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
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {bills.map((bill) => (
                <div key={bill.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{bill.title}</h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          ${bill.amount.toFixed(2)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Due on the {bill.dayDue}{
                        bill.dayDue === 1 ? 'st' : 
                        bill.dayDue === 2 ? 'nd' : 
                        bill.dayDue === 3 ? 'rd' : 
                        bill.dayDue === 21 ? 'st' :
                        bill.dayDue === 22 ? 'nd' :
                        bill.dayDue === 23 ? 'rd' :
                        bill.dayDue === 31 ? 'st' :
                        'th'}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-xs text-gray-700 dark:text-gray-300">
                          {bill.frequency}
                        </span>
                        {bill.budgetCategory && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-600 rounded-full text-xs text-blue-700 dark:text-blue-300">
                            {bill.budgetCategory.title}
                          </span>
                        )}
                        {bill.isPaid && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-600 rounded-full text-xs text-green-700 dark:text-green-300">
                            Paid
                          </span>
                        )}
                        {!bill.isPaid && isBillLate(bill) && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-600 rounded-full text-xs text-red-700 dark:text-red-300">
                            Late
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {bill.budgetCategoryId && !bill.isPaid && (
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
