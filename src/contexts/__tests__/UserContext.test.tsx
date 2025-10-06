import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { UserProvider, useUser } from '../UserContext'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>

// Test component that uses the user context
const TestComponent = () => {
  const { user, setUser, isLoading, logout } = useUser()

  return (
    <div>
      <div data-testid="user-id">{user?.id || 'null'}</div>
      <div data-testid="user-firstName">{user?.firstName || 'null'}</div>
      <div data-testid="user-lastName">{user?.lastName || 'null'}</div>
      <div data-testid="user-email">{user?.email || 'null'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <button onClick={logout}>Logout</button>
      <button onClick={() => setUser({ id: 'test-123', firstName: 'Test', lastName: 'User', email: 'test@example.com' })}>
        Set User
      </button>
    </div>
  )
}

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('UserProvider', () => {
    it('should provide user data from session', () => {
      const mockSession = {
        user: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      }

      mockUseSession.mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      expect(screen.getByTestId('user-firstName')).toHaveTextContent('John')
      expect(screen.getByTestId('user-lastName')).toHaveTextContent('Doe')
      expect(screen.getByTestId('user-email')).toHaveTextContent('john@example.com')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })

    it('should handle loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('null')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    })

    it('should handle unauthenticated state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('null')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })

    it('should handle session with missing user data', () => {
      mockUseSession.mockReturnValue({
        data: { user: null },
        status: 'authenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('null')
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })

    it('should call signOut when logout is called', async () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      mockSignOut.mockResolvedValue(undefined)

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      fireEvent.click(screen.getByText('Logout'))

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
      })
    })

    it('should handle setUser function (no-op)', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      // setUser is a no-op function, so clicking the button shouldn't change anything
      fireEvent.click(screen.getByText('Set User'))
      
      expect(screen.getByTestId('user-id')).toHaveTextContent('null')
    })
  })

  describe('useUser', () => {
    it('should throw error when used outside UserProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useUser must be used within a UserProvider')

      consoleSpy.mockRestore()
    })

    it('should return user context values', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toBeInTheDocument()
      expect(screen.getByTestId('is-loading')).toBeInTheDocument()
    })
  })

  describe('session status mapping', () => {
    it('should map loading status correctly', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('is-loading')).toHaveTextContent('true')
    })

    it('should map authenticated status correctly', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'user-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' } },
        status: 'authenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })

    it('should map unauthenticated status correctly', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })
  })

  describe('user object construction', () => {
    it('should construct user object from session data', () => {
      const mockSession = {
        user: {
          id: 'user-456',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        },
      }

      mockUseSession.mockReturnValue({
        data: mockSession as any,
        status: 'authenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('user-456')
      expect(screen.getByTestId('user-firstName')).toHaveTextContent('Jane')
      expect(screen.getByTestId('user-lastName')).toHaveTextContent('Smith')
      expect(screen.getByTestId('user-email')).toHaveTextContent('jane@example.com')
    })

    it('should handle missing session user gracefully', () => {
      mockUseSession.mockReturnValue({
        data: { user: undefined },
        status: 'authenticated',
      })

      render(
        <UserProvider>
          <TestComponent />
        </UserProvider>
      )

      expect(screen.getByTestId('user-id')).toHaveTextContent('null')
      expect(screen.getByTestId('user-firstName')).toHaveTextContent('null')
      expect(screen.getByTestId('user-lastName')).toHaveTextContent('null')
      expect(screen.getByTestId('user-email')).toHaveTextContent('null')
    })
  })
})
