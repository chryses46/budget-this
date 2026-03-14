import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginFormContent } from '../LoginFormContent'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

describe('LoginFormContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSignIn.mockResolvedValue({ ok: true, error: null })
    global.fetch = jest.fn()
  })

  it('renders email and password fields', () => {
    render(<LoginFormContent variant="page" />)
    expect(screen.getAllByText('Email address').length).toBeGreaterThan(0)
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('has sign in form with email and password inputs', () => {
    render(<LoginFormContent variant="page" />)
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('calls validate-credentials and signIn on valid submit', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true, mfaEnabled: false, userId: 'user-1' }),
      })
    // Prevent redirect (window.location.href) by never resolving signIn
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    render(<LoginFormContent variant="page" />)
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    if (emailInput) await user.type(emailInput, 'test@example.com')
    if (passwordInput) await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/validate-credentials',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      )
    })
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          redirect: false,
        })
      )
    })
  })

  it('shows error when validate-credentials returns not ok', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
    const user = userEvent.setup()
    render(<LoginFormContent variant="page" />)
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    if (emailInput) await user.type(emailInput, 'test@example.com')
    if (passwordInput) await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })
})
