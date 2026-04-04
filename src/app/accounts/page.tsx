'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import {
  accountSchema,
  expenditureSchema,
  accountTransactionSchema,
  accountTransferSchema,
  AccountInput,
  ExpenditureInput,
  AccountTransactionInput,
  AccountTransferInput,
} from '@/lib/validations'
import { cn } from '@/lib/utils'
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  CreditCard,
  TrendingDown,
  Star,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
} from 'lucide-react'
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
  roundUpOnExpenditure?: boolean
  doesRoundupSave?: boolean
  createdAt: string
  updatedAt: string
  accountTransactions: AccountTransaction[]
  budgetCategories: BudgetCategory[]
}

interface AccountTransaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'transfer_out' | 'transfer_in'
  amount: number
  description: string
  counterpartyAccountId?: string | null
  transferPairId?: string | null
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
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transactionTargetAccountId, setTransactionTargetAccountId] = useState('')
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [isSubmittingTransaction, setIsSubmittingTransaction] = useState(false)
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [roundupSelect, setRoundupSelect] = useState('')
  const [roundupSaving, setRoundupSaving] = useState(false)

  const accountForm = useForm<AccountInput>({
    resolver: zodResolver(accountSchema) as Resolver<AccountInput>,
    defaultValues: {
      balance: 0,
      isMain: false,
      roundUpOnExpenditure: false,
      doesRoundupSave: false,
    },
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

  const transferForm = useForm<AccountTransferInput>({
    resolver: zodResolver(accountTransferSchema),
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      description: '',
    },
  })

  const fetchRoundupSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user/roundup-settings')
      if (response.ok) {
        const data = await response.json()
        setRoundupSelect(data.roundupSavingsAccountId ?? '')
      }
    } catch {
      setRoundupSelect('')
    }
  }, [])

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
      fetchRoundupSettings()
    }
  }, [user, userLoading, fetchCategories, fetchRoundupSettings])

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
      roundUpOnExpenditure: Boolean(account.roundUpOnExpenditure),
      doesRoundupSave: Boolean(account.doesRoundupSave),
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

  const openDeposit = () => {
    if (accounts.length === 0) {
      alert('Add an account first.')
      return
    }
    setTransactionType('deposit')
    setTransactionTargetAccountId(accounts[0].id)
    transactionForm.reset({ type: 'deposit', amount: 0, description: '' })
    setShowTransactionForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openWithdraw = () => {
    if (accounts.length === 0) {
      alert('Add an account first.')
      return
    }
    setTransactionType('withdrawal')
    setTransactionTargetAccountId(accounts[0].id)
    transactionForm.reset({ type: 'withdrawal', amount: 0, description: '' })
    setShowTransactionForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openAddExpenditure = () => {
    expenditureForm.reset({
      title: '',
      amount: 0,
      categoryId: '',
      accountId: '',
      createdAt: new Date().toISOString().slice(0, 10),
    })
    setShowExpenditureForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openTransfer = () => {
    if (accounts.length < 2) {
      alert('You need at least two accounts to transfer.')
      return
    }
    transferForm.reset({
      fromAccountId: accounts[0].id,
      toAccountId: accounts[1].id,
      amount: 0,
      description: '',
    })
    setShowTransferForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onTransactionSubmit = async (data: AccountTransactionInput) => {
    if (!transactionTargetAccountId) {
      alert('Choose an account.')
      return
    }
    setIsSubmittingTransaction(true)
    try {
      const response = await fetch(`/api/accounts/${transactionTargetAccountId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: transactionType, amount: data.amount, description: data.description }),
      })
      if (response.ok) {
        await fetchAccounts()
        transactionForm.reset({ type: transactionType, amount: 0, description: '' })
        setShowTransactionForm(false)
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

  const onTransferSubmit = async (data: AccountTransferInput) => {
    setIsSubmittingTransfer(true)
    try {
      const response = await fetch('/api/account-transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          description: data.description?.trim() || undefined,
        }),
      })
      if (response.ok) {
        await fetchAccounts()
        transferForm.reset({
          fromAccountId: accounts[0]?.id ?? '',
          toAccountId: accounts[1]?.id ?? '',
          amount: 0,
          description: '',
        })
        setShowTransferForm(false)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err?.error ?? 'Failed to transfer')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to transfer. Please try again.')
    } finally {
      setIsSubmittingTransfer(false)
    }
  }

  const saveRoundupDestination = async () => {
    setRoundupSaving(true)
    try {
      const response = await fetch('/api/user/roundup-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundupSavingsAccountId: roundupSelect === '' ? null : roundupSelect,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert(err?.error ?? 'Failed to save round-up settings')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save round-up settings.')
    } finally {
      setRoundupSaving(false)
    }
  }

  const accountNameById = (id: string | null | undefined) =>
    accounts.find((a) => a.id === id)?.name ?? 'Account'

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
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
            <button
              type="button"
              onClick={() => {
                setEditingAccount(null)
                accountForm.reset({
                  name: '',
                  type: 'checking',
                  balance: 0,
                  isMain: false,
                  roundUpOnExpenditure: false,
                  doesRoundupSave: false,
                })
                setShowAccountForm(true)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </button>
          </div>
          {accounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openDeposit}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center text-sm"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Deposit
              </button>
              <button
                type="button"
                onClick={openWithdraw}
                className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 flex items-center text-sm"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Withdraw
              </button>
              <button
                type="button"
                onClick={openAddExpenditure}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add expenditure
              </button>
              <button
                type="button"
                onClick={openTransfer}
                className="bg-slate-600 text-white px-4 py-2 rounded-md hover:bg-slate-700 flex items-center text-sm"
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Transfer
              </button>
            </div>
          )}
          {accounts.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Round-up savings destination</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                When you record spending from an account with “Round up spending” enabled, spare change is moved here (see account settings below).
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1">
                  <label htmlFor="roundup-destination" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Savings account
                  </label>
                  <select
                    id="roundup-destination"
                    value={roundupSelect}
                    onChange={(e) => setRoundupSelect(e.target.value)}
                    className="block w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="">None</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={saveRoundupDestination}
                  disabled={roundupSaving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
                >
                  {roundupSaving ? 'Saving…' : 'Save destination'}
                </button>
              </div>
            </div>
          )}
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

                <div className="md:col-span-2 space-y-2 rounded-md border border-gray-200 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-900/40">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Round-up savings</p>
                  <div className="flex items-start gap-2">
                    <input
                      {...accountForm.register('roundUpOnExpenditure')}
                      type="checkbox"
                      id="roundUpOnExpenditure"
                      className="h-4 w-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="roundUpOnExpenditure" className="text-sm text-gray-700 dark:text-gray-300">
                      Round up spending from this account to the next dollar (requires a savings destination above).
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      {...accountForm.register('doesRoundupSave')}
                      type="checkbox"
                      id="doesRoundupSave"
                      className="h-4 w-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="doesRoundupSave" className="text-sm text-gray-700 dark:text-gray-300">
                      Debit round-up spare change from this account (only one account per user; if unset, the spending account is debited).
                    </label>
                  </div>
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
        {showExpenditureForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add expenditure</h2>
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
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  Add expenditure
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Deposit / Withdraw form */}
        {showTransactionForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {transactionType === 'deposit' ? 'Deposit' : 'Withdraw'}
            </h2>
            <form onSubmit={transactionForm.handleSubmit(onTransactionSubmit)} className="space-y-4">
              <input type="hidden" {...transactionForm.register('type')} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="tx-account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account
                  </label>
                  <select
                    id="tx-account"
                    value={transactionTargetAccountId}
                    onChange={(e) => setTransactionTargetAccountId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}){acc.isMain ? ' – Primary' : ''}
                      </option>
                    ))}
                  </select>
                </div>
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

        {showTransferForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Transfer between accounts</h2>
            <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="xfer-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    From
                  </label>
                  <select
                    id="xfer-from"
                    {...transferForm.register('fromAccountId')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      transferForm.formState.errors.fromAccountId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="xfer-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    To
                  </label>
                  <select
                    id="xfer-to"
                    {...transferForm.register('toAccountId')}
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      transferForm.formState.errors.toAccountId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="xfer-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...transferForm.register('amount', { valueAsNumber: true })}
                      id="xfer-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      className={cn(
                        'block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                        transferForm.formState.errors.amount ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      )}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="xfer-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Note (optional)
                  </label>
                  <input
                    {...transferForm.register('description')}
                    id="xfer-note"
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSubmittingTransfer ? 'Transferring…' : 'Transfer'}
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

                <div className="space-y-2 mt-4">
                  {account.accountTransactions && account.accountTransactions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent activity</h4>
                      <div className="space-y-1">
                        {account.accountTransactions?.slice(0, 5).map((transaction) => {
                          const cp = transaction.counterpartyAccountId
                          const isOut = transaction.type === 'transfer_out'
                          const isIn = transaction.type === 'transfer_in'
                          const label = isOut
                            ? `Transfer → ${accountNameById(cp)}`
                            : isIn
                              ? `Transfer ← ${accountNameById(cp)}`
                              : transaction.description.replace(/^Expenditure:\s*/i, '').trim() || transaction.description
                          const isCredit =
                            transaction.type === 'deposit' || transaction.type === 'transfer_in'
                          return (
                            <div key={transaction.id} className="flex items-center justify-between gap-2 text-sm min-w-0">
                              <div className="flex items-center space-x-2 min-w-0 overflow-hidden">
                                {isIn ? (
                                  <ArrowDownCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : isOut ? (
                                  <ArrowLeftRight className="h-3 w-3 text-slate-500 flex-shrink-0" />
                                ) : transaction.type === 'deposit' ? (
                                  <ArrowDownCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                                )}
                                <span className="text-gray-600 dark:text-gray-400 truncate">{label}</span>
                              </div>
                              <span
                                className={`font-medium flex-shrink-0 ${
                                  isCredit
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isCredit ? '+' : '-'}${transaction.amount.toFixed(2)}
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
