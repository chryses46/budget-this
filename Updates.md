# Merge Request: Security, API Keys, Encryption, Expenditures & UX

## Summary

This MR introduces encryption-at-rest for sensitive data, API key authentication for non-browser clients, a dedicated Expenditures page with filtering and pagination, bill autopay handling, expenditure–account linking, inactivity-based logout, and shared auth UI (AuthModal, form content components). Protected API routes are unified to support both session and API key auth. Test infrastructure is in place and auth/lib tests exist; expanding test coverage for new and touched code is planned.

---

## 1. Encryption at Rest & Lookup Fields

**Intent:** Encrypt PII and secrets in the database and use hashed lookup fields so plaintext is never stored or queried.

**Schema / migrations:**

- **`20250314000000_encryption_lookup_fields`**
  - **users:** Drop unique on `email`, add `emailHash` (unique). Email remains in DB but is encrypted; login uses `emailHash` (SHA-256 of normalized email).
  - **password_resets:** Add `tokenHash` (unique), make `token` optional (token no longer stored plain).
  - **mfa_codes:** Add `codeHash` (unique), make `code` optional (MFA code not stored plain).

**Implementation:**

- **`src/lib/field-encryption.ts`**  
  AES-256-GCM helpers: `encrypt`, `decrypt`, `isEncrypted`, `hashForLookup`. Key from `ENCRYPTION_KEY` (32-byte base64). Ciphertext format: base64(iv:authTag:ciphertext).
- **`src/lib/prisma-encryption-middleware.ts`**  
  Prisma extension that encrypts/decrypts configured fields on write/read.
- **`src/lib/prisma.ts`**  
  Prisma client is extended with the encryption middleware when `ENCRYPTION_KEY` is set; otherwise plain client for local/dev.
- **Backfill:** README documents `npm run backfill:encryption` (e.g. `scripts/backfill-encryption.ts`) to encrypt existing rows and backfill hashes after migration.

**Touched areas:** Auth flows (register, email-login, verify-email, forgot-password, reset-password, change-password, MFA, validate-credentials) and any code that reads/writes User, Account, MfaCode, PasswordReset now go through the extended client and/or use `hashForLookup` for lookups.

---

## 2. API Keys (Create, List, Revoke) & API Auth

**Intent:** Allow non-browser clients to call the same APIs using API keys; keys are hashed and stored encrypted.

**Schema / migrations:**

- **`20250314000001_add_api_keys`**  
  New table `api_keys`: `id`, `userId`, `name`, `keyHash` (unique), `keyEncrypted`, `createdAt`, `lastUsedAt`. FK to `users` with CASCADE.

**Implementation:**

- **`src/lib/api-auth.ts`**  
  - `getApiKeyFromRequest(request)`: reads key from `Authorization: Bearer <key>` or `X-API-Key: <key>`.
  - `requireApiAuth(request)`: returns `{ userId }` if session exists or if a valid API key is present; otherwise returns 401. On API key use, updates `lastUsedAt`.
- **API routes:**
  - **POST/GET `/api/api-keys`**, **DELETE `/api/api-keys/[id]`**  
    Create (session-only; raw key returned once), list, and revoke keys. Create uses `hashForLookup` + `encrypt` from field-encryption; key is never stored or returned again.
- **Protected routes** now use `requireApiAuth(request)` instead of only `getServerSession`: accounts, accounts/[id], accounts/[id]/transactions, bills, bills/[id], bills/[id]/pay, bills/reset-monthly, budget-categories, budget-categories/[id], expenditures, expenditures/[id], transactions, plaid/link, auth/change-password.  
  So both session (browser) and API key (e.g. scripts, mobile) are supported.

**Security:** Raw API key is returned only in the create response; thereafter only `keyHash` is used for validation and `keyEncrypted` for storage (with `ENCRYPTION_KEY`).

---

## 3. Expenditures Page & Account Linkage

**Intent:** Full CRUD for expenditures with search, date range, category filter, pagination, and optional link to an account.

**Schema / migrations:**

- **`20250315000000_add_expenditure_account_id`**  
  `expenditures.accountId` (nullable FK to `accounts`, SET NULL on delete).

**Implementation:**

- **`src/app/expenditures/page.tsx`**  
  Client page: list expenditures with filters (title, date range on `createdAt`, category), pagination (e.g. page size 20), URL-synced params, Add/Edit/Delete with modal; optional `accountId` and `createdAt` (date) on create/update. Fetches budget categories and accounts for dropdowns.
- **`src/app/api/expenditures/route.ts`** and **`src/app/api/expenditures/[id]/route.ts`**  
  Use `requireApiAuth`; support `accountId` and date in body where applicable. Accounts page can add expenditures (same modal) and show "Recent Expenditures" without "Expenditure:" prefix (per README).

---

## 4. Bills: Autopay Flag & Behavior

**Intent:** Mark bills as autopay and treat them as "Paid" when at or past due (no "Late" for autopay).

**Schema / migrations:**

- **`20251014000000_add_bill_is_autopay`**  
  `bills.isAutopay` (boolean, default false).

**Implementation:**

- **`prisma/schema.prisma`**  
  Bill model has `isAutopay`.
- **`src/app/api/bills/route.ts`**, **`src/app/api/bills/[id]/route.ts`**  
  Accept and persist `isAutopay`.
- **`src/app/bills/page.tsx`**  
  UI to set/edit "Is Autopay"; list/display logic treats autopay bills at or past due as "Paid" and not "Late".
- **`src/app/api/bills/reset-monthly/route.ts`**  
  Reset logic respects paid/autopay state as needed.

---

## 5. Auth UX: Modal, Forms, Inactivity Logout

**Intent:** Reusable auth UI and automatic logout on inactivity.

**New components:**

- **`src/components/AuthModal.tsx`**  
  Shared modal for login/register (or similar) to avoid duplicating auth UI across pages.
- **`src/components/LoginFormContent.tsx`**  
  Login form content (e.g. email, password, MFA) used inside AuthModal or standalone.
- **`src/components/RegisterFormContent.tsx`**  
  Registration form content used inside AuthModal or standalone.

**Inactivity logout:**

- **`src/components/InactivityLogoutProvider.tsx`**  
  Client component that tracks activity (throttled), shows a countdown modal when idle for `NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS` (default 300), then logs out after `NEXT_PUBLIC_LOGOUT_WARNING_SECONDS` (default 60). Uses `useSession` and `signOut` from next-auth.

**Integration:**

- **`src/components/Providers.tsx`**  
  Wraps app with `InactivityLogoutProvider` (and any other providers).
- **`src/components/Navigation.tsx`**  
  Updated to use the new auth modal or form components where appropriate.
- **`src/app/login/page.tsx`**, **`src/app/register/page.tsx`**, **`src/app/page.tsx`**  
  Use the shared auth components and flow.

---

## 6. Validation & Config

- **`src/lib/validations.ts`**  
  New or updated Zod schemas for expenditure (and possibly account) inputs, including optional `accountId` and date.
- **`.env`**  
  Documented or used: `ENCRYPTION_KEY`, `NEXTAUTH_*`, optional `NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS`, `NEXT_PUBLIC_LOGOUT_WARNING_SECONDS`, and other app/env vars as in README.

---

## 7. Tests & Planned Test Coverage

**Current test setup:**

- **`jest.setup.js`**  
  Polyfills for `Request`/`Response`, mocks for `next/navigation`, `next/link`, `next/image`, `next-auth/react`, `nodemailer`, `bcryptjs`, `window.matchMedia`, `localStorage`; env vars for tests.
- **Auth API tests:**  
  `src/app/api/auth/__tests__/email-login.test.ts`, `register.test.ts`, `verify-email.test.ts` (mock Prisma, field-encryption `hashForLookup`, auth helpers).
- **Lib tests:**  
  `src/lib/__tests__/auth.test.ts`, `auth-utils.test.ts`, `validations.test.ts`, `field-encryption.test.ts`, `prisma.test.ts`, etc.
- **Component tests:**  
  e.g. `Navigation.test.tsx`, `Providers.test.tsx`, `ThemeToggle.test.tsx`, `UserContext.test.tsx`, `ThemeContext.test.tsx`.
- **Other:**  
  `src/__tests__/middleware.test.ts`.

**Planned:**

- **API key flows:**  
  Unit/integration tests for `requireApiAuth` (session vs API key, invalid/missing key, 401), and for POST/GET/DELETE `/api/api-keys` (create with session, list/revoke with session or API key, no raw key on list).
- **Encryption:**  
  Tests for Prisma middleware (encrypt on create/update, decrypt on read) and for backfill script behavior where applicable.
- **Expenditures API:**  
  Tests for CRUD and filtering (title, date range, categoryId, accountId, pagination) with `requireApiAuth`.
- **Bills API:**  
  Tests for `isAutopay` in create/update and for reset-monthly with autopay semantics.
- **Inactivity logout:**  
  Component or integration tests for idle detection, modal display, and countdown/logout (with mocked timers and `signOut`).
- **Auth modal & form content:**  
  Component tests for login/register flows and validation errors.

Adding these will solidify regression safety for encryption, API keys, expenditures, bills, and auth UX.

---

## 8. Docs & Assets

- **README.md**  
  Updated with: encryption at rest (fields, ENCRYPTION_KEY, backfill), API key usage (Bearer and X-API-Key, create/list/revoke), optional inactivity env vars, and feature list (expenditures, bills autopay, accounts recent expenditures).
- **Public assets:**  
  Additions under `public/` (e.g. `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `img/cash.jpg`, `count-coins.jpg`, `savings.jpg`, `stocks.jpg`) for landing or marketing.

---

## 9. Dependency & Tooling

- **package.json**  
  Scripts: `test`, `test:watch`, `test:coverage`, `backfill:encryption`; Jest and testing-library versions as in repo.
- **.gitignore**  
  Adjusted for build artifacts, env, and test output as needed.

---

## Checklist for Reviewers

- [ ] Run migrations in order: encryption lookup fields → api_keys → expenditure accountId → bill isAutopay.
- [ ] Set `ENCRYPTION_KEY` (32-byte base64) for environments that use encryption; run backfill once after migrations if migrating existing data.
- [ ] Confirm API key create returns `key` once only; list/revoke work with session or API key.
- [ ] Verify protected routes accept both session and `Authorization: Bearer` / `X-API-Key`.
- [ ] Test Expenditures page: filters, pagination, URL state, add/edit/delete with optional account and date.
- [ ] Test bills autopay flag and "Paid"/"Late" behavior.
- [ ] Test inactivity logout and auth modal on login/register and home.
- [ ] Run `npm run test` and, when added, `npm run test:coverage` for new tests.