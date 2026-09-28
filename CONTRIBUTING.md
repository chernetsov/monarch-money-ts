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
  cli/             # Published monarch-money CLI
  *.types.ts      # Zod schemas, TypeScript types, and GraphQL field constants
  *.api.ts        # API functions (one per domain)
  *.int.test.ts   # Integration tests
  common.types.ts # Shared summary types across domains
  auth.ts         # Authentication providers
  graphql.ts      # GraphQL client wrapper
  index.ts        # Public barrel export
tools/            # Dev-only CLI utilities (mmcap, mmtraf)
```

## Adding a New API

This project uses an **agent-driven, traffic-first workflow**. Capture is interactive (you log in by hand and browse); analysis, schema generation, API implementation, and tests are done by an AI coding agent.

### Capture (interactive)

1. **Record traffic** — Run `pnpm mmcap` ([mmcap.md](./mmcap.md)). A headed browser opens; log in manually, then browse Monarch. GraphQL calls append live to `traffic/logs/mmcap-YYYY-MM-DD.jsonl`.

The default mode is recorder-only. Use your browser normally, or use an existing browser-control surface to drive the page while `mmcap` records.

### The agent's part (automated)

2. **Analyze traffic** — The agent uses `pnpm mmtraf` to list, summarize, and inspect JSONL logs. See [mmtraf.md](./mmtraf.md).

3. **Define types** — The agent creates `src/<domain>.types.ts` with Zod schemas derived from the real response shapes, `*_FIELDS` constants for GraphQL field selection, and exported TypeScript types via `z.infer<>`.

4. **Implement API** — The agent creates `src/<domain>.api.ts` with functions that accept `auth: AuthProvider` and `client: MonarchGraphQLClient`, use `gql` tagged templates, and validate responses with the Zod schemas.

5. **Export** — The agent adds re-exports to `src/index.ts`.

6. **Test** — The agent writes integration tests in `src/<domain>.int.test.ts` that validate against the live API.

The coding conventions in `AGENTS.md` guide the agent through all of this. If you're contributing manually, those same conventions apply — but the intended workflow is to let the agent do the heavy lifting from the traffic logs.

## Code Conventions

- Use `.strict()` on Zod object schemas
- Express nullability with `.nullable()` at the property level
- Define reusable API input schemas as exported Zod schemas next to their inferred TypeScript types
- Define `*_FIELDS` constants alongside schemas for GraphQL field selection
- Validate all GraphQL responses with Zod before returning
- Summary types (lightweight versions used in other responses) go in `common.types.ts` with a `*Summary` suffix

## CLI Conventions

- Keep the published CLI in `src/cli/`
- Commands should accept at most one JSON input payload
- Commands should return JSON success/error envelopes
- Reuse library input/output Zod schemas in the CLI schema registry whenever possible
- Use CLI-only wrapper schemas only to adapt multiple library arguments into one JSON input payload
- Keep command help compact; expose full schemas through `monarch-money schemas list` and `monarch-money schemas get <name>`

## Submitting Changes

1. Fork the repository and create a feature branch
2. Make your changes with tests
3. Ensure `pnpm build` and `pnpm test` pass
4. Open a pull request with a clear description of what changed and why

## Releasing

Releases are handled by maintainers. The process is:

1. Bump the version in `package.json`
2. Push a `v*.*.*` tag — CI builds, tests, and publishes to npm automatically
