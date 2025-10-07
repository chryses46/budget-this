import { NextRequest } from 'next/server'
import { POST } from '../register/route'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateMfaCode, sendVerificationEmail } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('@/lib/auth')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>
const mockGenerateMfaCode = generateMfaCode as jest.MockedFunction<typeof generateMfaCode>
const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<typeof sendVerificationEmail>

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should register a new user successfully', async () => {
    const requestBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      ...requestBody,
      password: 'hashed-password',
      emailVerified: false,
      mfaEnabled: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockHashPassword.mockResolvedValue('hashed-password')
    mockPrisma.user.create.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendVerificationEmail.mockResolvedValue(undefined)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData).toEqual({
      message: 'User created successfully. Please check your email for verification code.',
      userId: 'user-123',
    })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    })
    expect(mockHashPassword).toHaveBeenCalledWith('password123')
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        emailVerified: false,
        mfaEnabled: true,
      },
    })
    expect(mockGenerateMfaCode).toHaveBeenCalled()
    expect(mockPrisma.mfaCode.create).toHaveBeenCalledWith({
      data: {
        code: '123456',
        userId: 'user-123',
        expiresAt: expect.any(Date),
      },
    })
    expect(mockSendVerificationEmail).toHaveBeenCalledWith('john@example.com', '123456')
  })

  it('should return error when user already exists', async () => {
    const requestBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'existing@example.com',
      password: 'password123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const existingUser = {
      id: 'existing-user-123',
      email: 'existing@example.com',
    }

    mockPrisma.user.findUnique.mockResolvedValue(existingUser as any)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'User with this email already exists',
    })

    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it('should return error for invalid request data', async () => {
    const invalidRequestBody = {
      firstName: '',
      lastName: 'Doe',
      email: 'invalid-email',
      password: 'short',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(invalidRequestBody),
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Registration failed',
    })
  })

  it('should return error when database operation fails', async () => {
    const requestBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Registration failed',
    })
  })

  it('should return error when email sending fails', async () => {
    const requestBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      ...requestBody,
      password: 'hashed-password',
      emailVerified: false,
      mfaEnabled: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockHashPassword.mockResolvedValue('hashed-password')
    mockPrisma.user.create.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendVerificationEmail.mockRejectedValue(new Error('Email sending failed'))

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Registration failed',
    })
  })

  it('should set correct expiration time for verification code', async () => {
    const requestBody = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      ...requestBody,
      password: 'hashed-password',
      emailVerified: false,
      mfaEnabled: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockHashPassword.mockResolvedValue('hashed-password')
    mockPrisma.user.create.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendVerificationEmail.mockResolvedValue(undefined)

    await POST(mockRequest)

    // Check that the expiration time is set to 24 hours from now
    const mfaCodeCreateCall = mockPrisma.mfaCode.create.mock.calls[0]
    const expiresAt = mfaCodeCreateCall[0].data.expiresAt
    const now = new Date()
    const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    expect(expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2) // Within 2 seconds
  })

  it('should handle request.json() errors', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Registration failed',
    })
  })
})
