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
  
  // For now, we'll implement a simple check
  // In a real app, you'd check for a valid session token here
  const hasAuth = request.cookies.get('auth-token')?.value
  
  // If accessing a protected route without auth, redirect to login
  if (isProtectedRoute && !hasAuth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If accessing login/register with auth, redirect to dashboard
  if (isPublicRoute && hasAuth) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
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
