# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
