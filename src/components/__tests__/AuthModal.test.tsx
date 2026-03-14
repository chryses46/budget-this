import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthModal } from '../AuthModal'

describe('AuthModal', () => {
  it('renders with title and children when open', () => {
    const onOpenChange = jest.fn()
    render(
      <AuthModal open={true} onOpenChange={onOpenChange} title="Sign in">
        <p>Form content here</p>
      </AuthModal>
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Form content here')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('uses default title when title prop is not provided', () => {
    render(
      <AuthModal open={true} onOpenChange={jest.fn()}>
        <span>Content</span>
      </AuthModal>
    )
    const title = document.querySelector('[class*="sr-only"]')
    expect(title).toHaveTextContent('Account')
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(
      <AuthModal open={true} onOpenChange={onOpenChange} title="Modal">
        <span>Content</span>
      </AuthModal>
    )
    const cancelButton = screen.getByText('Cancel').closest('button')
    expect(cancelButton).toBeInTheDocument()
    if (cancelButton) {
      await user.click(cancelButton)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('renders children inside dialog content', () => {
    render(
      <AuthModal open={true} onOpenChange={jest.fn()}>
        <div data-testid="child">Child content</div>
      </AuthModal>
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Child content')
  })
})
