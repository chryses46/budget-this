'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { accountSchema, accountTransactionSchema, AccountInput, AccountTransactionInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { Plus, Edit, Trash2, DollarSign, CreditCard, TrendingUp, TrendingDown, Star } from 'lucide-react'
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
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const accountForm = useForm({
    resolver: zodResolver(accountSchema),
  })

  const transactionForm = useForm<AccountTransactionInput>({
    resolver: zodResolver(accountTransactionSchema),
  })

  useEffect(() => {
    if (user && !userLoading) {
      fetchAccounts()
    }
  }, [user, userLoading])

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
    } finally {
      setIsLoading(false)
    }
  }

  const onAccountSubmit = async (data: any) => {
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
        }
      }
      
      accountForm.reset()
      setShowAccountForm(false)
      setEditingAccount(null)
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }

  const onTransactionSubmit = async (data: AccountTransactionInput) => {
    if (!selectedAccount) return

    try {
      const response = await fetch(`/api/accounts/${selectedAccount.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        // Refresh accounts to get updated balances
        fetchAccounts()
        transactionForm.reset()
        setShowTransactionForm(false)
        setSelectedAccount(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create transaction')
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    accountForm.reset(account)
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

  const handleAddTransaction = (account: Account) => {
    setSelectedAccount(account)
    transactionForm.reset()
    setShowTransactionForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingAccount ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transaction Form */}
        {showTransactionForm && selectedAccount && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add Transaction - {selectedAccount.name}
            </h2>
            <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Transaction Type
                  </label>
                  <select
                    {...transactionForm.register('type')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      transactionForm.formState.errors.type ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                  {transactionForm.formState.errors.type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{transactionForm.formState.errors.type.message}</p>
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
                      {...transactionForm.register('amount', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
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

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    {...transactionForm.register('description')}
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
                    setSelectedAccount(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Add Transaction
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
                    onClick={() => handleAddTransaction(account)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </button>
                  
                  {account.accountTransactions && account.accountTransactions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent Transactions</h4>
                      <div className="space-y-1">
                        {account.accountTransactions?.slice(0, 3).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              {transaction.type === 'deposit' ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-gray-600 dark:text-gray-400 truncate">
                                {transaction.description}
                              </span>
                            </div>
                            <span className={`font-medium ${
                              transaction.type === 'deposit' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
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
