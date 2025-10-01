'use client'

import { CreditCard, Shield } from 'lucide-react'
import { Navigation } from '@/components/Navigation'

export default function AccountsPage() {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentPage="accounts" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <CreditCard className="h-24 w-24 text-gray-400 dark:text-gray-500 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Coming Soon!</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Bank account integration is currently under development
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">Secure Bank Connection</h3>
                <p className="mt-1 text-blue-700 dark:text-blue-300">
                  We&apos;re working on integrating with Plaid to securely connect your bank accounts. 
                  This feature will allow you to automatically track your spending and account balances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
