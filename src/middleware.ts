import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'

// Define protected routes that require authentication
const protectedRoutes = ['/dashboard', '/bills', '/budget', '/accounts', '/me']

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  // Debug logging
  console.log('Middleware - Path:', pathname)
  console.log('Middleware - All cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`))
  
  // Check for valid session
  const session = await getSession()
  const hasAuth = !!session
  
  console.log('Middleware - Has session:', hasAuth)
  console.log('Middleware - Session data:', session ? { userId: session.userId, email: session.email } : 'null')
  
  // If accessing a protected route without auth, redirect to login
  if (isProtectedRoute && !hasAuth) {
    console.log('Middleware - Redirecting to login due to missing session')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If accessing login/register with auth, redirect to dashboard
  if (isPublicRoute && hasAuth) {
    console.log('Middleware - Redirecting to dashboard due to existing session')
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