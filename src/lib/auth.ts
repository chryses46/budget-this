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
        userId: { label: 'User ID', type: 'text' },
        mfaVerified: { label: 'MFA Verified', type: 'text' }
      },
      async authorize(credentials) {
        
        if (!credentials?.email) {
          return null
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })


        if (!user) {
          return null
        }

        // Check if email is verified
        if (!user.emailVerified) {
          return null
        }

        // For password-based login, verify password FIRST
        if (credentials.password) {
          const isValidPassword = await verifyPassword(credentials.password, user.password)
          if (!isValidPassword) {
            return null
          }

          // Password is valid, now check MFA requirements
          if (user.mfaEnabled) {
            // If MFA is enabled, only allow access if mfaVerified is true
            if (!credentials.mfaVerified || credentials.mfaVerified !== 'true') {
              // MFA is enabled but not verified - deny access
              return null
            }
          }
        } else {
          // For email-only login (no password), allow if MFA is verified
          if (credentials.mfaVerified === 'true') {
            return {
              id: user.id,
              email: user.email,
              name: `${user.firstName} ${user.lastName}`,
              firstName: user.firstName,
              lastName: user.lastName
            }
          } else {
            // No password and no MFA verification, deny access
            return null
          }
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
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  },
  debug: process.env.NODE_ENV === 'development'
}

// Export utility functions for use in API routes
export { verifyPassword, hashPassword, generateMfaCode, sendMfaCode, sendVerificationEmail }