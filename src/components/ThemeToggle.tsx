'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ] as const

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {/* Debug info - remove this later */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
        {theme} ({resolvedTheme})
      </div>
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => {
            console.log('Theme toggle clicked:', value) // Debug log
            setTheme(value)
          }}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          title={`Switch to ${label} theme`}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}
