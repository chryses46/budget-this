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
        console.log('NextAuth authorize called with:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password,
          mfaCode: credentials?.mfaCode,
          userId: credentials?.userId,
          mfaVerified: credentials?.mfaVerified
        })
        
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

        // Check if email is verified
        if (!user.emailVerified) {
          return null
        }

        // For email-only login (no password or empty password), allow if MFA is verified
        if ((!credentials.password || credentials.password === '') && credentials.mfaVerified === 'true') {
          console.log('Email-only login with MFA verification for user:', user.id)
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName
          }
        }

        // For password-based login, verify password
        if (credentials.password) {
          const isValidPassword = await verifyPassword(credentials.password, user.password)
          if (!isValidPassword) {
            return null
          }

          // For MFA users, we'll handle this differently
          // If MFA is enabled, we'll check for a special bypass flag
          if (user.mfaEnabled) {
            // Check if this is an MFA bypass (when mfaVerified is provided)
            if (!credentials.mfaVerified || credentials.mfaVerified !== 'true') {
              // MFA is enabled but not properly verified, deny access
              console.log('MFA enabled but not verified:', { mfaVerified: credentials.mfaVerified, mfaCode: credentials.mfaCode, userId: credentials.userId })
              return null
            }
            console.log('MFA bypass successful for user:', user.id)
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
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  debug: process.env.NODE_ENV === 'development'
}

// Export utility functions for use in API routes
export { verifyPassword, hashPassword, generateMfaCode, sendMfaCode, sendVerificationEmail }