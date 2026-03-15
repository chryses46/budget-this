'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ReactNode } from 'react'

type AuthModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
}

export function AuthModal({ open, onOpenChange, title, children }: AuthModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onPointerDownOutside={() => onOpenChange(false)}
          onEscapeKeyDown={() => onOpenChange(false)}
        >
          <div className="flex items-center justify-end mb-2">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Close"
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">
            {title ?? 'Account'}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
