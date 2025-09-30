import { z } from 'zod'

// Auth schemas
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const mfaSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
})

export const emailLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
})

// Bill schemas
export const billSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  dayDue: z.number().min(1).max(31, 'Day due must be between 1 and 31'),
  frequency: z.enum(['Weekly', 'Monthly', 'Yearly']),
})

export const updateBillSchema = billSchema.partial()

// Budget Category schemas
export const budgetCategorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  limit: z.number().positive('Limit must be positive'),
})

export const updateBudgetCategorySchema = budgetCategorySchema.partial()

// Expenditure schemas
export const expenditureSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
})

export const updateExpenditureSchema = expenditureSchema.partial()

// Types
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type EmailLoginInput = z.infer<typeof emailLoginSchema>
export type MfaInput = z.infer<typeof mfaSchema>
export type BillInput = z.infer<typeof billSchema>
export type UpdateBillInput = z.infer<typeof updateBillSchema>
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>
export type UpdateBudgetCategoryInput = z.infer<typeof updateBudgetCategorySchema>
export type ExpenditureInput = z.infer<typeof expenditureSchema>
export type UpdateExpenditureInput = z.infer<typeof updateExpenditureSchema>
