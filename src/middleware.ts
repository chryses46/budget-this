import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard', '/bills', '/budget', '/accounts']

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Debug logging for mobile issues
  const authToken = request.cookies.get('auth-token')?.value
  const fallbackToken = request.cookies.get('auth-token-fallback')?.value
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')
  const hasAuth = !!authToken || !!fallbackToken || !!authHeader
  
  console.log('Middleware - Path:', pathname)
  console.log('Middleware - Auth token present:', !!authToken)
  console.log('Middleware - Fallback token present:', !!fallbackToken)
  console.log('Middleware - Auth header present:', !!authHeader)
  console.log('Middleware - Has auth:', hasAuth)
  console.log('Middleware - User agent:', request.headers.get('user-agent'))
  console.log('Middleware - All cookies:', request.cookies.getAll().map(c => c.name))
  console.log('Middleware - Is protected route:', isProtectedRoute)
  
  // If accessing a protected route without auth, redirect to login
  if (isProtectedRoute && !hasAuth) {
    console.log('Middleware - Redirecting to login due to missing auth token')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If accessing login/register with auth, redirect to dashboard
  if (isPublicRoute && hasAuth) {
    console.log('Middleware - Redirecting to dashboard due to existing auth token')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  console.log('Middleware - Allowing request to proceed')
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
