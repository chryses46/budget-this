'use client'

import { useEffect } from 'react'
import { DollarSign } from 'lucide-react'

export default function Home() {
  useEffect(() => {
    // Redirect to login after a brief loading screen
    const timer = setTimeout(() => {
      window.location.href = '/login'
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <DollarSign className="h-16 w-16 text-indigo-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Budget This</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Your personal finance tracker</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Redirecting to login...</p>
      </div>
    </div>
  )
}
