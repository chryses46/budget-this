import { hashPassword, verifyPassword, generateMfaCode } from '../auth-utils'
import bcrypt from 'bcryptjs'

// Mock bcryptjs
jest.mock('bcryptjs')

describe('auth-utils', () => {
  describe('hashPassword', () => {
    it('should hash a password with bcrypt', async () => {
      const mockHash = 'hashed-password-123'
      ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHash)

      const result = await hashPassword('plain-password')

      expect(bcrypt.hash).toHaveBeenCalledWith('plain-password', 12)
      expect(result).toBe(mockHash)
    })

    it('should handle empty password', async () => {
      const mockHash = 'hashed-empty-password'
      ;(bcrypt.hash as jest.Mock).mockResolvedValue(mockHash)

      const result = await hashPassword('')

      expect(bcrypt.hash).toHaveBeenCalledWith('', 12)
      expect(result).toBe(mockHash)
    })
  })

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await verifyPassword('plain-password', 'hashed-password')

      expect(bcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password')
      expect(result).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await verifyPassword('wrong-password', 'hashed-password')

      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password')
      expect(result).toBe(false)
    })

    it('should handle empty password', async () => {
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const result = await verifyPassword('', 'hashed-password')

      expect(bcrypt.compare).toHaveBeenCalledWith('', 'hashed-password')
      expect(result).toBe(false)
    })
  })

  describe('generateMfaCode', () => {
    it('should generate a 6-digit code', () => {
      const code = generateMfaCode()

      expect(code).toMatch(/^\d{6}$/)
      expect(code.length).toBe(6)
    })

    it('should generate different codes on multiple calls', () => {
      const code1 = generateMfaCode()
      const code2 = generateMfaCode()

      // While it's theoretically possible for them to be the same,
      // it's extremely unlikely with 6 digits
      expect(code1).not.toBe(code2)
    })

    it('should generate codes within valid range', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateMfaCode()
        const codeNumber = parseInt(code, 10)
        
        expect(codeNumber).toBeGreaterThanOrEqual(100000)
        expect(codeNumber).toBeLessThanOrEqual(999999)
      }
    })
  })
})
