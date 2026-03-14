'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UserProvider } from '@/contexts/UserContext'
import { InactivityLogoutProvider } from '@/components/InactivityLogoutProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <UserProvider>
          <InactivityLogoutProvider>
            {children}
          </InactivityLogoutProvider>
        </UserProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
