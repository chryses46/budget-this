'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, ExternalLink, Shield, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { Navigation } from '@/components/Navigation'

interface BankAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit'
  balance: number
  lastUpdated: string
  institution: string
  accountNumber: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      // TODO: Replace with actual API call to fetch connected accounts
      // const response = await fetch('/api/accounts')
      // const data = await response.json()
      // setAccounts(data)
      
      // Placeholder data
      setAccounts([])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      // TODO: Implement actual Plaid Link integration
      // This would open Plaid Link modal and handle the connection flow
      
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Add a placeholder account for demonstration
      const newAccount: BankAccount = {
        id: Math.random().toString(36).substr(2, 9),
        name: 'Chase Checking',
        type: 'checking',
        balance: 2500.00,
        lastUpdated: new Date().toISOString(),
        institution: 'Chase Bank',
        accountNumber: '****1234'
      }
      
      setAccounts([...accounts, newAccount])
    } catch (error) {
      console.error('Error connecting account:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return
    
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' })
      
      setAccounts(accounts.filter(account => account.id !== accountId))
    } catch (error) {
      console.error('Error disconnecting account:', error)
    }
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <CreditCard className="h-6 w-6 text-blue-600" />
      case 'savings':
        return <TrendingUp className="h-6 w-6 text-green-600" />
      case 'credit':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <CreditCard className="h-6 w-6 text-gray-600" />
    }
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'checking':
        return 'bg-blue-100 text-blue-800'
      case 'savings':
        return 'bg-green-100 text-green-800'
      case 'credit':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => {
      return account.type === 'credit' ? sum - account.balance : sum + account.balance
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="accounts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Connect Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Accounts</h1>
          <button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Connect Account
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Balance</h3>
                <p className="text-3xl font-bold text-gray-900">${getTotalBalance().toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Connected Accounts</h3>
                <p className="text-3xl font-bold text-gray-900">{accounts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Security</h3>
                <p className="text-sm text-gray-500">Bank-level encryption</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plaid Integration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <Shield className="h-6 w-6 text-blue-600 mt-1 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900">Secure Bank Connection</h3>
              <p className="mt-1 text-blue-700">
                We use Plaid to securely connect to your bank accounts. Your credentials are never stored on our servers, 
                and all data is encrypted in transit and at rest.
              </p>
              <div className="mt-3">
                <a
                  href="https://plaid.com/security/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  Learn more about Plaid&apos;s security
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
            <p className="text-gray-500 mb-6">
              Connect your bank accounts to automatically track your spending and account balances
            </p>
            <button
              onClick={handleConnectAccount}
              disabled={isConnecting}
              className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center mx-auto"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Your First Account
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getAccountIcon(account.type)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{account.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">{account.institution}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{account.accountNumber}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getAccountTypeColor(account.type)}`}>
                          {account.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Last updated: {new Date(account.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${account.type === 'credit' ? 'text-red-600' : 'text-gray-900'}`}>
                      {account.type === 'credit' ? '-' : ''}${account.balance.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {account.type === 'credit' ? 'Credit Limit' : 'Available Balance'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleDisconnectAccount(account.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Disconnect Account
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plaid Integration Placeholder */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Plaid Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Development Mode</h4>
              <p className="text-sm text-gray-600">
                Currently using Plaid Sandbox for testing. Replace with production credentials for live data.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Configure Plaid environment variables</li>
                <li>• Implement Plaid Link component</li>
                <li>• Set up webhook handlers</li>
                <li>• Add transaction categorization</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
