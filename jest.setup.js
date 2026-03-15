import '@testing-library/jest-dom'

// Polyfill for Next.js API routes in Jest (next/server expects Request)
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input?.url ?? ''
      this.method = (init.method || 'GET').toUpperCase()
      this.headers = new Map(Object.entries(init.headers || {}))
    }
  }
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {}
}

// Mock next/server so NextResponse.json() returns an object with .json() that resolves to body.
// Use a class so "auth instanceof NextResponse" works in routes.
jest.mock('next/server', () => {
  class NextResponse {
    constructor(status, body) {
      this.status = status
      this._body = body
      this.cookies = { set: jest.fn() }
      this.headers = new Map()
    }
    json() {
      return Promise.resolve(this._body)
    }
    static json(body, init) {
      const status = (init && init.status) ?? 200
      return new NextResponse(status, body)
    }
  }
  return {
    NextRequest: class NextRequest {},
    NextResponse,
  }
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>
  }
})

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.SMTP_HOST = 'localhost'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test@example.com'
process.env.SMTP_PASS = 'test-password'
process.env.PLAID_CLIENT_ID = 'test-client-id'
process.env.PLAID_SECRET = 'test-secret'
process.env.PLAID_ENVIRONMENT = 'sandbox'

// Prisma mocks will be handled in individual test files

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  })),
}))

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
