# Monarch Money CLI

The `monarch-money-ts` package installs a `monarch-money` executable for scriptable access to the library APIs.

The CLI is designed for automation and AI agents:

- Commands use conventional subcommands.
- Command inputs are JSON.
- Command outputs are JSON envelopes.
- Help is compact and references named schemas.
- Full JSON Schemas are available through the schema registry.

## Installation

```bash
npm install -g monarch-money-ts
monarch-money --help
```

For local development:

```bash
pnpm build
pnpm cli -- --help
```

## Authentication

The CLI resolves authentication in this order:

1. `MONARCH_TOKEN`
2. `MONARCH_EMAIL` and `MONARCH_PASSWORD` with optional `MONARCH_OTP_KEY`
3. Cached token from the auth state file

Log in once and cache the session token:

```bash
monarch-money auth login
```

The default auth state file is:

```text
~/.monarch-money/auth.json
```

Set `MONARCH_AUTH_FILE` to share auth state across projects or sandboxes:

```bash
export MONARCH_AUTH_FILE="$HOME/.config/monarch-money/auth.json"
monarch-money auth login
```

The auth state file stores only session token metadata. It does not store the password or TOTP secret.

Inspect or clear auth state:

```bash
monarch-money auth status
monarch-money auth logout
```

## Input and Output

Pass command input as a single JSON argument:

```bash
monarch-money transactions list '{"limit":10}'
monarch-money transactions get '{"id":"TRANSACTION_ID"}'
monarch-money budget report '{"startDate":"2026-05-01","endDate":"2026-05-31"}'
```

Use `-` to read JSON from stdin:

```bash
printf '%s' '{"limit":10}' | monarch-money transactions list -
```

Successful commands return:

```json
{
  "ok": true,
  "data": {}
}
```

Failed commands return:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Run `monarch-money auth login`, set MONARCH_TOKEN, or set MONARCH_EMAIL and MONARCH_PASSWORD with optional MONARCH_OTP_KEY."
  }
}
```

## Schemas

Leaf command help shows named input and output schemas:

```bash
monarch-money transactions list --help
```

List all schemas:

```bash
monarch-money schemas list
```

Print a schema:

```bash
monarch-money schemas get input.transactions.list
monarch-money schemas get output.transactions.list
```

Reusable input schemas live in the library type modules next to their inferred TypeScript types. CLI-only wrapper schemas are used only when a command needs to adapt multiple library arguments into one JSON input object.

## Commands

```bash
monarch-money accounts list [input]

monarch-money transactions list [input]
monarch-money transactions get [input]
monarch-money transactions update [input]

monarch-money categories list
monarch-money categories groups
monarch-money categories get [input]

monarch-money budget report [input]
monarch-money budget status
monarch-money budget settings

monarch-money portfolio [input]

monarch-money rules list
monarch-money rules preview [input]

monarch-money schemas list
monarch-money schemas get <name>
```
