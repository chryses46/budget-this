'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, signOut } from 'next-auth/react'

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
  const { data: session, status } = useSession()
  const isLoading = status === 'loading'

  const user: User | null = session?.user ? {
    id: session.user.id,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    email: session.user.email
  } : null

  const logout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <UserContext.Provider value={{ user, setUser: () => {}, isLoading, logout }}>
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