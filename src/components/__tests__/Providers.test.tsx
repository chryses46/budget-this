import React from 'react'
import { render, screen } from '@testing-library/react'
import { Providers } from '../Providers'

// Mock the context providers
jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}))

jest.mock('@/contexts/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-provider">{children}</div>
  ),
}))

jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}))

describe('Providers', () => {
  it('should render all provider components in correct order', () => {
    render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    )

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('user-provider')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should pass children through all providers', () => {
    render(
      <Providers>
        <div data-testid="nested-child">
          <span>Nested Content</span>
        </div>
      </Providers>
    )

    expect(screen.getByText('Nested Content')).toBeInTheDocument()
    expect(screen.getByTestId('nested-child')).toBeInTheDocument()
  })

  it('should render with multiple children', () => {
    render(
      <Providers>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </Providers>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })

  it('should render with no children', () => {
    render(<Providers>{null}</Providers>)

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('user-provider')).toBeInTheDocument()
  })

  it('should render with empty children', () => {
    render(<Providers>{[]}</Providers>)

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument()
    expect(screen.getByTestId('user-provider')).toBeInTheDocument()
  })

  it('should maintain provider hierarchy', () => {
    const { container } = render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    )

    // SessionProvider should be the outermost
    const sessionProvider = screen.getByTestId('session-provider')
    const themeProvider = screen.getByTestId('theme-provider')
    const userProvider = screen.getByTestId('user-provider')
    const child = screen.getByTestId('child')

    expect(sessionProvider).toContainElement(themeProvider)
    expect(themeProvider).toContainElement(userProvider)
    expect(userProvider).toContainElement(child)
  })
})
