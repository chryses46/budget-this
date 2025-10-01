import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword, hashPassword, generateMfaCode } from './auth-utils'
import { sendMfaCode, sendVerificationEmail } from './email'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        mfaCode: { label: 'MFA Code', type: 'text' },
        userId: { label: 'User ID', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          return null
        }

        // Verify password
        const isValidPassword = await verifyPassword(credentials.password, user.password)
        if (!isValidPassword) {
          return null
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return null
        }

        // If MFA is enabled, check for MFA code
        if (user.mfaEnabled) {
          if (!credentials.mfaCode || !credentials.userId) {
            // Return a special object indicating MFA is required
            return {
              id: user.id,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              requiresMfa: true
            }
          }
          // TODO: Verify MFA code
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60 // 7 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.requiresMfa = user.requiresMfa
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.requiresMfa = token.requiresMfa as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET
}

// Export utility functions for use in API routes
export { verifyPassword, hashPassword, generateMfaCode, sendMfaCode, sendVerificationEmail }