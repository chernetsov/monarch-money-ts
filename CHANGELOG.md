# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
