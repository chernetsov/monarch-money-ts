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
monarch-money accounts refresh [input]
monarch-money accounts refresh-status [input]

monarch-money transactions list [input]
monarch-money transactions get [input]
monarch-money transactions update [input]
monarch-money transactions set-tags [input]
monarch-money transactions splits get [input]
monarch-money transactions splits update [input]

monarch-money tags list [input]
monarch-money tags create [input]

monarch-money categories list
monarch-money categories groups
monarch-money categories get [input]
monarch-money categories create [input]
monarch-money categories restore [input]

monarch-money budget report [input]
monarch-money budget status
monarch-money budget settings
monarch-money budget set [input]

monarch-money cashflow summary [input]
monarch-money cashflow by-category [input]
monarch-money cashflow breakdown [input]

monarch-money portfolio [input]

monarch-money recurring streams [input]
monarch-money recurring aggregated [input]   # alias: recurring items

monarch-money rules list
monarch-money rules preview [input]
monarch-money rules create [input]

monarch-money schemas list
monarch-money schemas get <name>
```

### Examples

Mutating commands change live Monarch data: `budget set`, `categories create`, `categories restore`, `rules create`, `tags create`, `transactions set-tags`, `transactions splits update`, and `accounts refresh`.

```bash
# Set a category's planned amount for October only (use categoryGroupId for a group)
monarch-money budget set '{"categoryId":"CATEGORY_ID","amount":250,"startDate":"2026-10-01","applyToFuture":false}'

# Tags
monarch-money tags list
monarch-money tags create '{"name":"Reimbursable","color":"#19D2A5"}'
monarch-money transactions set-tags '{"transactionId":"TRANSACTION_ID","tagIds":["TAG_ID"]}'

# Splits: splitData replaces all splits; amounts must sum to the parent amount; [] removes splits
monarch-money transactions splits get '{"id":"TRANSACTION_ID"}'
monarch-money transactions splits update '{"transactionId":"TRANSACTION_ID","splitData":[{"merchantName":"Costco","amount":-60,"categoryId":"CATEGORY_ID"},{"merchantName":"Costco","amount":-40,"categoryId":"CATEGORY_ID"}]}'

# Cash flow (omit both dates for the current month)
monarch-money cashflow summary '{"startDate":"2026-09-01","endDate":"2026-09-30"}'
monarch-money cashflow by-category '{"startDate":"2026-09-01","endDate":"2026-09-30"}'

# Recurring
monarch-money recurring streams
monarch-money recurring items '{"startDate":"2026-10-01","endDate":"2026-10-31"}'

# Refresh all accounts (or pass accountIds) and wait up to 5 minutes
monarch-money accounts refresh '{"wait":true,"timeoutSeconds":300}'
monarch-money accounts refresh-status
```
