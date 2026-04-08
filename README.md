# Monarch Money TypeScript API

[![npm version](https://img.shields.io/npm/v/monarch-money-ts.svg)](https://www.npmjs.com/package/monarch-money-ts)
[![CI](https://github.com/chernetsov/monarch-money-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/chernetsov/monarch-money-ts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An unofficial TypeScript client for the [Monarch Money](https://www.monarchmoney.com/) API with comprehensive Zod-validated types.

> **Disclaimer:** This library is not affiliated with or endorsed by Monarch Money. It interacts with Monarch's internal GraphQL API, which may change without notice.

## Installation

```bash
npm install monarch-money-ts
# or
pnpm add monarch-money-ts
```

## Quick Start

```typescript
import { FixedTokenAuthProvider, MonarchGraphQLClient, getAccounts } from 'monarch-money-ts';

const auth = new FixedTokenAuthProvider('your-monarch-token');
const client = new MonarchGraphQLClient();

const accounts = await getAccounts(auth, client);
console.log(accounts);
```

### Authentication

The library provides two authentication strategies:

**Fixed token** — use a token extracted from an active browser session:

```typescript
import { FixedTokenAuthProvider } from 'monarch-money-ts';

const auth = new FixedTokenAuthProvider(process.env.MONARCH_TOKEN);
```

**Email/password** — logs in via Monarch's auth endpoint, with optional TOTP support:

```typescript
import { EmailPasswordAuthProvider } from 'monarch-money-ts';

const auth = new EmailPasswordAuthProvider({
  email: process.env.MONARCH_EMAIL,
  password: process.env.MONARCH_PASSWORD,
  totpKey: process.env.MONARCH_OTP_KEY, // optional
});
```

Both implement the `AuthProvider` interface and can be passed to any API function.

## Available APIs

All API functions follow the same pattern: `apiFunction(auth, client, options?)`.

| Domain           | Functions                                                | Description                                 |
| ---------------- | -------------------------------------------------------- | ------------------------------------------- |
| **Accounts**     | `getAccounts`                                            | List accounts with optional filters         |
| **Transactions** | `getTransactions`, `getTransaction`, `updateTransaction` | Query, fetch, and update transactions       |
| **Categories**   | `getCategories`                                          | List transaction categories                 |
| **Budgets**      | `getBudgetReport`                                        | Retrieve budget data and spending summaries |
| **Portfolio**    | `getPortfolio`                                           | Investment portfolio holdings               |
| **Rules**        | `getRules`                                               | Transaction categorization rules            |

Every response is validated at runtime with [Zod](https://zod.dev/) schemas, so you get both TypeScript types and runtime guarantees.

## Type System

The library exports both Zod schemas and inferred TypeScript types for all API responses:

```typescript
import { type Account, AccountSchema, type Transaction, TransactionSchema } from 'monarch-money-ts';
```

## How This Library Is Built

This library uses an **AI-assisted agent workflow**. Instead of reverse-engineering APIs manually, real traffic logs are captured from Monarch Money using a [browser extension](./traffic-recorder-extension/README.md) and analyzed with the [traffic analyzer tool](./mmtraf.md). An AI assistant then builds and validates the API schemas and client code from the observed requests and responses.

This ensures the TypeScript types accurately reflect actual API behavior and allows rapid iteration as the API evolves.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and contribution guidelines.

## License

[MIT](./LICENSE)
