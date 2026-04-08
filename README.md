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

## API Coverage

All API functions follow the same pattern: `apiFunction(auth, client, options?)`. Every response is validated at runtime with [Zod](https://zod.dev/) schemas.

This library covers a subset of Monarch Money's GraphQL API. The table below shows what's implemented and what's not yet available. Coverage is compared against the known API surface from the [Python monarchmoney library](https://github.com/hammem/monarchmoney).

| Domain           | Operation                           | Status | Function                                         |
| ---------------- | ----------------------------------- | ------ | ------------------------------------------------ |
| **Accounts**     | List accounts                       | Done   | `getAccounts`                                    |
|                  | Get account type options            | --     |                                                  |
|                  | Get recent account balances         | --     |                                                  |
|                  | Get account snapshots by type       | --     |                                                  |
|                  | Get aggregate snapshots (net worth) | --     |                                                  |
|                  | Create manual account               | --     |                                                  |
|                  | Update account                      | --     |                                                  |
|                  | Delete account                      | --     |                                                  |
|                  | Refresh accounts (sync)             | --     |                                                  |
|                  | Get account history                 | --     |                                                  |
| **Transactions** | List transactions                   | Done   | `getTransactions`                                |
|                  | Get transaction details             | Done   | `getTransaction`                                 |
|                  | Update transaction                  | Done   | `updateTransaction`                              |
|                  | Create transaction                  | --     |                                                  |
|                  | Delete transaction                  | --     |                                                  |
|                  | Get transaction splits              | --     |                                                  |
|                  | Update transaction splits           | --     |                                                  |
|                  | Get transactions summary            | --     |                                                  |
| **Categories**   | List categories & groups            | Done   | `getBudgetCategories`, `getBudgetCategoryGroups` |
|                  | Get category detail                 | Done   | `getBudgetCategory`                              |
|                  | Create category                     | --     |                                                  |
|                  | Delete category                     | --     |                                                  |
| **Tags**         | List tags                           | --     |                                                  |
|                  | Create tag                          | --     |                                                  |
|                  | Set transaction tags                | --     |                                                  |
| **Budgets**      | Get budget report                   | Done   | `getBudgetReport`                                |
|                  | Get budget status                   | Done   | `getBudgetStatus`                                |
|                  | Get budget settings                 | Done   | `getBudgetSettings`                              |
|                  | Set budget amount                   | --     |                                                  |
| **Portfolio**    | Get portfolio holdings              | Done   | `getPortfolio`                                   |
| **Rules**        | List transaction rules              | Done   | `getTransactionRules`                            |
|                  | Preview transaction rule            | Done   | `previewTransactionRule`                         |
|                  | Create / update / delete rules      | --     |                                                  |
| **Cash Flow**    | Get cash flow breakdown             | --     |                                                  |
|                  | Get cash flow summary               | --     |                                                  |
| **Recurring**    | Get recurring transactions          | --     |                                                  |
| **Institutions** | List institutions                   | --     |                                                  |
| **Subscription** | Get subscription details            | --     |                                                  |

Contributions to expand coverage are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for the traffic-driven workflow used to add new APIs.

## Type System

The library exports both Zod schemas and inferred TypeScript types for all API responses:

```typescript
import { type Account, AccountSchema, type Transaction, TransactionSchema } from 'monarch-money-ts';
```

## How This Library Is Built

This library uses an **AI-assisted agent workflow**. Instead of reverse-engineering APIs manually, real traffic logs are captured from Monarch Money using a [browser extension](./traffic-recorder-extension/README.md) and analyzed with the [traffic analyzer tool](./mmtraf.md). An AI assistant then builds and validates the API schemas and client code from the observed requests and responses.

Every API module has a corresponding integration test that runs against the live Monarch GraphQL endpoint, so the Zod schemas are continuously validated against real responses. If Monarch changes their API shape, the strict schemas will fail on parse and surface the drift immediately.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, testing, and contribution guidelines.

## License

[MIT](./LICENSE)
