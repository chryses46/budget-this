'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { accountSchema, expenditureSchema, accountTransactionSchema, AccountInput, ExpenditureInput, AccountTransactionInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { Plus, Edit, Trash2, DollarSign, CreditCard, TrendingDown, Star, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'

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
  accountTransactions: AccountTransaction[]
  budgetCategories: BudgetCategory[]
}

interface AccountTransaction {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  description: string
  createdAt: string
  updatedAt: string
}

interface BudgetCategory {
  id: string
  title: string
  limit: number
}

export default function AccountsPage() {
  const { user, isLoading: userLoading } = useUser()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showExpenditureForm, setShowExpenditureForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [transactionAccount, setTransactionAccount] = useState<Account | null>(null)
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)
  const [categories, setCategories] = useState<BudgetCategory[]>([])

  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
  })

  const expenditureForm = useForm({
    resolver: zodResolver(expenditureSchema),
    defaultValues: {
      title: '',
      amount: 0,
      categoryId: '',
      accountId: '',
      createdAt: new Date().toISOString().slice(0, 10)
    }
  })

  const transactionForm = useForm<AccountTransactionInput>({
    resolver: zodResolver(accountTransactionSchema),
    defaultValues: {
      type: 'deposit',
      amount: 0,
      description: '',
    },
  })

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/budget-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        setCategories([])
      }
    } catch {
      setCategories([])
    }
  }, [])

  useEffect(() => {
    if (user && !userLoading) {
      fetchAccounts()
      fetchCategories()
    }
  }, [user, userLoading, fetchCategories])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      } else {
        setAccounts([])
      }
    } catch {
      setAccounts([])
    } finally {
      setIsLoading(false)
    }
  }

  const onAccountSubmit = async (data: AccountInput) => {
    setIsSubmittingAccount(true)
    try {
      if (editingAccount) {
        // Update existing account
        const response = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const updatedAccount = await response.json()
          setAccounts(accounts.map(acc =>
            acc.id === editingAccount.id ? updatedAccount : acc
          ))
          accountForm.reset()
          setShowAccountForm(false)
          setEditingAccount(null)
        } else {
          const error = await response.json().catch(() => ({}))
          alert(error?.error || 'Failed to save account')
        }
      } else {
        // Create new account
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const newAccount = await response.json()
          setAccounts([...accounts, newAccount])
          accountForm.reset()
          setShowAccountForm(false)
          setEditingAccount(null)
        } else {
          const error = await response.json().catch(() => ({}))
          alert(error?.error || 'Failed to save account')
        }
      }
    } catch (error) {
      console.error('Error saving account:', error)
      alert('Failed to save account. Please try again.')
    } finally {
      setIsSubmittingAccount(false)
    }
  }

  const onExpenditureSubmit = async (data: ExpenditureInput) => {
    try {
      const payload: Record<string, unknown> = { title: data.title, amount: data.amount, categoryId: data.categoryId }
      if (data.accountId) payload.accountId = data.accountId
      if (data.createdAt) {
        payload.createdAt = new Date(data.createdAt + 'T12:00:00.000Z').toISOString()
      }
      const response = await fetch('/api/expenditures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        fetchAccounts()
        expenditureForm.reset({ title: '', amount: 0, categoryId: '', accountId: '', createdAt: new Date().toISOString().slice(0, 10) })
        setShowExpenditureForm(false)
        setSelectedAccount(null)
      } else {
        const err = await response.json()
        alert(err.error || 'Failed to create expenditure')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save expenditure')
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    accountForm.reset({
      name: account.name,
      type: account.type,
      balance: Number(account.balance),
      isMain: Boolean(account.isMain),
    })
    setShowAccountForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all transactions.')) return
    
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      
      if (response.ok) {
        setAccounts(accounts.filter(acc => acc.id !== id))
      }
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const handleAddExpenditure = (account: Account) => {
    setSelectedAccount(account)
    expenditureForm.reset({
      title: '',
      amount: 0,
      categoryId: '',
      accountId: account.id,
      createdAt: new Date().toISOString().slice(0, 10)
    })
    setShowExpenditureForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeposit = (account: Account) => {
    setTransactionAccount(account)
    setTransactionType('deposit')
    transactionForm.reset({ type: 'deposit', amount: 0, description: '' })
    setShowTransactionForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleWithdraw = (account: Account) => {
    setTransactionAccount(account)
    setTransactionType('withdrawal')
    transactionForm.reset({ type: 'withdrawal', amount: 0, description: '' })
    setShowTransactionForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onTransactionSubmit = async (data: AccountTransactionInput) => {
    if (!transactionAccount) return
    setIsSubmittingTransaction(true)
    try {
      const response = await fetch(`/api/accounts/${transactionAccount.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: transactionType, amount: data.amount, description: data.description }),
      })
      if (response.ok) {
        await fetchAccounts()
        transactionForm.reset({ type: transactionType, amount: 0, description: '' })
        setShowTransactionForm(false)
        setTransactionAccount(null)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err?.error ?? 'Failed to create transaction')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to create transaction. Please try again.')
    } finally {
      setIsSubmittingTransaction(false)
    }
  }

  const expenditureCategories = categories

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {userLoading ? 'Loading user...' : 'Loading accounts...'}
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to view your accounts.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="accounts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <button
            onClick={() => {
              setShowAccountForm(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>

        {/* Account Form */}
        {showAccountForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </h2>
            <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Name
                  </label>
                  <input
                    {...accountForm.register('name')}
                    type="text"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      accountForm.formState.errors.name ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {accountForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{accountForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Type
                  </label>
                  <select
                    {...accountForm.register('type')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      accountForm.formState.errors.type ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="cash">Cash</option>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="credit">Credit Card</option>
                    <option value="investment">Investment</option>
                  </select>
                  {accountForm.formState.errors.type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{accountForm.formState.errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Initial Balance
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...accountForm.register('balance', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        accountForm.formState.errors.balance ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {accountForm.formState.errors.balance && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{accountForm.formState.errors.balance.message}</p>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    {...accountForm.register('isMain')}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isMain" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Set as main account
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    accountForm.reset()
                    setShowAccountForm(false)
                    setEditingAccount(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingAccount
                    ? editingAccount
                      ? 'Updating…'
                      : 'Adding…'
                    : editingAccount
                      ? 'Update Account'
                      : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Expenditure modal (same as Expenditures page) */}
        {showExpenditureForm && selectedAccount && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add New Expenditure – {selectedAccount.name}
            </h2>
            <form onSubmit={expenditureForm.handleSubmit(onExpenditureSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="acc-exp-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    {...expenditureForm.register('title')}
                    id="acc-exp-title"
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
                  <label htmlFor="acc-exp-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...expenditureForm.register('amount', { valueAsNumber: true })}
                      id="acc-exp-amount"
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
                <div>
                  <label htmlFor="acc-exp-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    {...expenditureForm.register('createdAt')}
                    id="acc-exp-date"
                    type="date"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.createdAt ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {expenditureForm.formState.errors.createdAt && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.createdAt.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="acc-exp-categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    {...expenditureForm.register('categoryId')}
                    id="acc-exp-categoryId"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.categoryId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select a category</option>
                    {expenditureCategories.map((cat: BudgetCategory) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                  {expenditureForm.formState.errors.categoryId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.categoryId.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="acc-exp-accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account (optional)
                  </label>
                  <select
                    {...expenditureForm.register('accountId')}
                    id="acc-exp-accountId"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.accountId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">Default (Primary)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}){acc.isMain ? ' – Primary' : ''}
                      </option>
                    ))}
                  </select>
                  {expenditureForm.formState.errors.accountId && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{expenditureForm.formState.errors.accountId.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    expenditureForm.reset()
                    setShowExpenditureForm(false)
                    setSelectedAccount(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  Add Expenditure
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Deposit / Withdraw form */}
        {showTransactionForm && transactionAccount && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {transactionType === 'deposit' ? 'Deposit to' : 'Withdraw from'} – {transactionAccount.name}
            </h2>
            <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
              <input type="hidden" {...transactionForm.register('type')} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tx-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...transactionForm.register('amount', { valueAsNumber: true })}
                      id="tx-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        transactionForm.formState.errors.amount ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {transactionForm.formState.errors.amount && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transactionForm.formState.errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="tx-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    {...transactionForm.register('description')}
                    id="tx-description"
                    type="text"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      transactionForm.formState.errors.description ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {transactionForm.formState.errors.description && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transactionForm.formState.errors.description.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    transactionForm.reset()
                    setShowTransactionForm(false)
                    setTransactionAccount(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransaction}
                  className={cn(
                    'px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed',
                    transactionType === 'deposit'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  )}
                >
                  {isSubmittingTransaction ? 'Submitting…' : transactionType === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No accounts yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first account</p>
            <button
              onClick={() => {
                setShowAccountForm(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{account.name}</h3>
                    {account.isMain && (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                      title="Edit Account"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{account.type}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${account.balance.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleDeposit(account)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Deposit
                  </button>
                  <button
                    onClick={() => handleWithdraw(account)}
                    className="w-full bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 flex items-center justify-center"
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Withdraw
                  </button>
                  <button
                    onClick={() => handleAddExpenditure(account)}
                    className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expenditure
                  </button>
                  
                  {account.accountTransactions && account.accountTransactions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent activity</h4>
                      <div className="space-y-1">
                        {account.accountTransactions?.slice(0, 3).map((transaction) => {
                          const label = transaction.description.replace(/^Expenditure:\s*/i, '').trim() || transaction.description
                          return (
                            <div key={transaction.id} className="flex items-center justify-between gap-2 text-sm min-w-0">
                              <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
                                {transaction.type === 'deposit' ? null : (
                                  <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-gray-600 dark:text-gray-400 truncate">
                                  {label}
                                </span>
                              </div>
                              <span className={`font-medium flex-shrink-0 ${
                                transaction.type === 'deposit'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
        )}
      </main>
    </div>
  )
}
