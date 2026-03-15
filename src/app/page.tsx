'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { TrendingUp, PiggyBank, LogIn, Shield, Lock, BarChart3, CreditCard, ChevronDown } from 'lucide-react'
import { AuthModal } from '@/components/AuthModal'
import { LoginFormContent } from '@/components/LoginFormContent'
import { RegisterFormContent } from '@/components/RegisterFormContent'

const HERO_IMAGES = [
  '/img/cash.jpg',
  '/img/savings.jpg',
  '/img/count-coins.jpg',
  '/img/stocks.jpg'
]

const ROTATE_MS = 5000
const SCROLL_ARROW_DELAY_MS = 2000

export default function Home() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [signUpModalOpen, setSignUpModalOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [showScrollArrow, setShowScrollArrow] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setShowScrollArrow(true), SCROLL_ARROW_DELAY_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile: top-right login icon */}
      <header className="fixed top-0 right-0 z-30 p-4 md:hidden">
        <button
          type="button"
          onClick={() => setLoginModalOpen(true)}
          className="p-2 rounded-full text-white/90 hover:text-white bg-black/20 hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
          aria-label="Log in"
        >
          <LogIn className="h-6 w-6" />
        </button>
      </header>

      <main>
        {/* Hero: 70vh, scrolling image background with overlay */}
        <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 pt-24 pb-16 md:pt-16 overflow-hidden">
          {/* Background layer: explicit z-0 so it paints behind content (z-10) */}
          <div className="absolute inset-0 z-0" aria-hidden>
            {HERO_IMAGES.map((src, i) => (
              <div
                key={src}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                style={{ opacity: i === heroIndex ? 1 : 0 }}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            ))}
            {/* Dark overlay so text is readable */}
            <div className="absolute inset-0 bg-black/50 dark:bg-black/60" aria-hidden />
          </div>

          {/* Content: z-10 so it sits above background and overlay */}
          <div className="relative z-10 max-w-2xl mx-auto text-center w-full flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
              Budget This
            </h1>
            <p className="text-xl md:text-2xl text-white/95 mb-2 font-medium">
              Take control of your money
            </p>
            <p className="text-base md:text-lg text-white/80 mb-8 max-w-lg">
              Track spending. Build savings. Grow wealth.
            </p>
            <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/30 dark:bg-black/40 backdrop-blur-md border border-white/10">
              <button
                type="button"
                onClick={() => setSignUpModalOpen(true)}
                className="w-full max-w-xs md:w-auto px-8 py-3 rounded-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-colors"
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="text-sm text-white/90 hover:text-white focus:outline-none focus:underline"
              >
                Log in
              </button>
            </div>
          </div>

          {/* Scroll-down arrow: bottom right, appears after 1s, bounces twice */}
          {showScrollArrow && (
            <div
              className="absolute bottom-6 right-6 z-10 text-white/80"
              aria-hidden
            >
              <ChevronDown
                className="h-8 w-8 md:h-10 md:w-10 animate-scroll-arrow drop-shadow-md"
                strokeWidth={2.5}
              />
            </div>
          )}
        </section>

        {/* Feature: Track bills & spending */}
        <section className="relative py-16 md:py-24 px-6 bg-white dark:bg-gray-800/80">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-4 mb-6">
              <CreditCard className="h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Track bills and spending
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Add recurring bills, log one-off expenses, and see where your money goes. One place for your whole financial picture.
            </p>
          </div>
        </section>

        {/* Feature: Budgets */}
        <section className="relative py-16 md:py-24 px-6 bg-gray-50 dark:bg-gray-900/80">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-4 mb-6">
              <BarChart3 className="h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Budgets that work
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Set limits by category, link budgets to accounts, and stay on track. See how much you can save without the guesswork.
            </p>
          </div>
        </section>

        {/* Feature: Encryption & security */}
        <section className="relative py-16 md:py-24 px-6 bg-white dark:bg-gray-800/80">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-4 mb-6">
              <Shield className="h-10 w-10 text-indigo-600 dark:text-indigo-400" aria-hidden />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Encryption and security
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6">
              Sensitive fields are encrypted at rest. Your account uses secure sign-in with optional two-factor authentication.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
                Encrypted data at rest
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
                Optional 2FA
              </span>
            </div>
          </div>
        </section>

        {/* Value props: Saving money / Build wealth */}
        <section className="relative py-16 md:py-24 px-6 bg-gray-50 dark:bg-gray-900/80">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
              Built for your financial future
            </h2>
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-4 mb-4">
                  <PiggyBank className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Saving money</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  See where every dollar goes. Set budgets and stick to them.
                </p>
              </div>
              <div className="flex flex-col items-center text-center md:items-start md:text-left">
                <div className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 p-4 mb-4">
                  <TrendingUp className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Build wealth</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Plan ahead with bills and budgets. Make progress over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-6 bg-white dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ready to take the first step?
            </p>
            <button
              type="button"
              onClick={() => setSignUpModalOpen(true)}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign Up
            </button>
          </div>
        </section>
      </main>

      <AuthModal open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <LoginFormContent variant="modal" callbackUrl="/dashboard" />
      </AuthModal>

      <AuthModal open={signUpModalOpen} onOpenChange={setSignUpModalOpen}>
        <RegisterFormContent
          variant="modal"
          onSuccess={() => setSignUpModalOpen(false)}
        />
      </AuthModal>
    </div>
  )
}
