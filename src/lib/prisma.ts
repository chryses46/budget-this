import { PrismaClient } from '@prisma/client'
import { createEncryptionExtension } from './prisma-encryption-middleware'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

function createPrismaClient() {
  const base = new PrismaClient()
  if (process.env.ENCRYPTION_KEY) {
    return base.$extends(createEncryptionExtension()) as unknown as PrismaClient
  }
  return base
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
