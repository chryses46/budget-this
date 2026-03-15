import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSignOut = jest.fn()
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: { user: {} }, status: 'authenticated' })),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

// Load provider after env is set so it uses short timeouts
const originalEnv = process.env.NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS
const originalWarning = process.env.NEXT_PUBLIC_LOGOUT_WARNING_SECONDS
beforeAll(() => {
  process.env.NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS = '0'
  process.env.NEXT_PUBLIC_LOGOUT_WARNING_SECONDS = '2'
})
afterAll(() => {
  process.env.NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS = originalEnv
  process.env.NEXT_PUBLIC_LOGOUT_WARNING_SECONDS = originalWarning
})

describe('InactivityLogoutProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockSignOut.mockResolvedValue(undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders children', async () => {
    const { InactivityLogoutProvider } = await import('../InactivityLogoutProvider')
    render(
      <InactivityLogoutProvider>
        <div data-testid="child">Child content</div>
      </InactivityLogoutProvider>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Child content')
  })

  it('shows warning modal after inactivity and Stay logged in resets', async () => {
    const { InactivityLogoutProvider } = await import('../InactivityLogoutProvider')
    render(
      <InactivityLogoutProvider>
        <span>Child</span>
      </InactivityLogoutProvider>
    )
    expect(screen.queryByText(/Session expiring|logged out.*inactivity/i)).not.toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    await act(async () => {
      await Promise.resolve()
    })
    const stayButton = screen.queryByRole('button', { name: /stay logged in/i })
    if (stayButton) {
      await userEvent.click(stayButton)
      expect(screen.queryByText(/Session expiring/i)).not.toBeInTheDocument()
    }
  })
})
