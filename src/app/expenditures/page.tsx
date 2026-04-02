'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, Receipt, ChevronLeft, ChevronRight, Plus, DollarSign, Edit, Trash2 } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { useUser } from '@/contexts/UserContext'
import { expenditureSchema, ExpenditureInput } from '@/lib/validations'
import { roundUpSpareCents } from '@/lib/roundup'
import { cn } from '@/lib/utils'

interface Expenditure {
  id: string
  title: string
  amount: number
  categoryId: string
  accountId?: string | null
  createdAt: string
  updatedAt: string
  category: { title: string }
  account?: { id: string; name: string; type: string; balance: number } | null
}

interface BudgetCategory {
  id: string
  title: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
  isMain?: boolean
  roundUpOnExpenditure?: boolean
  doesRoundupSave?: boolean
}

const PAGE_SIZE = 20

function ExpendituresContent() {
  const { user, isLoading: userLoading } = useUser()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenditures, setExpenditures] = useState<Expenditure[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [title, setTitle] = useState(() => searchParams.get('title') ?? '')
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('from') ?? '')
  const [dateTo, setDateTo] = useState(() => searchParams.get('to') ?? '')
  const [categoryId, setCategoryId] = useState(() => searchParams.get('categoryId') ?? '')
  const [page, setPage] = useState(() => Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)))
  const [showExpenditureForm, setShowExpenditureForm] = useState(false)
  const [editingExpenditure, setEditingExpenditure] = useState<Expenditure | null>(null)
  const [roundupSavingsAccountId, setRoundupSavingsAccountId] = useState<string | null>(null)

  const expenditureForm = useForm<ExpenditureInput>({
    resolver: zodResolver(expenditureSchema) as Resolver<ExpenditureInput>,
    defaultValues: {
      accountId: '',
      createdAt: new Date().toISOString().slice(0, 10) // yyyy-mm-dd for input type="date"
    }
  })

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/budget-categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })))
      } else {
        setCategories([])
      }
    } catch {
      setCategories([])
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
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
    }
  }, [])

  const fetchRoundupSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user/roundup-settings')
      if (response.ok) {
        const data = await response.json()
        setRoundupSavingsAccountId(data.roundupSavingsAccountId ?? null)
      } else {
        setRoundupSavingsAccountId(null)
      }
    } catch {
      setRoundupSavingsAccountId(null)
    }
  }, [])

  const fetchExpenditures = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (title.trim()) params.set('title', title.trim())
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (categoryId) params.set('categoryId', categoryId)
      params.set('page', String(page))
      params.set('limit', String(PAGE_SIZE))
      const response = await fetch(`/api/expenditures?${params.toString()}`)
      if (response.ok) {
        const json = await response.json()
        setExpenditures(json.data ?? [])
        setPagination(json.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
      } else {
        setExpenditures([])
        setPagination({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
      }
    } catch {
      setExpenditures([])
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 })
    } finally {
      setIsLoading(false)
    }
  }, [user, title, dateFrom, dateTo, categoryId, page])

  useEffect(() => {
    if (user && !userLoading) {
      fetchCategories()
      fetchAccounts()
      fetchRoundupSettings()
    }
  }, [user, userLoading, fetchCategories, fetchAccounts, fetchRoundupSettings])

  useEffect(() => {
    if (user && !userLoading) {
      fetchExpenditures()
    }
  }, [user, userLoading, fetchExpenditures])

  useEffect(() => {
    if (!user || userLoading) return
    const url = new URL(window.location.href)
    if (title) url.searchParams.set('title', title)
    else url.searchParams.delete('title')
    if (dateFrom) url.searchParams.set('from', dateFrom)
    else url.searchParams.delete('from')
    if (dateTo) url.searchParams.set('to', dateTo)
    else url.searchParams.delete('to')
    if (categoryId) url.searchParams.set('categoryId', categoryId)
    else url.searchParams.delete('categoryId')
    if (page > 1) url.searchParams.set('page', String(page))
    else url.searchParams.delete('page')
    window.history.replaceState({}, '', url.pathname + url.search)
  }, [user, userLoading, title, dateFrom, dateTo, categoryId, page])

  const handleApplyFilters = () => {
    setPage(1)
    fetchExpenditures()
  }

  const onExpenditureSubmit = async (data: ExpenditureInput) => {
    try {
      const payload: Record<string, unknown> = { title: data.title, amount: data.amount, categoryId: data.categoryId }
      if (editingExpenditure) {
        payload.accountId = data.accountId ?? ''
      } else if (data.accountId) {
        payload.accountId = data.accountId
      }
      if (data.createdAt) {
        payload.createdAt = new Date(data.createdAt + 'T12:00:00.000Z').toISOString()
      }
      const isEdit = !!editingExpenditure
      const url = isEdit ? `/api/expenditures/${editingExpenditure.id}` : '/api/expenditures'
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (response.ok) {
        setShowExpenditureForm(false)
        setEditingExpenditure(null)
        expenditureForm.reset({ title: '', amount: 0, categoryId: '', accountId: '', createdAt: new Date().toISOString().slice(0, 10) })
        await fetchExpenditures()
        if (categories.length === 0) await fetchCategories()
      } else {
        const err = await response.json()
        alert(err.error || (isEdit ? 'Failed to update expenditure' : 'Failed to create expenditure'))
      }
    } catch (e) {
      console.error(e)
      alert('Failed to save expenditure')
    }
  }

  const handleEditExpenditure = (exp: Expenditure) => {
    const d = new Date(exp.createdAt)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setEditingExpenditure(exp)
    expenditureForm.reset({
      title: exp.title,
      amount: exp.amount,
      categoryId: exp.categoryId,
      accountId: exp.accountId ?? '',
      createdAt: dateStr
    })
    setShowExpenditureForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteExpenditure = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expenditure?')) return
    try {
      const response = await fetch(`/api/expenditures/${id}`, { method: 'DELETE' })
      if (response.ok) await fetchExpenditures()
      else {
        const err = await response.json()
        alert(err.error || 'Failed to delete expenditure')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to delete expenditure')
    }
  }

  if (userLoading || (isLoading && !expenditures.length && user)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {userLoading ? 'Loading user...' : 'Loading expenditures...'}
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to be logged in to view your expenditures.</p>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  const watchedAccountId = expenditureForm.watch('accountId')
  const watchedAmount = expenditureForm.watch('amount')
  const primaryAccount = accounts.find((a) => a.isMain)
  const effectiveSpendAccount =
    accounts.find((a) => a.id === (watchedAccountId || '')) ?? primaryAccount ?? null
  const spare =
    typeof watchedAmount === 'number' && watchedAmount > 0 ? roundUpSpareCents(watchedAmount) : 0
  const savingsName = accounts.find((a) => a.id === roundupSavingsAccountId)?.name ?? 'savings'
  const roundupSourceAccount = accounts.find((a) => a.doesRoundupSave) ?? effectiveSpendAccount
  const showRoundupHint =
    !editingExpenditure &&
    showExpenditureForm &&
    Boolean(effectiveSpendAccount?.roundUpOnExpenditure) &&
    Boolean(roundupSavingsAccountId) &&
    spare > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="expenditures" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Total Expenditures: ${expenditures.reduce((total, exp) => total + exp.amount, 0).toFixed(2)}</h1>
          <button
            type="button"
            onClick={() => {
              setEditingExpenditure(null)
              expenditureForm.reset({
                title: '',
                amount: 0,
                categoryId: '',
                accountId: '',
                createdAt: new Date().toISOString().slice(0, 10)
              })
              setShowExpenditureForm(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expenditure
          </button>
        </div>

        {/* Add / Edit Expenditure modal */}
        {showExpenditureForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {editingExpenditure ? 'Edit Expenditure' : 'Add New Expenditure'}
            </h2>
            <form onSubmit={expenditureForm.handleSubmit(onExpenditureSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exp-form-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    {...expenditureForm.register('title')}
                    id="exp-form-title"
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
                  <label htmlFor="exp-form-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      {...expenditureForm.register('amount', { valueAsNumber: true })}
                      id="exp-form-amount"
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
                  <label htmlFor="exp-form-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    {...expenditureForm.register('createdAt')}
                    id="exp-form-date"
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
                  <label htmlFor="exp-form-categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    {...expenditureForm.register('categoryId')}
                    id="exp-form-categoryId"
                    className={cn(
                      'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      expenditureForm.formState.errors.categoryId ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
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
                  <label htmlFor="exp-form-accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account (optional)
                  </label>
                  <select
                    {...expenditureForm.register('accountId')}
                    id="exp-form-accountId"
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
                {showRoundupHint && (
                  <p className="md:col-span-2 text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md px-3 py-2">
                    Round-up: an extra ${spare.toFixed(2)} will move to {savingsName} (debited from{' '}
                    {roundupSourceAccount?.name ?? 'the spending account'}).
                  </p>
                )}
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
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                  {editingExpenditure ? 'Update Expenditure' : 'Add Expenditure'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="exp-title-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search by title
            </label>
            <div className="relative">
              <input
                id="exp-title-search"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyFilters())}
                placeholder="e.g. Groceries, Coffee"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <label htmlFor="exp-date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From date
            </label>
            <input
              id="exp-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <label htmlFor="exp-date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To date
            </label>
            <input
              id="exp-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <label htmlFor="exp-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="exp-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            Apply filters
          </button>
        </div>

        {isLoading && expenditures.length > 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : expenditures.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <Receipt className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No expenditures found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {title || dateFrom || dateTo || categoryId ? 'Try adjusting your filters' : 'Add an expenditure using the button above'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Title
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Account
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {expenditures.map((exp) => (
                      <tr key={exp.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{exp.title}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          ${exp.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exp.category?.title ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{exp.account?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(exp.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditExpenditure(exp)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpenditure(exp.id)}
                              className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4 inline" /> Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Next <ChevronRight className="h-4 w-4 inline" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function ExpendituresPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ExpendituresContent />
    </Suspense>
  )
}
