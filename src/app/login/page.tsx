'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { loginSchema, emailLoginSchema, LoginInput, EmailLoginInput } from '@/lib/validations'
import { cn } from '@/lib/utils'
import { AuthClient } from '@/lib/auth-client'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresMfa, setRequiresMfa] = useState(false)
  const [userId, setUserId] = useState('')
  const [loginMode, setLoginMode] = useState<'password' | 'email'>('password')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
  } = useForm<EmailLoginInput>({
    resolver: zodResolver(emailLoginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Login failed')
      }

      if (result.requiresMfa) {
        setRequiresMfa(true)
        setUserId(result.userId)
      } else {
        // JWT token is set by the server in HTTP-only cookie
        // User data will be fetched by UserContext
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onEmailSubmit = async (data: EmailLoginInput) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Email login failed')
      }

      // Email login always requires MFA
      setRequiresMfa(true)
      setUserId(result.userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const code = formData.get('code') as string

    try {
      const response = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'MFA verification failed')
      }

      // Store token in localStorage for mobile compatibility
      if (result.token) {
        AuthClient.setToken(result.token)
        console.log('Token stored in localStorage for mobile compatibility')
      }

      // JWT token is also set by the server in HTTP-only cookie
      // User data will be fetched by UserContext
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (requiresMfa) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Enter verification code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            We sent a 6-digit code to your email
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleMfaSubmit}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    maxLength={6}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="000000"
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setRequiresMfa(false)}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Mode Toggle */}
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={cn(
                'flex-1 py-2 px-4 text-sm font-medium rounded-l-md border',
                loginMode === 'password'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              )}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={cn(
                'flex-1 py-2 px-4 text-sm font-medium rounded-r-md border-t border-r border-b',
                loginMode === 'email'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              )}
            >
              Email Code
            </button>
          </div>

          {/* Password Login Form */}
          {loginMode === 'password' && (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className={cn(
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    {...register('password')}
                    type="password"
                    autoComplete="current-password"
                    className={cn(
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      errors.password ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          {/* Email Login Form */}
          {loginMode === 'email' && (
            <form className="space-y-6" onSubmit={handleEmailSubmit(onEmailSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    {...registerEmail('email')}
                    type="email"
                    autoComplete="email"
                    className={cn(
                      'appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                      emailErrors.email ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    )}
                    placeholder="Enter your email address"
                  />
                  {emailErrors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailErrors.email.message}</p>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  We&apos;ll send a verification code to your email address.
                </p>
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Sending code...' : 'Send verification code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
