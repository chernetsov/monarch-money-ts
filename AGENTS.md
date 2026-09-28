# Repo Structure

`CLAUDE.md` is a symlink to this file (`AGENTS.md`). Both serve as agent instructions — edit `AGENTS.md` and the symlink keeps them in sync.

# API Coverage

This library covers a subset of Monarch Money's GraphQL API. When adding new functionality, check what's already implemented and what gaps remain.

**Implemented (33 functions across 9 domains):**

| Domain       | Functions                                                                                                                    | File                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Accounts     | `getAccounts`, `requestAccountsRefresh`, `getAccountsRefreshStatus`, `isAccountsRefreshComplete`, `refreshAccounts`          | `accounts.api.ts`     |
| Transactions | `getTransactions`, `getTransaction`, `updateTransaction`, `getTransactionSplits`, `updateTransactionSplits`                  | `transactions.api.ts` |
| Tags         | `getTransactionTags`, `createTransactionTag`, `setTransactionTags`, `deleteTransactionTag`                                   | `tags.api.ts`         |
| Categories   | `getBudgetCategories`, `getBudgetCategoryGroups`, `getBudgetCategory`, `createCategory`, `restoreCategory`, `deleteCategory` | `categories.api.ts`   |
| Budgets      | `getBudgetReport`, `getBudgetStatus`, `getBudgetSettings`, `setBudgetAmount`                                                 | `budget.api.ts`       |
| Cash Flow    | `getCashflow`, `getCashflowSummary`                                                                                          | `cashflow.api.ts`     |
| Portfolio    | `getPortfolio`                                                                                                               | `portfolio.api.ts`    |
| Rules        | `getTransactionRules`, `previewTransactionRule`, `createTransactionRule`, `deleteTransactionRule`                            | `rules.api.ts`        |
| Recurring    | `getRecurringTransactionStreams`, `getAggregatedRecurringItems`                                                              | `recurring.api.ts`    |

**Not yet implemented (known gaps):**

- **Accounts**: create/update/delete, balance history, snapshots, account types
- **Transactions**: create, delete, summary/aggregates
- **Categories**: update
- **Rules**: update
- **Recurring Transactions**: create/update/delete streams, mark items paid
- **Institutions**: list connected institutions (entire domain missing)
- **Subscription**: get subscription details (entire domain missing)

Reference: the [Python monarchmoney library](https://github.com/hammem/monarchmoney) covers the broadest known surface. Use it and captured traffic logs to identify fields and query shapes when adding new APIs.

# Traffic capture and analysis

Gitignored traffic logs live under `traffic/`. New captures use **mmcap** (`pnpm mmcap`) — interactive headed browser, manual login, append-only JSONL at `traffic/logs/mmcap-YYYY-MM-DD.jsonl`. See [mmcap.md](mmcap.md).

**mmtraf** (`pnpm mmtraf`) analyzes logs (JSONL and legacy JSON arrays). Read [mmtraf.md](mmtraf.md). Never load full log files into context.

Workflow: `pnpm mmtraf list` → `summary logs/mmcap-....jsonl` → `body:req-at` / `graphql:req-at` → `schema:res-at` → `body:res-at` with jq.

# Building APIs

When building APIs after looking at requests and responses, follow the following rules and conventions:

- **File naming convention**:
  - `*.types.ts` for domain schema modules (e.g., `accounts.types.ts`, `transactions.types.ts`)
  - `*.api.ts` for domain API modules (e.g., `accounts.api.ts`, `transactions.api.ts`)
  - `common.types.ts` for shared summary types used across domains
- **.api.ts (domain API modules)**:
  - **Auth and client**: API functions accept `auth: AuthProvider` and `client: MonarchGraphQLClient` as the first params.
  - **Function names**: Prefer descriptive verbs like `getAccounts(auth, client, filters?)`.
  - **GraphQL**: Use `gql` tagged templates and pass variables (e.g., `$filters: AccountFilters`) instead of hardcoding filters.
  - **Field selection**: Import `*_FIELDS` constants from types files and interpolate into queries (e.g., `${TRANSACTION_FIELDS}`).
  - **Parsing**: Always validate GraphQL responses with a Zod schema from the corresponding `*.types.ts` and return the parsed, typed data (not raw `data`).
  - **Error handling**: Rely on `MonarchGraphQLClient` to handle auth retries and wrap errors; do not silently coerce.
  - **Exports**: Re-export from `src/index.ts` to provide a stable surface.
- **.types.ts (domain schema modules)**:
  - **Zod strictness**: Use `.strict()` on object schemas to catch unexpected fields.
  - **Nullability**: Express nullability at the property level using `.nullable()`; avoid schema-level nullability and avoid silent coercion (no `.catch(undefined)`).
  - **Optional vs nullable**: Reserve `.optional()` for genuinely omitted fields; prefer `z.string().nullable()` for optional text that may be `null` in responses.
  - **Variability**: For highly variable sub-objects (e.g., `plaidStatus`), use `z.unknown().optional()` and refine later if needed.
  - **Types**: Export both the Zod schemas and `z.infer<>` TypeScript types for consumers.
  - **Inputs**: Define input types (e.g., `AccountFiltersInput`) to mirror traffic-observed filters without over-fitting.
  - **Full types vs Summary types**:
    - **Full types** live in domain `*.types.ts` files (e.g., `Account`, `BudgetCategory`) and are returned by dedicated APIs.
    - **Summary types** are lightweight versions embedded in other responses (e.g., `AccountSummary`, `CategorySummary`).
    - Name summaries with `*Summary` suffix to signal they're lightweight.
    - Place summaries in `common.types.ts` if reused across domains.
    - Add a docstring on summary types pointing to the full-detail API function.
  - **Field constants**: Define `*_FIELDS` constants next to each schema for GraphQL field selection.
    - Nested schemas compose via template interpolation (e.g., `category { ${CATEGORY_SUMMARY_FIELDS} }`).
    - This ensures schema and query stay in sync.
- **int.test.ts (integration tests)**:
  - **Setup**: Use `getIntegrationContext()` from `src/test-utils.ts` to obtain `auth` and `client`.
  - **Env**: Tests rely on `MONARCH_EMAIL`, `MONARCH_PASSWORD`, and optional `MONARCH_OTP_KEY`.
  - **Assertions**: Validate array shape and presence of key fields (e.g., `id`, `displayName`, `type`) rather than snapshots.
  - **Scope**: Exercise real GraphQL endpoints; prefer simple, robust expectations to handle live data variance.
  - **Naming**: Group by feature (e.g., `describe('integration: accounts', ...)`).

# Building the CLI

This package publishes the `monarch-money` CLI from `src/cli`.

- Keep CLI command inputs as a single JSON payload.
- Keep command outputs as JSON success/error envelopes.
- Reuse exported library Zod input/output schemas in the CLI schema registry whenever possible.
- Define reusable API input schemas in the domain `*.types.ts` file, not in `src/cli`.
- Use CLI-only wrapper schemas only when adapting multiple library function arguments into one JSON payload.
- Keep command `--help` compact by listing named schemas; expose full schemas through `monarch-money schemas list` and `monarch-money schemas get <name>`.
- Auth state should cache only session token metadata. Never cache passwords or TOTP secrets.

# Publishing

This package is published to npm automatically via CI when a version tag is pushed.

**Always update `CHANGELOG.md`** before releasing. Add a new section at the top following the [Keep a Changelog](https://keepachangelog.com/) format with Added/Changed/Fixed/Removed subsections as appropriate.

1. **Build and test**: Ensure all tests pass and the build succeeds locally

```bash
 pnpm build
 pnpm test
 pnpm test:integration  # optional but recommended
```

2. **Commit changes**: Push all changes to the repository

```bash
 git add .
 git commit -m "description of changes"
 git push
```

3. **Bump version**: Update version in `package.json` (follow semver)

```bash
 # For patch releases (bug fixes): 0.0.5 → 0.0.6
 # For minor releases (new features): 0.0.x → 0.1.0
 # For major releases (breaking changes): 0.x.y → 1.0.0
```

4. **Push tag**: Create and push a version tag to trigger CI publish

```bash
 git tag v0.0.6
 git push origin v0.0.6
```

5. **CI automatically**:

- Runs tests
- Builds the package
- Publishes to npm if tests pass

The CI workflow is triggered only by version tags (e.g., `v0.0.6`), not by regular commits.
