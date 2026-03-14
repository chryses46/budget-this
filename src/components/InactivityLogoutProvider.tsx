'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const INACTIVITY_LOGOUT_SECONDS =
  Number(process.env.NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS) || 300
const LOGOUT_WARNING_SECONDS =
  Number(process.env.NEXT_PUBLIC_LOGOUT_WARNING_SECONDS) || 60

const ACTIVITY_THROTTLE_MS = 1000

function scheduleLogoutCountdown(
  countdownIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  setCountdown: React.Dispatch<React.SetStateAction<number>>,
  setShowWarningModal: (v: boolean) => void
) {
  setShowWarningModal(true)
  setCountdown(LOGOUT_WARNING_SECONDS)
  countdownIntervalRef.current = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        signOut({ callbackUrl: '/login', redirect: true }).then(() => {
          window.location.href = '/login'
        })
        return 0
      }
      return prev - 1
    })
  }, 1000)
}

export function InactivityLogoutProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [countdown, setCountdown] = useState(LOGOUT_WARNING_SECONDS)

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const resetInactivityTimer = useCallback(() => {
    clearCountdownInterval()
    setShowWarningModal(false)
    setCountdown(LOGOUT_WARNING_SECONDS)
    clearIdleTimer()
    idleTimerRef.current = setTimeout(() => {
      scheduleLogoutCountdown(
        countdownIntervalRef,
        setCountdown,
        setShowWarningModal
      )
    }, INACTIVITY_LOGOUT_SECONDS * 1000)
  }, [clearIdleTimer, clearCountdownInterval])

  const handleActivity = useCallback(() => {
    if (status !== 'authenticated') return

    if (throttleRef.current) return
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null
      resetInactivityTimer()
    }, ACTIVITY_THROTTLE_MS)
  }, [status, resetInactivityTimer])

  useEffect(() => {
    if (status !== 'authenticated') return

    idleTimerRef.current = setTimeout(() => {
      scheduleLogoutCountdown(
        countdownIntervalRef,
        setCountdown,
        setShowWarningModal
      )
    }, INACTIVITY_LOGOUT_SECONDS * 1000)

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const
    events.forEach((ev) => window.addEventListener(ev, handleActivity))

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetInactivityTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearIdleTimer()
      clearCountdownInterval()
      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
      }
    }
  }, [status, handleActivity, resetInactivityTimer, clearIdleTimer, clearCountdownInterval])

  return (
    <>
      {children}
      <Dialog.Root open={showWarningModal} onOpenChange={(open) => !open && resetInactivityTimer()}>
        <Dialog.Portal>
          <Dialog.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50 backdrop-blur-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            )}
          />
          <Dialog.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'rounded-lg border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
            onPointerDownOutside={(e) => {
              e.preventDefault()
              resetInactivityTimer()
            }}
            onInteractOutside={(e) => {
              e.preventDefault()
              resetInactivityTimer()
            }}
          >
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Session expiring
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-gray-600 dark:text-gray-400">
              You will be logged out in {countdown} seconds due to inactivity.
            </Dialog.Description>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={resetInactivityTimer}
                className={cn(
                  'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white',
                  'hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                  'dark:focus:ring-offset-gray-800'
                )}
              >
                Stay logged in
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
