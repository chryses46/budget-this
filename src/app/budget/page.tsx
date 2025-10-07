'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { budgetCategorySchema, expenditureSchema, BudgetCategoryInput, ExpenditureInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { Plus, Edit, Trash2, DollarSign, PieChart } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'

interface Bill {
  id: string
  title: string
  amount: number
  dayDue: number
  frequency: 'Weekly' | 'Monthly' | 'Yearly'
  budgetCategoryId?: string
  isPaid: boolean
  paidAt?: string
  createdAt: string
  updatedAt: string
}

interface BudgetCategory {
  id: string
  title: string
  limit: number
  accountId?: string
  account?: {
    id: string
    name: string
    type: string
    balance: number
  }
  createdAt: string
  updatedAt: string
  expenditures: Expenditure[]
  bills: Bill[]
}

interface Expenditure {
  id: string
  title: string
  amount: number
  categoryId: string
  createdAt: string
  updatedAt: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

export default function BudgetPage() {
  const { user, isLoading: userLoading } = useUser()
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showExpenditureForm, setShowExpenditureForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [editingExpenditure, setEditingExpenditure] = useState<Expenditure | null>(null)

  const categoryForm = useForm<BudgetCategoryInput>({
    resolver: zodResolver(budgetCategorySchema),
  })

  const expenditureForm = useForm<ExpenditureInput>({
    resolver: zodResolver(expenditureSchema),
  })

  useEffect(() => {
    if (user && !userLoading) {
      fetchCategories()
      fetchAccounts()
    }
  }, [user, userLoading])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/budget-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        setCategories([])
      }
    } catch (error) {
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      } else {
        setAccounts([])
      }
    } catch (error) {
      setAccounts([])
    }
  }

  const onCategorySubmit = async (data: BudgetCategoryInput) => {
    try {
      if (editingCategory) {
        // Update existing category
        const response = await fetch(`/api/budget-categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          const updatedCategory = await response.json()
          setCategories(categories.map(cat => 
            cat.id === editingCategory.id ? updatedCategory : cat
          ))
        } else {
        }
      } else {
        // Create new category
        const response = await fetch('/api/budget-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          const newCategory = await response.json()
          setCategories([...categories, newCategory])
        } else {
        }
      }
      
      categoryForm.reset()
      setShowCategoryForm(false)
      setEditingCategory(null)
    } catch (error) {
    }
  }

  const onExpenditureSubmit = async (data: ExpenditureInput) => {
    try {
      if (editingExpenditure) {
        // Update existing expenditure
        const response = await fetch(`/api/expenditures/${editingExpenditure.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          const updatedExpenditure = await response.json()
          setCategories(categories.map(cat => ({
            ...cat,
            expenditures: cat.expenditures.map(exp => 
              exp.id === editingExpenditure.id ? updatedExpenditure : exp
            )
          })))
        } else {
        }
      } else {
        // Create new expenditure
        const response = await fetch('/api/expenditures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        
        if (response.ok) {
          const newExpenditure = await response.json()
          setCategories(categories.map(cat => 
            cat.id === data.categoryId 
              ? { ...cat, expenditures: [...cat.expenditures, newExpenditure] }
              : cat
          ))
        } else {
        }
      }
      
      expenditureForm.reset()
      setShowExpenditureForm(false)
      setEditingExpenditure(null)
    } catch (error) {
    }
  }

  const handleEditCategory = (category: BudgetCategory) => {
    setEditingCategory(category)
    categoryForm.reset(category)
    setShowCategoryForm(true)
    // Scroll to top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditExpenditure = (expenditure: Expenditure) => {
    setEditingExpenditure(expenditure)
    expenditureForm.reset(expenditure)
    setShowExpenditureForm(true)
    // Scroll to top of the page to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all expenditures in this category.')) return
    
    try {
      const response = await fetch(`/api/budget-categories/${id}`, { method: 'DELETE' })
      
      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== id))
      } else {
      }
    } catch (error) {
    }
  }

  const handleDeleteExpenditure = async (categoryId: string, expenditureId: string) => {
    if (!confirm('Are you sure you want to delete this expenditure?')) return
    
    try {
      const response = await fetch(`/api/expenditures/${expenditureId}`, { method: 'DELETE' })
      
      if (response.ok) {
        setCategories(categories.map(cat => 
          cat.id === categoryId 
            ? { ...cat, expenditures: cat.expenditures.filter(exp => exp.id !== expenditureId) }
            : cat
        ))
      } else {
      }
    } catch (error) {
    }
  }

  const getTotalSpent = (category: BudgetCategory) => {
    const expenditureTotal = (category.expenditures || []).reduce((sum, exp) => sum + exp.amount, 0)
    const paidBillTotal = (category.bills || []).filter(bill => bill.isPaid).reduce((sum, bill) => sum + bill.amount, 0)
    return expenditureTotal + paidBillTotal
  }

  const getRemainingBudget = (category: BudgetCategory) => {
    return category.limit - getTotalSpent(category)
  }

  const isBillLate = (bill: Bill) => {
    if (bill.isPaid) return false
    
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
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
    if (!confirm(`Are you sure you want to mark "${bill.title}" as paid for $${bill.amount.toFixed(2)}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update the bill in the local state
        setCategories(categories.map(cat => ({
          ...cat,
          bills: cat.bills.map(b => 
            b.id === bill.id 
              ? { ...b, isPaid: true, paidAt: new Date().toISOString() }
              : b
          )
        })))
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
            {userLoading ? 'Loading user...' : 'Loading budget...'}
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to view your budget.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="budget" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Add Buttons */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowCategoryForm(true)
                // Scroll to top to show the form
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
            {categories.length > 0 && (
              <button
                onClick={() => {
                  setShowExpenditureForm(true)
                  // Scroll to top to show the form
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expenditure
              </button>
            )}
          </div>
        </div>

        {/* Category Form */}
        {showCategoryForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category Name
                  </label>
                  <input
                    {...categoryForm.register('title')}
                    type="text"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      categoryForm.formState.errors.title ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {categoryForm.formState.errors.title && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{categoryForm.formState.errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Budget Limit
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...categoryForm.register('limit', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        categoryForm.formState.errors.limit ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {categoryForm.formState.errors.limit && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{categoryForm.formState.errors.limit.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Linked Account (Optional)
                  </label>
                  <select
                    {...categoryForm.register('accountId')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      categoryForm.formState.errors.accountId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">No Account Linked</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type}) - ${account.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {categoryForm.formState.errors.accountId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{categoryForm.formState.errors.accountId.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    categoryForm.reset()
                    setShowCategoryForm(false)
                    setEditingCategory(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenditure Form */}
        {showExpenditureForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingExpenditure ? 'Edit Expenditure' : 'Add New Expenditure'}
            </h2>
            <form onSubmit={expenditureForm.handleSubmit(onExpenditureSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    {...expenditureForm.register('title')}
                    type="text"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.title ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {expenditureForm.formState.errors.title && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.title.message}</p>
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
                      {...expenditureForm.register('amount', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        expenditureForm.formState.errors.amount ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {expenditureForm.formState.errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.amount.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    {...expenditureForm.register('categoryId')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.categoryId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.title}
                      </option>
                    ))}
                  </select>
                  {expenditureForm.formState.errors.categoryId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.categoryId.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    expenditureForm.reset()
                    setShowExpenditureForm(false)
                    setEditingExpenditure(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {editingExpenditure ? 'Update Expenditure' : 'Add Expenditure'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <PieChart className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budget categories yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first budget category</p>
            <button
              onClick={() => {
                setShowCategoryForm(true)
                // Scroll to top to show the form
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Category
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => {
              const totalSpent = getTotalSpent(category)
              const remaining = getRemainingBudget(category)
              const percentage = (totalSpent / category.limit) * 100

              return (
                <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{category.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ${totalSpent.toFixed(2)} of ${category.limit.toFixed(2)} spent
                          {(category.expenditures?.length > 0 || category.bills?.length > 0) && (
                            <span className="ml-2 text-xs">
                              ({category.expenditures?.length || 0} expenditures, {category.bills?.length || 0} bills)
                            </span>
                          )}
                          {category.account && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                              • Linked to {category.account.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>Remaining: ${remaining.toFixed(2)}</span>
                        {percentage > 100 && (
                          <span className="text-red-600 dark:text-red-400">Over budget!</span>
                        )}
                      </div>
                    </div>

                    {/* Expenditures */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Expenditures</h4>
                        <button
                          onClick={() => {
                            expenditureForm.setValue('categoryId', category.id)
                            setShowExpenditureForm(true)
                            // Scroll to top to show the form
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Expenditure
                        </button>
                      </div>

                      {(category.expenditures || []).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No expenditures yet</p>
                      ) : (
                        <div className="space-y-2">
                          {(category.expenditures || []).map((expenditure) => (
                            <div key={expenditure.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                              <div>
                                <span className="text-gray-900 dark:text-white">{expenditure.title}</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(expenditure.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 dark:text-white">${expenditure.amount.toFixed(2)}</span>
                                <button
                                  onClick={() => handleEditExpenditure(expenditure)}
                                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpenditure(category.id, expenditure.id)}
                                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bills */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">Bills</h4>
                      </div>

                      {(category.bills || []).length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No bills assigned to this category</p>
                      ) : (
                        <div className="space-y-2">
                          {(category.bills || []).map((bill) => {
                            const isLate = isBillLate(bill)
                            const isPaid = bill.isPaid
                            
                            return (
                              <div key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-gray-900 dark:text-white">{bill.title}</span>
                                    {isPaid && (
                                      <span className="px-2 py-1 bg-green-100 dark:bg-green-600 rounded-full text-xs text-green-700 dark:text-green-300">
                                        Paid
                                      </span>
                                    )}
                                    {isLate && !isPaid && (
                                      <span className="px-2 py-1 bg-red-100 dark:bg-red-600 rounded-full text-xs text-red-700 dark:text-red-300">
                                        Late
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Due on {bill.dayDue} • {bill.frequency}
                                    {isPaid && bill.paidAt && (
                                      <span className="ml-2">
                                        • Paid on {new Date(bill.paidAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 dark:text-white">${bill.amount.toFixed(2)}</span>
                                  {!isPaid && (
                                    <button
                                      onClick={() => handlePayBill(bill)}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700"
                                    >
                                      Pay
                                    </button>
                                  )}
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-600 rounded-full text-xs text-blue-700 dark:text-blue-300">
                                    Bill
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
