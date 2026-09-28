## mmcap — interactive GraphQL traffic capture

Records Monarch Money GraphQL requests while you use the app in a **headed** Chromium window. Capture starts immediately, and each request is appended to a daily JSONL log under `traffic/logs/`.

### One-time setup

```bash
pnpm install
# Chromium for Playwright
pnpm exec playwright install chromium
```

### Run

```bash
pnpm mmcap
# optional session label (terminal only, for your notes)
pnpm mmcap --label tags-exploration
```

1. A browser opens at https://app.monarchmoney.com — **log in manually** (including MFA if prompted).
2. Browse Monarch normally. Each GraphQL call prints live in the terminal and is written to `traffic/logs/mmcap-YYYY-MM-DD.jsonl`.
3. Press Ctrl-C in the terminal or close the browser to stop.

### Optional REPL

The default mode is recorder-only so browser control can come from the human, Cursor browser tools, Playwright Inspector, or another existing browser-control surface. A small experimental REPL is available with:

```bash
pnpm mmcap --repl
```

REPL commands:

| Command | Action |
| -------- | ------ |
| `goto /accounts` | Navigate to a path on the app |
| `goto https://...` | Navigate to a full URL |
| `back` | Browser back |
| `reload` | Reload page |
| `snapshot` | Print visible interactive elements and headings |
| `snapshot all` | Print more visible page elements |
| `shot` | Save a full-page screenshot to `traffic/screenshots/` |
| `shot budget.png` | Save a named screenshot |
| `click text "Transactions"` | Click by visible text |
| `click role button "Add Account"` | Click by ARIA role and name |
| `click css "#selector"` | Click by CSS selector |
| `fill "#username" "me@example.com"` | Fill a CSS selector |
| `press Enter` | Press a key |
| `wait 1500` | Wait for page activity |
| `help` | Show commands |
| `stop` | End session |

You can mix REPL navigation with normal mouse interaction in the same session. Treat this as a convenience, not the main browser-control abstraction.

### Log format

- **Path:** `traffic/logs/mmcap-YYYY-MM-DD.jsonl` (one file per calendar day; multiple sessions append to the same file).
- **Format:** one JSON object per line (JSONL), same fields as the legacy extension export.
- **Redaction:** `authorization`, `cookie`, and similar headers are redacted at capture time.

### Analyze with mmtraf

```bash
pnpm mmtraf list
pnpm mmtraf summary logs/mmcap-2026-05-21.jsonl
pnpm mmtraf graphql:req-at logs/mmcap-2026-05-21.jsonl 0
pnpm mmtraf body:res-at logs/mmcap-2026-05-21.jsonl 0 | jq
```

See [mmtraf.md](./mmtraf.md) for all analyzer commands. Legacy `.json` array exports are still supported.

### Agent workflow

1. Run `pnpm mmcap` in a terminal to start the recorder.
2. Log in and browse in the opened browser.
3. Analyze the growing JSONL file with `pnpm mmtraf` (no download step).

`traffic/` is gitignored — never commit capture files.
