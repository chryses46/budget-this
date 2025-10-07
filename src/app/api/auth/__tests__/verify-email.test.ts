import { NextRequest } from 'next/server'
import { POST } from '../verify-email/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/prisma')
jest.mock('next-auth')
jest.mock('@/lib/auth')

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('/api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should verify email successfully', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      emailVerified: false,
    }

    const mockMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      used: false,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockPrisma.mfaCode.findFirst.mockResolvedValue(mockMfaCode as any)
    mockPrisma.mfaCode.update.mockResolvedValue({ ...mockMfaCode, used: true } as any)
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, emailVerified: true } as any)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(200)
    expect(responseData).toEqual({
      message: 'Email verified successfully',
      user: {
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    })

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
    })
    expect(mockPrisma.mfaCode.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        code: '123456',
        used: false,
        expiresAt: {
          gt: expect.any(Date),
        },
      },
    })
    expect(mockPrisma.mfaCode.update).toHaveBeenCalledWith({
      where: { id: 'mfa-123' },
      data: { used: true },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { emailVerified: true },
    })
  })

  it('should return error when user is not found', async () => {
    const requestBody = {
      code: '123456',
      userId: 'nonexistent-user',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockResolvedValue(null)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(404)
    expect(responseData).toEqual({
      error: 'User not found',
    })

    expect(mockPrisma.mfaCode.findFirst).not.toHaveBeenCalled()
  })

  it('should return error when email is already verified', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: true,
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'Email already verified',
    })

    expect(mockPrisma.mfaCode.findFirst).not.toHaveBeenCalled()
  })

  it('should return error when verification code is invalid', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
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
    mockPrisma.mfaCode.findFirst.mockResolvedValue(null)

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'Invalid or expired verification code',
    })

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('should return error when verification code is expired', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: false,
    }

    const expiredMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      used: false,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockPrisma.mfaCode.findFirst.mockResolvedValue(null) // No valid code found due to expiration

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'Invalid or expired verification code',
    })
  })

  it('should return error when verification code is already used', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    const mockUser = {
      id: 'user-123',
      email: 'john@example.com',
      emailVerified: false,
    }

    const usedMfaCode = {
      id: 'mfa-123',
      code: '123456',
      userId: 'user-123',
      used: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }

    mockPrisma.user.findUnique.mockResolvedValue(mockUser as any)
    mockPrisma.mfaCode.findFirst.mockResolvedValue(null) // No unused code found

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(400)
    expect(responseData).toEqual({
      error: 'Invalid or expired verification code',
    })
  })

  it('should return error for invalid request data', async () => {
    const invalidRequestBody = {
      code: '123', // Too short
      userId: 'invalid-uuid',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(invalidRequestBody),
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Email verification failed',
    })
  })

  it('should return error when database operation fails', async () => {
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Email verification failed',
    })
  })

  it('should handle request.json() errors', async () => {
    const mockRequest = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as NextRequest

    const response = await POST(mockRequest)
    const responseData = await response.json()

    expect(response.status).toBe(500)
    expect(responseData).toEqual({
      error: 'Email verification failed',
    })
  })

  it('should log errors to console', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const requestBody = {
      code: '123456',
      userId: 'user-123',
    }

    const mockRequest = {
      json: jest.fn().mockResolvedValue(requestBody),
    } as unknown as NextRequest

    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

    await POST(mockRequest)

    expect(consoleSpy).toHaveBeenCalledWith('Email verification error:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})
