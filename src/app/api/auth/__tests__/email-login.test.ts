import { NextRequest } from 'next/server'
import { POST } from '../email-login/route'
import { prisma } from '@/lib/prisma'
import { generateMfaCode, sendMfaCode } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('@/lib/auth')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGenerateMfaCode = generateMfaCode as jest.MockedFunction<typeof generateMfaCode>
const mockSendMfaCode = sendMfaCode as jest.MockedFunction<typeof sendMfaCode>

describe('/api/auth/email-login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should send MFA code for valid email', async () => {
    const requestBody = {
      email: 'john@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendMfaCode.mockResolvedValue(undefined)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData).toEqual({
      message: 'Verification code sent to your email',
      requiresMfa: true,
      userId: 'user-123',
    })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    })
    expect(mockGenerateMfaCode).toHaveBeenCalled()
    expect(mockPrisma.mfaCode.create).toHaveBeenCalledWith({
      data: {
        code: '123456',
        userId: 'user-123',
        expiresAt: expect.any(Date),
      },
    })
    expect(mockSendMfaCode).toHaveBeenCalledWith('john@example.com', '123456')
  })

  it('should return error when user is not found', async () => {
    const requestBody = {
      email: 'nonexistent@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockResolvedValue(null)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(404)
    expect(responseData).toEqual({
      error: 'No account found with this email address',
    })

    expect(mockSendMfaCode).not.toHaveBeenCalled()
  })

  it('should return error when email is not verified', async () => {
    const requestBody = {
      email: 'john@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: false,
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'Please verify your email before logging in',
    })

    expect(mockSendMfaCode).not.toHaveBeenCalled()
  })

  it('should return error when email sending fails', async () => {
    const requestBody = {
      email: 'john@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendMfaCode.mockRejectedValue(new Error('Email sending failed'))

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Failed to send verification code',
    })
  })

  it('should return error for invalid request data', async () => {
    const invalidRequestBody = {
      email: 'invalid-email',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(invalidRequestBody),
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Email login failed',
    })
  })

  it('should return error when database operation fails', async () => {
    const requestBody = {
      email: 'john@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Email login failed',
    })
  })

  it('should set correct expiration time for MFA code (5 minutes)', async () => {
    const requestBody = {
      email: 'john@example.com',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: true,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      expiresAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockGenerateMfaCode.mockReturnValue('123456')
    mockPrisma.mfaCode.create.mockResolvedValue(mockMfaCode as any)
    mockSendMfaCode.mockResolvedValue(undefined)

    await POST(mockRequest)

    // Check that the expiration time is set to 5 minutes from now
    const mfaCodeCreateCall = mockPrisma.mfaCode.create.mock.calls[0]
    const expiresAt = mfaCodeCreateCall[0].data.expiresAt
    const now = new Date()
    const expectedExpiry = new Date(now.getTime() + 5 * 60 * 1000)

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
      error: 'Email login failed',
    })
  })
})
