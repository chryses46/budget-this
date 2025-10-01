'use client'

import { useState, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginSchema, emailLoginSchema, LoginInput, EmailLoginInput } from '@/lib/validations'
import { z } from 'zod'
import { cn } from '@/lib/utils'

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [userId, setUserId] = useState('')
  const [storedCredentials, setStoredCredentials] = useState<{email: string, password: string} | null>(null)

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const mfaForm = useForm<{ mfaCode: string }>({
    resolver: zodResolver(z.object({ mfaCode: z.string().min(1, 'MFA code is required') })),
    defaultValues: {
      mfaCode: ''
    }
  })

  const emailLoginForm = useForm<EmailLoginInput>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: ''
    }
  })

  const handleLogin = async (data: LoginInput) => {
    try {
      setIsLoading(true)
      setError('')

      // First, check if user exists and has MFA enabled
      const userResponse = await fetch('/api/auth/check-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      })

      if (userResponse.ok) {
        const userData = await userResponse.json()
        if (userData.mfaEnabled) {
          // User has MFA enabled, show MFA form
          setRequiresMfa(true)
          setUserId(userData.userId)
          setStoredCredentials({ email: data.email, password: data.password })
          return
        }
      }

      // No MFA required, proceed with normal login
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: callbackUrl
      })

      if (result?.error) {
        setError('Invalid credentials')
        return
      }

      if (result?.ok) {
        window.location.href = callbackUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async (data: { mfaCode: string }) => {
    try {
      setIsLoading(true)
      setError('')

      // Verify MFA code and create session
      const response = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          mfaCode: data.mfaCode
        })
      })

      if (!response.ok) {
        setError('Invalid MFA code')
        return
      }

      const result = await response.json()
      
      // MFA successful, now create NextAuth session
      if (!storedCredentials) {
        setError('Credentials not found. Please try logging in again.')
        return
      }
      
      console.log('Calling signIn with:', { 
        email: storedCredentials.email, 
        hasPassword: !!storedCredentials.password, 
        mfaVerified: 'true',
        userId: userId
      })
      
      // For email-only login, we need to handle it differently
      if (!storedCredentials.password) {
        // Email-only login - verify user first, then use NextAuth
        const sessionResponse = await fetch('/api/auth/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            email: storedCredentials.email
          })
        })
        
        if (!sessionResponse.ok) {
          setError('Failed to verify user')
          return
        }
        
        // Use NextAuth signIn with MFA bypass for email-only login
        const signInResult = await signIn('credentials', {
          email: storedCredentials.email,
          password: '', // Empty password for email-only login
          mfaVerified: 'true',
          userId: userId,
          redirect: false,
          callbackUrl: callbackUrl
        })

        if (signInResult?.error) {
          setError('Failed to create session')
          return
        }

        if (signInResult?.ok) {
          window.location.href = callbackUrl
        }
        return
      }
      
      // Password-based login - use NextAuth
      const signInResult = await signIn('credentials', {
        email: storedCredentials.email,
        password: storedCredentials.password,
        mfaVerified: 'true',
        redirect: false,
        callbackUrl: callbackUrl
      })

      if (signInResult?.error) {
        setError('Failed to create session')
        return
      }

      if (signInResult?.ok) {
        window.location.href = callbackUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailLogin = async (data: EmailLoginInput) => {
    try {
      setIsLoading(true)
      setError('')

      // Send MFA code to email
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send MFA code')
      }

      setRequiresMfa(true)
      setUserId(result.userId)
      // Store email for email-only login (no password needed)
      setStoredCredentials({ email: data.email, password: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send MFA code')
    } finally {
      setIsLoading(false)
    }
  }

  if (requiresMfa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Enter MFA Code
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              We sent a code to your email
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={mfaForm.handleSubmit(handleMfaSubmit)}>
            <div>
              <label htmlFor="mfaCode" className="sr-only">
                MFA Code
              </label>
              <input
                {...mfaForm.register('mfaCode')}
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter 6-digit code"
              />
              {mfaForm.formState.errors.mfaCode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {mfaForm.formState.errors.mfaCode.message}
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setRequiresMfa(false)
                  setError('')
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link href="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              create a new account
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          {/* Regular Login Form */}
          <form className="space-y-4" onSubmit={loginForm.handleSubmit(handleLogin)}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...loginForm.register('email')}
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...loginForm.register('password')}
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or</span>
            </div>
          </div>

          {/* Email Login Form */}
          <form className="space-y-4" onSubmit={emailLoginForm.handleSubmit(handleEmailLogin)}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                {...emailLoginForm.register('email')}
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              {emailLoginForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {emailLoginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Login with code'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="text-center">
          <Link href="/forgot-password" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}