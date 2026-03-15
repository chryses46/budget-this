import { PrismaClient } from '@prisma/client'
import { createEncryptionExtension } from './prisma-encryption-middleware'

/** Type for the client passed to prisma.$transaction(callback) – same API as PrismaClient minus connection/transaction methods. */
export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
  const base = new PrismaClient()
  if (process.env.ENCRYPTION_KEY) {
    // Extension callback types are loose; cast to satisfy Prisma's generic $extends signature
    return base.$extends(createEncryptionExtension() as Parameters<typeof base.$extends>[0]) as unknown as PrismaClient
  }
  return base
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
