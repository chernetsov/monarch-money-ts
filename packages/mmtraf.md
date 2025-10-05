## mmtraf — Monarch Money traffic analyzer

Runs from traffic logs captured as JSON under the `traffic/` directory inside `packages/monarch-money-ts`. Best used with pnpm.

### Run

```bash
pnpm mmtraf --help
```

### Commands

- **list**: List traffic files and entry counts from `traffic/`.
  - Usage: `pnpm mmtraf list`

- **summary <filename>**: Show a one-line-per-request table summary for a file.
  - Usage: `pnpm mmtraf summary <filename>.json`
  - Columns: `gqlOp` (GraphQL operation name), `sizeReq`, `sizeRes`, `sizeTotal`.
  - Notes: Only prints the GraphQL operation name (not the full query). Sizes are based on raw body bytes.

- **show <filename> <index>**: Pretty-print a specific request/response with sensitive fields redacted.
  - Usage: `pnpm mmtraf show <filename>.json 0`
  - Omissions: request and response bodies are omitted; use `body:req-at`, `graphql:req-at`, and `body:res-at` to view them.

- **body:req-at <filename> <index>**: Output parsed request body as JSON (friendly for jq). GraphQL query is omitted; use `graphql:req-at` to view it.
  - Usage: `pnpm mmtraf body:req-at <filename>.json 0 | jq`
  - Omissions: GraphQL `query` is omitted; use `graphql:req-at` to view it.

- **body:res-at <filename> <index>**: Output parsed response body as JSON.
  - Usage: `pnpm mmtraf body:res-at <filename>.json 0 | jq`

- **graphql:req-at <filename> <index>**: Print the GraphQL query string from the request body.
  - Usage: `pnpm mmtraf graphql:req-at <filename>.json 0`

- **schema:req-at <filename> <index>**: Infer TypeScript types for the request body using quicktype.
  - Usage: `pnpm mmtraf schema:req-at <filename>.json 0`

- **schema:res-at <filename> <index>**: Infer TypeScript types for the response body using quicktype.
  - Usage: `pnpm mmtraf schema:res-at <filename>.json 0`

### Examples

```bash
# List known recordings
pnpm mmtraf list | cat

# Summarize a recording (operation names and sizes)
pnpm mmtraf summary monarch-traffic-<timestamp>.json | cat

# Inspect entry 0 and pipe request body to jq
pnpm mmtraf body:req-at monarch-traffic-<timestamp>.json 0 | jq -r .operationName

# Print the GraphQL query
pnpm mmtraf graphql:req-at monarch-traffic-<timestamp>.json 0

# Generate TypeScript types from the response body
pnpm mmtraf schema:res-at monarch-traffic-<timestamp>.json 0
```

