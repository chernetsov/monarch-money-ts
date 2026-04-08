# Contributing

Thanks for your interest in contributing to monarch-money-ts! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v9+
- A [Monarch Money](https://www.monarchmoney.com/) account (for integration tests)

## Setup

```bash
git clone https://github.com/chernetsov/monarch-money-ts.git
cd monarch-money-ts
pnpm install
```

Copy the environment template and fill in your credentials:

```bash
cp .env.example .env
```

## Development

Build the project:

```bash
pnpm build
```

Run unit tests:

```bash
pnpm test
```

Run integration tests (requires Monarch Money credentials in `.env`):

```bash
pnpm test:integration
```

## Project Structure

```
src/
  *.types.ts      # Zod schemas, TypeScript types, and GraphQL field constants
  *.api.ts        # API functions (one per domain)
  *.int.test.ts   # Integration tests
  common.types.ts # Shared summary types across domains
  auth.ts         # Authentication providers
  graphql.ts      # GraphQL client wrapper
  index.ts        # Public barrel export
tools/            # Dev-only CLI utilities
traffic-recorder-extension/  # Chrome extension for capturing API traffic
```

## Adding a New API

This project uses a traffic-driven workflow:

1. **Capture traffic** — Use the [traffic recorder extension](./traffic-recorder-extension/README.md) to capture GraphQL requests from Monarch Money in your browser.

2. **Analyze traffic** — Use the `mmtraf` tool (`pnpm mmtraf`) to inspect captured requests and responses. See [mmtraf.md](./mmtraf.md) for usage.

3. **Define types** — Create `src/<domain>.types.ts` with Zod schemas using `.strict()`, a `*_FIELDS` constant for GraphQL field selection, and exported TypeScript types via `z.infer<>`.

4. **Implement API** — Create `src/<domain>.api.ts`. Functions accept `auth: AuthProvider` and `client: MonarchGraphQLClient`, use `gql` tagged templates, and validate responses with the Zod schema.

5. **Export** — Add re-exports to `src/index.ts`.

6. **Test** — Add integration tests in `src/<domain>.int.test.ts`.

## Code Conventions

- Use `.strict()` on Zod object schemas
- Express nullability with `.nullable()` at the property level
- Define `*_FIELDS` constants alongside schemas for GraphQL field selection
- Validate all GraphQL responses with Zod before returning
- Summary types (lightweight versions used in other responses) go in `common.types.ts` with a `*Summary` suffix

## Submitting Changes

1. Fork the repository and create a feature branch
2. Make your changes with tests
3. Ensure `pnpm build` and `pnpm test` pass
4. Open a pull request with a clear description of what changed and why

## Releasing

Releases are handled by maintainers. The process is:

1. Bump the version in `package.json`
2. Push a `v*.*.*` tag — CI builds, tests, and publishes to npm automatically
