import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Navigation } from '../Navigation'
import { UserProvider } from '@/contexts/UserContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the user context
const mockLogout = jest.fn()
const mockUser = {
  id: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
}

const mockUseUser = {
  user: mockUser,
  setUser: jest.fn(),
  isLoading: false,
  logout: mockLogout,
}

jest.mock('@/contexts/UserContext', () => ({
  ...jest.requireActual('@/contexts/UserContext'),
  useUser: () => mockUseUser,
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>
  }
})

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render navigation with logo and brand', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    expect(screen.getByText('Budget This')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /budget this/i })).toHaveAttribute('href', '/dashboard')
  })

  it('should render all navigation items', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Bills')).toBeInTheDocument()
    expect(screen.getByText('Budget')).toBeInTheDocument()
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })

  it('should render user information when user is logged in', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument() // First letter of firstName
  })

  it('should render sign out button', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('should call logout when sign out button is clicked', async () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    fireEvent.click(screen.getByText('Sign Out'))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  it('should render mobile menu button', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    expect(menuButton).toBeInTheDocument()
  })

  it('should toggle mobile menu when menu button is clicked', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)

    // Should show X icon and mobile menu
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    expect(screen.getByText('Welcome, John')).toBeInTheDocument()
  })

  it('should close mobile menu when close button is clicked', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    // Should show menu icon again
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('should close mobile menu when navigation link is clicked', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)

    const dashboardLink = screen.getByText('Dashboard')
    fireEvent.click(dashboardLink)

    // Should show menu icon again
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('should close mobile menu when sign out is clicked', async () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)

    const signOutButton = screen.getAllByText('Sign Out')[1] // Mobile version
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })

    // Should show menu icon again
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('should highlight current page', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation currentPage="dashboard" />
        </UserProvider>
      </ThemeProvider>
    )

    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveClass('bg-indigo-100', 'dark:bg-indigo-900')
  })

  it('should not highlight inactive pages', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation currentPage="dashboard" />
        </UserProvider>
      </ThemeProvider>
    )

    const billsLink = screen.getByText('Bills').closest('a')
    expect(billsLink).not.toHaveClass('bg-indigo-100', 'dark:bg-indigo-900')
  })

  it('should render user profile link', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const profileLink = screen.getByText('John').closest('a')
    expect(profileLink).toHaveAttribute('href', '/me')
  })

  it('should render mobile user profile link', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)

    const mobileProfileLink = screen.getByText('Welcome, John').closest('a')
    expect(mobileProfileLink).toHaveAttribute('href', '/me')
  })

  it('should handle case when user is null', () => {
    const mockUseUserNoUser = {
      user: null,
      setUser: jest.fn(),
      isLoading: false,
      logout: mockLogout,
    }

    jest.doMock('@/contexts/UserContext', () => ({
      ...jest.requireActual('@/contexts/UserContext'),
      useUser: () => mockUseUserNoUser,
    }))

    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    // Should not render user-specific elements
    expect(screen.queryByText('John')).not.toBeInTheDocument()
    expect(screen.queryByText('Welcome, John')).not.toBeInTheDocument()
  })

  it('should render all navigation links with correct hrefs', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: /bills/i })).toHaveAttribute('href', '/bills')
    expect(screen.getByRole('link', { name: /budget/i })).toHaveAttribute('href', '/budget')
    expect(screen.getByRole('link', { name: /accounts/i })).toHaveAttribute('href', '/accounts')
  })

  it('should have proper accessibility attributes', () => {
    render(
      <ThemeProvider>
        <UserProvider>
          <Navigation />
        </UserProvider>
      </ThemeProvider>
    )

    const menuButton = screen.getByRole('button', { name: /menu/i })
    expect(menuButton).toHaveAttribute('aria-label')
  })
})
