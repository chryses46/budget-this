import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock the theme context
const mockSetTheme = jest.fn()
const mockUseTheme = {
  theme: 'light' as const,
  setTheme: mockSetTheme,
  resolvedTheme: 'light' as const,
}

jest.mock('@/contexts/ThemeContext', () => ({
  ...jest.requireActual('@/contexts/ThemeContext'),
  useTheme: () => mockUseTheme,
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all theme options', () => {
    render(<ThemeToggle />)

    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('should show current theme as active', () => {
    render(<ThemeToggle />)

    const lightButton = screen.getByText('Light').closest('button')
    expect(lightButton).toHaveClass('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white')
  })

  it('should call setTheme when theme button is clicked', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByText('Dark'))
    expect(mockSetTheme).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByText('System'))
    expect(mockSetTheme).toHaveBeenCalledWith('system')

    fireEvent.click(screen.getByText('Light'))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('should show debug info', () => {
    render(<ThemeToggle />)

    expect(screen.getByText('light (light)')).toBeInTheDocument()
  })

  it('should have correct button titles', () => {
    render(<ThemeToggle />)

    expect(screen.getByTitle('Switch to Light theme')).toBeInTheDocument()
    expect(screen.getByTitle('Switch to Dark theme')).toBeInTheDocument()
    expect(screen.getByTitle('Switch to System theme')).toBeInTheDocument()
  })

  it('should hide labels on small screens', () => {
    render(<ThemeToggle />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      const span = button.querySelector('span')
      if (span) {
        expect(span).toHaveClass('hidden', 'sm:inline')
      }
    })
  })

  it('should render icons for each theme', () => {
    render(<ThemeToggle />)

    // Check that icons are rendered (they should be present as SVG elements)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)

    buttons.forEach(button => {
      const icon = button.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  it('should handle dark theme state', () => {
    const darkThemeMock = {
      theme: 'dark' as const,
      setTheme: mockSetTheme,
      resolvedTheme: 'dark' as const,
    }

    jest.doMock('@/contexts/ThemeContext', () => ({
      ...jest.requireActual('@/contexts/ThemeContext'),
      useTheme: () => darkThemeMock,
    }))

    render(<ThemeToggle />)

    const darkButton = screen.getByText('Dark').closest('button')
    expect(darkButton).toHaveClass('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white')
  })

  it('should handle system theme state', () => {
    const systemThemeMock = {
      theme: 'system' as const,
      setTheme: mockSetTheme,
      resolvedTheme: 'light' as const,
    }

    jest.doMock('@/contexts/ThemeContext', () => ({
      ...jest.requireActual('@/contexts/ThemeContext'),
      useTheme: () => systemThemeMock,
    }))

    render(<ThemeToggle />)

    const systemButton = screen.getByText('System').closest('button')
    expect(systemButton).toHaveClass('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white')
  })

  it('should have correct styling for inactive buttons', () => {
    render(<ThemeToggle />)

    const darkButton = screen.getByText('Dark').closest('button')
    const systemButton = screen.getByText('System').closest('button')

    expect(darkButton).toHaveClass('text-gray-600', 'dark:text-gray-400')
    expect(systemButton).toHaveClass('text-gray-600', 'dark:text-gray-400')
  })

  it('should have hover effects on buttons', () => {
    render(<ThemeToggle />)

    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('hover:text-gray-900', 'dark:hover:text-white')
    })
  })
})
