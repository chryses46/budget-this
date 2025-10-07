import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware() {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    // Temporarily disable middleware to test
    '/dashboard/:path*',
    '/bills/:path*',
    '/budget/:path*',
    '/accounts/:path*',
    '/me/:path*'
  ]
}