## mmtraf — Monarch Money traffic analyzer

Runs from traffic logs under the `traffic/` directory. Supports **JSONL** (`traffic/logs/mmcap-*.jsonl` from `mmcap`) and legacy **JSON arrays** (older extension exports).

### Run

```bash
pnpm mmtraf --help
```

### Commands

- **list**: List traffic files and entry counts from `traffic/` (including `traffic/logs/`).
  - Usage: `pnpm mmtraf list`

- **summary <file>**: One-line-per-request table (`idx`, `gqlOp`, sizes).
  - Usage: `pnpm mmtraf summary logs/mmcap-2026-05-21.jsonl`

- **show <file> <index>**: Pretty-print a request/response with bodies omitted.
  - Usage: `pnpm mmtraf show logs/mmcap-2026-05-21.jsonl 0`

- **body:req-at <file> <index>**: Parsed request body as JSON (GraphQL `query` omitted).
- **body:res-at <file> <index>**: Parsed response body as JSON.
- **graphql:req-at <file> <index>**: GraphQL query string.
- **schema:req-at / schema:res-at**: Infer TypeScript types via quicktype.

`<file>` is a path relative to `traffic/`, e.g. `logs/mmcap-2026-05-21.jsonl`.

### Examples

```bash
pnpm mmtraf list | cat
pnpm mmtraf summary logs/mmcap-2026-05-21.jsonl | cat
pnpm mmtraf body:req-at logs/mmcap-2026-05-21.jsonl 3 | jq -r .operationName
pnpm mmtraf graphql:req-at logs/mmcap-2026-05-21.jsonl 3
pnpm mmtraf schema:res-at logs/mmcap-2026-05-21.jsonl 3
```

Capture new traffic with [mmcap.md](./mmcap.md).
