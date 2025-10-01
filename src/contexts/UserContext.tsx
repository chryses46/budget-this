'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthClient } from '@/lib/auth-client'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated by looking for auth token
    const checkAuth = async () => {
      try {
        // Use AuthClient for mobile compatibility
        const response = await AuthClient.makeAuthenticatedRequest('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          // Token is invalid or user not authenticated
          setUser(null)
          // Clear localStorage token if API call fails
          AuthClient.removeToken()
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
        // Clear localStorage token on error
        AuthClient.removeToken()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const logout = async () => {
    try {
      // Call logout API to clear server-side session
      await AuthClient.makeAuthenticatedRequest('/api/auth/logout', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      // Clear user state and localStorage token
      setUser(null)
      AuthClient.removeToken()
      window.location.href = '/login'
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
