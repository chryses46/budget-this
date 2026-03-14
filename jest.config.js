const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^./auth-utils$': '<rootDir>/src/lib/auth-utils',
    '^./email$': '<rootDir>/src/lib/email',
    '^./prisma$': '<rootDir>/src/lib/prisma',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/app/globals.css',
    '!src/app/favicon.ico',
    '!src/types/**/*',
    '!src/app/api/auth/[...nextauth]/route.ts',
    '!src/__tests__/**',
    '!src/app/**/page.tsx',
    '!src/lib/auth.ts',
    '!src/components/LoginFormContent.tsx',
    '!src/components/RegisterFormContent.tsx',
    '!src/components/InactivityLogoutProvider.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/helpers/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)