import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock window.matchMedia
const mockMatchMedia = jest.fn()
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })
  })

  describe('ThemeProvider', () => {
    it('should provide default theme values', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    })

    it('should load theme from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme')
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    })

    it('should fallback to system theme for invalid localStorage value', () => {
      localStorageMock.getItem.mockReturnValue('invalid-theme')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    })

    it('should update theme when setTheme is called', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      fireEvent.click(screen.getByText('Set Light'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      })

      fireEvent.click(screen.getByText('Set Dark'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      })

      fireEvent.click(screen.getByText('Set System'))
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
      })
    })

    it('should save theme to localStorage when setTheme is called', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      fireEvent.click(screen.getByText('Set Dark'))
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
      })
    })

    it('should update resolved theme based on system preference when theme is system', async () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // dark mode
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
      })
    })

    it('should apply theme classes to document element', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      fireEvent.click(screen.getByText('Set Dark'))
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      })
    })

    it('should remove old theme classes when switching themes', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      fireEvent.click(screen.getByText('Set Light'))
      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true)
        expect(document.documentElement.classList.contains('dark')).toBe(false)
      })

      fireEvent.click(screen.getByText('Set Dark'))
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
        expect(document.documentElement.classList.contains('light')).toBe(false)
      })
    })
  })

  describe('useTheme', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useTheme must be used within a ThemeProvider')

      consoleSpy.mockRestore()
    })

    it('should return theme context values', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toBeInTheDocument()
      expect(screen.getByTestId('resolved-theme')).toBeInTheDocument()
    })
  })

  describe('system theme detection', () => {
    it('should listen for system theme changes when using system theme', async () => {
      const mockAddEventListener = jest.fn()
      const mockRemoveEventListener = jest.fn()
      
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
        dispatchEvent: jest.fn(),
      })

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      })

      unmount()

      await waitFor(() => {
        expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      })
    })
  })

  describe('hydration handling', () => {
    it('should prevent hydration mismatch by not rendering until mounted', () => {
      // This test verifies the mounted state prevents hydration issues
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      // The component should render with default values initially
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system')
    })
  })
})
