import { prisma } from '../prisma'

describe('prisma', () => {
  it('should export prisma client', () => {
    expect(prisma).toBeDefined()
    expect(prisma.user).toBeDefined()
    expect(prisma.mfaCode).toBeDefined()
  })

  it('should have all required models', () => {
    expect(prisma.user).toBeDefined()
    expect(prisma.mfaCode).toBeDefined()
    expect(prisma.bill).toBeDefined()
    expect(prisma.budgetCategory).toBeDefined()
    expect(prisma.expenditure).toBeDefined()
    expect(prisma.account).toBeDefined()
    expect(prisma.transaction).toBeDefined()
  })

  it('should have CRUD methods for each model', () => {
    const models = ['user', 'mfaCode', 'bill', 'budgetCategory', 'expenditure', 'account', 'transaction']
    
    models.forEach(model => {
      const modelClient = prisma[model as keyof typeof prisma] as any
      expect(modelClient.findUnique).toBeDefined()
      expect(modelClient.findMany).toBeDefined()
      expect(modelClient.create).toBeDefined()
      expect(modelClient.update).toBeDefined()
      expect(modelClient.delete).toBeDefined()
    })
  })
})
