# Budget This - Personal Finance Tracker

A modern, mobile-first budget and bill tracking application built with Next.js, Prisma, MySQL, and Plaid integration.

## Features

- **Authentication**: Email verification and MFA (Multi-Factor Authentication); in development, MFA can be bypassed (password-only login).
- **Dashboard**: Overview of accounts, bills, spending categories, burn-down chart, and last 5 expenditures.
- **Bills Management**: Add, edit, and delete recurring bills with frequency tracking; search by bill name and filter by type (Weekly/Monthly/Yearly); optional **Is Autopay** (autopay bills at or past due show as "Paid" and not "Late").
- **Budget Categories**: Create budget categories with spending limits; budget page shows only **current-month** expenditures.
- **Expenditures**: Dedicated **Expenditures** page with search by title, date range (createdAt), and category filter; pagination; Add/Edit/Delete with optional **Date** (stored as `createdAt`). Add/Edit expenditure modal also available from the Accounts page.
- **Accounts**: View and edit accounts; add expenditures from account cards (same modal as Expenditures page); recent activity shown as "Recent Expenditures."
- **Bank Integration**: Connect bank accounts via Plaid API (placeholder implementation).
- **Mobile-First Design**: Responsive UI optimized for mobile devices.

## Features Overview

### Dashboard
- Total account balance overview
- Top 5 bills by amount
- Next 5 upcoming bills
- Top 5 spending categories for the past month
- **Last 5 Expenditures** with link to full Expenditures page
- **Burn-down chart**: (total assets) − (total bills) − (current month expenditures only)

### Bills Management
- Add bills with title, amount, due date, frequency, and **Is Autopay**
- **Search** by bill name and **filter** by type (client-side; no full-page reload)
- Edit and delete existing bills
- Autopay bills at or past due display as "Paid" and do not show as "Late"

### Budget Management
- Create budget categories with spending limits
- **Current-month only**: only expenditures from the current calendar month are shown and counted in "total spent"
- View spending against budget limits with visual progress bars
- Add/edit/delete expenditures from the **Expenditures** page (or from Accounts)

### Expenditures Page
- **Search** by title, **date range** (createdAt), and **category** filter
- **Pagination** (e.g. page size 20)
- **Add / Edit / Delete** expenditures with optional **Date** (stored as `createdAt`); Action column with Edit and Delete
- Filters and page synced to URL for shareable links

### Accounts
- View and edit accounts (with error handling and loading state on save)
- **Add Expenditure** from account card (same modal as Expenditures page; category dropdown uses account-linked categories when available)
- **Recent Expenditures** list (no "Expenditure:" prefix)

## API authentication

Protected API routes accept either:

1. **Session (browser client)**: A valid NextAuth session cookie.
2. **API key (non-browser)**: Send the key in the request so the server can authenticate without a session.

**Sending an API key**

- **`Authorization: Bearer <api_key>`** (preferred), or  
- **`X-API-Key: <api_key>`**

**Creating API keys**

- **POST /api/api-keys**: Create a new API key (requires a logged-in session; cannot use an API key to create another key). Body: `{ "name": "optional label" }`. Response includes `key` **once**; store it securely. The raw key is never stored or shown again.
- **GET /api/api-keys**: List your API keys (id, name, createdAt, lastUsedAt). Supports session or API key auth.
- **DELETE /api/api-keys/[id]**: Revoke an API key. Supports session or API key auth; the key must belong to the authenticated user.

API keys are stored in the database with a SHA-256 **keyHash** for lookup and an **encrypted** value at rest (using `ENCRYPTION_KEY`). The secret is only returned in the create response; afterwards only the hash is used to validate requests.

## Encryption at rest

Sensitive data is encrypted before being written to the database and decrypted on the server when read.

- **User**: `firstName`, `lastName`, and `email` are encrypted; lookup by email uses a stored **emailHash** (SHA-256).
- **Account**: `name`, `type`, `subtype`, `institution`, and `institutionId` are encrypted.
- **MfaCode**: Only a **codeHash** (SHA-256) is stored; the code is sent by email and never stored in plain form.
- **PasswordReset**: Only a **tokenHash** (SHA-256) is stored; the token is sent in the reset link and never stored in plain form.
- **ApiKey**: The secret is stored as **keyEncrypted** (AES-256-GCM) and **keyHash** (SHA-256) for lookup; the raw key is returned only once on create.

**Requirements**

- Set **`ENCRYPTION_KEY`** in your environment: a 32-byte value, base64-encoded (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). Required for encryption/decryption; omit or leave unset to run without field encryption (e.g. local dev with plain data).
- Encryption/decryption is implemented in `src/lib/field-encryption.ts` (AES-256-GCM) and applied via a Prisma client extension in `src/lib/prisma.ts`.

**After running migrations**

To encrypt existing rows and backfill lookup hashes (emailHash, codeHash, tokenHash), run:

```bash
ENCRYPTION_KEY=<your-base64-key> npm run backfill:encryption
```

This uses a raw Prisma client (no extension) so it can read current plaintext and write encrypted values and hashes. Run once after applying the encryption migration; new data is encrypted automatically by the app when `ENCRYPTION_KEY` is set.

## Environment variables

Optional client-side variables for inactivity auto-logout (defaults used if unset):

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_INACTIVITY_LOGOUT_SECONDS` | Idle time (seconds) before showing the logout warning modal | `300` (5 min) |
| `NEXT_PUBLIC_LOGOUT_WARNING_SECONDS` | Countdown duration (seconds) shown in the modal before logout | `60` |

Other environment variables (e.g. `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, database URL) are documented in their respective sections.

## Tech Stack

- **Next.js** 15 (App Router)
- **React** 19
- **Prisma** 6 (MySQL)
- **NextAuth** (credentials + MFA)
- **Tailwind CSS**, **Radix UI**, **React Hook Form**, **Zod**