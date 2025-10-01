import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      requiresMfa?: boolean
    }
  }

  interface User {
    id: string
    firstName: string
    lastName: string
    email: string
    requiresMfa?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    firstName: string
    lastName: string
    requiresMfa?: boolean
  }
}
