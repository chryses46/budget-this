import { encrypt, decrypt, isEncrypted } from './field-encryption'

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User: ['firstName', 'lastName', 'email'],
  Account: ['name', 'type', 'subtype', 'institution', 'institutionId'],
}

const USER_FIELDS = new Set(ENCRYPTED_FIELDS.User)
const ACCOUNT_FIELDS = new Set(ENCRYPTED_FIELDS.Account)

function isUserRecord(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.firstName !== 'undefined' &&
    typeof obj.lastName !== 'undefined' &&
    typeof obj.email !== 'undefined' &&
    typeof obj.password !== 'undefined'
  )
}

function isAccountRecord(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.name !== 'undefined' &&
    typeof obj.type !== 'undefined' &&
    typeof obj.userId !== 'undefined' &&
    (typeof obj.balance !== 'undefined' || typeof obj.plaidAccountId !== 'undefined')
  )
}

function encryptData(data: Record<string, unknown>, model: string): void {
  const fields = ENCRYPTED_FIELDS[model]
  if (!fields) return
  for (const key of fields) {
    const val = data[key]
    if (typeof val === 'string' && val.length > 0) {
      try {
        ;(data as Record<string, unknown>)[key] = encrypt(val)
      } catch {
        // ENCRYPTION_KEY not set or invalid; skip
      }
    }
  }
}

function decryptRecord(obj: Record<string, unknown>): void {
  if (isUserRecord(obj)) {
    for (const key of USER_FIELDS) {
      const val = obj[key]
      if (typeof val === 'string' && isEncrypted(val)) {
        try {
          obj[key] = decrypt(val)
        } catch {
          // leave as-is on failure
        }
      }
    }
  }
  if (isAccountRecord(obj)) {
    for (const key of ACCOUNT_FIELDS) {
      const val = obj[key]
      if (typeof val === 'string' && isEncrypted(val)) {
        try {
          obj[key] = decrypt(val)
        } catch {
          // leave as-is on failure
        }
      }
    }
  }
}

function walkAndDecrypt(value: unknown): void {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach(walkAndDecrypt)
    return
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    decryptRecord(obj)
    for (const v of Object.values(obj)) {
      walkAndDecrypt(v)
    }
  }
}

const WRITE_OPERATIONS = new Set(['create', 'update', 'updateMany', 'createMany'])
const READ_OPERATIONS = new Set(['findUnique', 'findFirst', 'findMany'])

export function createEncryptionExtension() {
  return {
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string | undefined
          operation: string
          args: { data?: Record<string, unknown> | Record<string, unknown>[] }
          query: (args: unknown) => Promise<unknown>
        }) {
          if (model && ENCRYPTED_FIELDS[model]) {
            if (WRITE_OPERATIONS.has(operation) && args.data) {
              if (Array.isArray(args.data)) {
                args.data.forEach((item: Record<string, unknown>) => encryptData(item, model))
              } else {
                encryptData(args.data as Record<string, unknown>, model)
              }
            }
          }

          const result = await query(args)

          if (model && READ_OPERATIONS.has(operation)) {
            walkAndDecrypt(result)
          }

          return result
        },
      },
    },
  }
}
