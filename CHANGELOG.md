# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **mmcap** — interactive Playwright capture of Monarch GraphQL traffic to `traffic/logs/mmcap-YYYY-MM-DD.jsonl` ([mmcap.md](./mmcap.md))
- **mmtraf** JSONL support — `list`, `summary`, and index commands work on `.jsonl` logs (with `idx` column in summary)
- Recurring transactions APIs: `getRecurringTransactionStreams` and `getAggregatedRecurringItems`
- Recurring CLI commands: `monarch-money recurring streams` and `monarch-money recurring aggregated` (alias `recurring items`)
- Budget API `setBudgetAmount` and CLI `monarch-money budget set`
- Tags APIs `getTransactionTags`, `createTransactionTag`, `setTransactionTags` and CLI `tags list`, `tags create`, `transactions set-tags`
- Transaction split APIs `getTransactionSplits`, `updateTransactionSplits` and CLI `transactions splits get`, `transactions splits update`
- Cash flow APIs `getCashflow`, `getCashflowSummary` and CLI `cashflow summary`, `cashflow by-category`, `cashflow breakdown`
- Account refresh APIs `requestAccountsRefresh`, `getAccountsRefreshStatus`, `isAccountsRefreshComplete`, `refreshAccounts` and CLI `accounts refresh` (optional `wait`) and `accounts refresh-status`
- Category APIs `createCategory`, `restoreCategory` and CLI `categories create`, `categories restore` (re-enables a disabled system category)
- Rule API `createTransactionRule` and CLI `rules create`
- Delete APIs `deleteCategory`, `deleteTransactionTag`, `deleteTransactionRule` and CLI `categories delete`, `tags delete`, `rules delete`
- CLI schemas for the new commands (`input.budget.set`, `input.category.create`, `input.rule.create`, `input.tags.list`, `input.cashflow`, `input.accounts.refresh`, and matching outputs)
- Mocked unit tests for the new APIs (`src/api.test.ts`)
- Integration tests for transaction filters, mutation field errors, cash flow filters, and create/delete round trips for tags, categories, rules, and budget amounts (each cleans up after itself)

### Fixed

- `getTransactions` filters `accountIds`, `categoryIds`, `merchantIds`, `tagIds`, `goalIds`, `isSplitTransaction`, and `amount`/`amountOperator` are translated to the server's `TransactionFilterInput` fields; previously they failed with a masked server error
- Mutation errors with a null `message` (e.g. updating a transaction to a disabled category) now surface the field errors instead of a schema validation failure; `MutationErrorSchema.message` is nullable and `MonarchMutationError.fromPayload` builds the message
- Cash flow `filters` use the same server field translation as `getTransactions`
- `amountOperator` is validated as `lt`, `lte`, `eq`, `gte`, or `gt`

### Changed

- Traffic capture workflow documented around `mmcap` instead of the Chrome DevTools extension

### Removed

- Traffic recorder Chrome extension (`traffic-recorder-extension/`)

## [0.2.0] - 2026-05-17

### Added

- `monarch-money` CLI executable with JSON input/output commands for the existing API surface
- Stateful CLI authentication with `auth login`, `auth status`, `auth logout`, and configurable `MONARCH_AUTH_FILE`
- CLI JSON Schema registry via `schemas list` and `schemas get <name>`
- Exported Zod input schemas for accounts, transactions, budgets, portfolio, and transaction rule preview APIs
- CLI documentation in `CLI.md`

### Changed

- Moved `commander` to runtime dependencies for the published CLI
- Documented CLI and reusable input schema conventions

## [0.1.0] - 2026-04-08

### Added

- LICENSE file (MIT)
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- CONTRIBUTING.md with setup, traffic-driven workflow, and code conventions
- CHANGELOG.md
- `.env.example` with placeholder credentials
- ESLint (typescript-eslint) + Prettier configuration
- Lint and format check steps in CI workflow
- Lint and test steps in publish workflow before npm publish
- API coverage table in README and AGENTS.md

### Changed

- Rewrote README with badges, installation, usage examples, auth docs, and coverage matrix
- Aligned CI to Node 22 (matches `.nvmrc`)
- Publish workflow uses `npx npm@11` for OIDC trusted publishing
- Squash-merge only with auto-delete branches on GitHub
- Branch protection on `main` (requires PR review + CI)

### Fixed

- Removed `test-utils` from public barrel export (`src/index.ts`)
- Fixed broken import path in `tools/auth-test-cli.ts`
- Fixed stale `src/new/` path references in AGENTS.md
- Cleaned up unused type imports across the codebase
- Added `{ cause }` to re-thrown errors in `auth.ts`

## [0.0.7] - 2025-06-01

### Added

- Budget report APIs with comprehensive types and integration tests
- `getTransaction` API for fetching individual transactions
- Generic `updateTransaction` function with review status support
- Transaction rules API

### Changed

- Migrated API endpoints from `api.monarchmoney.com` to `api.monarch.com`
- Added login rate-limit handling with `LoginThrottledError` and cooldown logic

### Fixed

- Handle non-existent transactions in `getTransaction` (returns `null`)
- Made `merchantCriteria` nullable in `TransactionRuleSchema`

### Removed

- Deprecated `updateTransactionCategory` (use `updateTransaction` instead)

## [0.0.6] - 2025-05-01

### Added

- `getTransaction` API for single transaction lookup
- Removed deprecated `updateTransactionCategory`

## [0.0.5] - 2025-04-01

### Added

- Budget report APIs with types and integration tests

## [0.0.2] - 2025-03-01

### Added

- CI and publish workflows
- Initial accounts, transactions, categories, and portfolio APIs
- Zod-validated types for all API responses
- `FixedTokenAuthProvider` and `EmailPasswordAuthProvider`
- Traffic recorder Chrome extension
