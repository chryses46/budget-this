import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterFormContent } from '../RegisterFormContent'

describe('RegisterFormContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders registration form fields', () => {
    render(<RegisterFormContent variant="page" />)
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Last Name')).toBeInTheDocument()
    expect(screen.getByText('Email address')).toBeInTheDocument()
    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('shows validation error for short password on submit', async () => {
    const user = userEvent.setup()
    render(<RegisterFormContent variant="page" />)
    const [first, last, email] = screen.getAllByRole('textbox')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    await user.type(first, 'Jane')
    await user.type(last, 'Doe')
    await user.type(email, 'jane@example.com')
    if (passwordInput) await user.type(passwordInput, 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/8 characters|Password/)
    })
  })

  it('calls register API and shows success on valid submit', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          message: 'User created successfully.',
          userId: 'user-123',
        }),
    })
    const user = userEvent.setup()
    render(<RegisterFormContent variant="page" />)
    const [first, last, email] = screen.getAllByRole('textbox')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    await user.type(first, 'Jane')
    await user.type(last, 'Doe')
    await user.type(email, 'jane@example.com')
    if (passwordInput) await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
            password: 'password123',
          }),
        })
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument()
    })
  })

  it('shows error when register API returns error', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'User with this email already exists' }),
    })
    const user = userEvent.setup()
    render(<RegisterFormContent variant="page" />)
    const [first, last, email] = screen.getAllByRole('textbox')
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')
    await user.type(first, 'Jane')
    await user.type(last, 'Doe')
    await user.type(email, 'jane@example.com')
    if (passwordInput) await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText(/already exists|registration failed/i)).toBeInTheDocument()
    })
  })
})
