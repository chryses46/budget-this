'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { ThemeDropdown } from '@/components/ThemeDropdown'
import { Menu, X, DollarSign, Calendar, PieChart, CreditCard, LogOut } from 'lucide-react'

interface NavigationProps {
  currentPage?: string
}

export function Navigation({ currentPage }: NavigationProps) {
  const { user } = useUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: DollarSign },
    { name: 'Bills', href: '/bills', icon: Calendar },
    { name: 'Budget', href: '/budget', icon: PieChart },
    { name: 'Accounts', href: '/accounts', icon: CreditCard },
  ]

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <DollarSign className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900 dark:text-white">
                Budget This
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === item.name.toLowerCase()
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            
            <div className="flex items-center space-x-4">
              {/* User Display */}
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {user.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.firstName}
                  </span>
                </div>
              )}
              
              <ThemeDropdown />
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeDropdown />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
              {/* User Display for Mobile */}
              {user && (
                <div className="flex items-center space-x-2 px-3 py-2 mb-4">
                  <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                      {user.firstName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Welcome, {user.firstName}
                  </span>
                </div>
              )}

              {/* Navigation Links */}
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      currentPage === item.name.toLowerCase()
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              {/* Sign Out Button for Mobile */}
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
