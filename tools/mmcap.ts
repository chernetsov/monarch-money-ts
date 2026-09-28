#!/usr/bin/env -S node --enable-source-maps

/**
 * Interactive Monarch GraphQL traffic capture via Playwright.
 *
 * Usage:
 *   pnpm mmcap                    # headed recorder (manual browser control)
 */

import { Command } from 'commander';
import { appendFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { chromium, type Browser, type Page } from 'playwright';
import {
  TRAFFIC_LOGS_DIR,
  TRAFFIC_DIR,
  dailyLogBasename,
  isMonarchGraphQLUrl,
  operationNameFromEntry,
  redactHeaders,
  toDevToolsHeaders,
  type TrafficEntry,
} from './traffic-shared.js';

const MONARCH_APP = 'https://app.monarchmoney.com';
const SCREENSHOTS_DIR = resolve(TRAFFIC_DIR, 'screenshots');

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function byteSizeOf(body: string | null | undefined): number {
  if (body == null) return 0;
  return Buffer.byteLength(body, 'utf8');
}

function resolveGoto(target: string): string {
  if (target.startsWith('http://') || target.startsWith('https://')) return target;
  const pathPart = target.startsWith('/') ? target : `/${target}`;
  return `${MONARCH_APP}${pathPart}`;
}

function printHelp(): void {
  output.write(`
Commands (type at mmcap> prompt, or browse with the mouse):
  goto <path|url>   Navigate (e.g. goto /accounts or goto https://...)
  back              Browser back
  reload            Reload current page
  snapshot [all]     Print visible page structure (interactive elements by default)
  shot [file]        Save a screenshot under traffic/screenshots/
  click text <text>  Click by visible text
  click role <role> <name>
                    Click by ARIA role and accessible name
  click css <selector>
                    Click a CSS selector
  fill <selector> <value>
                    Fill a CSS selector
  press <key>        Press a key (e.g. Enter, Escape, Tab)
  wait [ms]          Wait for page activity (default: 1000)
  help              Show this help
  stop              End capture and close browser

Press Enter on an empty line to stop after login is complete.
`);
}

async function ensureLogsDir(): Promise<void> {
  await mkdir(TRAFFIC_LOGS_DIR, { recursive: true });
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
}

interface CaptureHandle {
  logFile: string;
  count: () => number;
  setStopping: () => void;
  flush: () => Promise<void>;
}

function attachGraphQLCapture(
  page: Page,
  logPath: string,
  logFile: string,
  isStopping: () => boolean,
): CaptureHandle {
  let writeChain: Promise<void> = Promise.resolve();
  let count = 0;
  let stopping = false;

  page.on('response', (response) => {
    if (isStopping() || stopping) return;
    const request = response.request();
    if (!isMonarchGraphQLUrl(request.url())) return;

    void (async () => {
      const started = Date.now();
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        responseBody = '';
      }

      const entry: TrafficEntry = {
        url: request.url(),
        method: request.method(),
        requestHeaders: redactHeaders(toDevToolsHeaders(request.headers())),
        requestBody: request.postData(),
        status: response.status(),
        responseHeaders: redactHeaders(toDevToolsHeaders(response.headers())),
        responseBody,
        time: Date.now() - started,
        timestamp: new Date().toISOString(),
      };

      count += 1;
      const op = operationNameFromEntry(entry) || '(unknown)';
      const total = byteSizeOf(entry.requestBody) + byteSizeOf(entry.responseBody);
      output.write(
        `  #${count}  ${op}  ${entry.status}  ${formatBytes(total)}  → traffic/${logFile}\n`,
      );
      const line = JSON.stringify(entry) + '\n';
      writeChain = writeChain
        .then(() => appendFile(logPath, line, 'utf8'))
        .catch((err) => {
          output.write(
            `\n[mmcap] Failed to write log: ${err instanceof Error ? err.message : err}\n`,
          );
        });
    })();
  });

  return {
    logFile,
    count: () => count,
    setStopping: () => {
      stopping = true;
    },
    flush: () => writeChain,
  };
}

async function createBrowserPage(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  return { browser, page };
}

function parseArgs(inputText: string): string[] {
  const args: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(inputText)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3]);
  }
  return args;
}

async function printSnapshot(page: Page, includeAll: boolean): Promise<void> {
  const rows = await page.evaluate((all) => {
    const visible = (el: Element): boolean => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const textOf = (el: Element): string => {
      const aria = el.getAttribute('aria-label');
      const placeholder = el.getAttribute('placeholder');
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return (aria || placeholder || text).slice(0, 120);
    };

    const selectorOf = (el: Element): string => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const parts: string[] = [];
      let cur: Element | null = el;
      while (cur && cur !== document.body && parts.length < 4) {
        const tag = cur.tagName.toLowerCase();
        const parent = cur.parentElement;
        if (!parent) {
          parts.unshift(tag);
          break;
        }
        const sameTag = Array.from(parent.children).filter(
          (child) => child.tagName === cur!.tagName,
        );
        const index = sameTag.indexOf(cur) + 1;
        parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
        cur = parent;
      }
      return parts.join(' > ');
    };

    const candidates = Array.from(
      document.querySelectorAll(
        all
          ? 'body *'
          : 'a,button,input,select,textarea,[role],[aria-label],[contenteditable="true"],h1,h2,h3',
      ),
    );

    return candidates
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        type: el.getAttribute('type') || '',
        name: textOf(el),
        selector: selectorOf(el),
      }))
      .filter(
        (row) => all || row.name || row.role || ['input', 'select', 'textarea'].includes(row.tag),
      )
      .slice(0, 120);
  }, includeAll);

  output.write(`\nPage: ${page.url()}\n`);
  if (rows.length === 0) {
    output.write('  (no visible elements found)\n');
    return;
  }
  for (const [i, row] of rows.entries()) {
    const type = row.type ? ` type=${row.type}` : '';
    const role = row.role ? ` role=${row.role}` : '';
    const name = row.name ? ` "${row.name}"` : '';
    output.write(`  [${i}] ${row.tag}${type}${role}${name}  css=${row.selector}\n`);
  }
}

async function saveScreenshot(page: Page, requestedName: string): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rawName = requestedName.trim() || `mmcap-${stamp}.png`;
  const safeName = rawName.replace(/[^\w.-]+/g, '-').replace(/^-+/, '') || `mmcap-${stamp}.png`;
  const fileName = safeName.endsWith('.png') ? safeName : `${safeName}.png`;
  const path = resolve(SCREENSHOTS_DIR, fileName);
  await page.screenshot({ path, fullPage: true });
  output.write(`  screenshot: ${path}\n`);
}

async function clickTarget(page: Page, arg: string): Promise<void> {
  const args = parseArgs(arg);
  const mode = args.shift();
  if (!mode) {
    output.write('  Usage: click text <text> | click role <role> <name> | click css <selector>\n');
    return;
  }

  if (mode === 'text') {
    const text = args.join(' ');
    if (!text) {
      output.write('  Usage: click text <text>\n');
      return;
    }
    await page.getByText(text, { exact: false }).first().click();
    output.write(`  clicked text "${text}"\n`);
    return;
  }

  if (mode === 'role') {
    const role = args.shift();
    const name = args.join(' ');
    if (!role || !name) {
      output.write('  Usage: click role <role> <name>\n');
      return;
    }
    await page
      .getByRole(role as any, { name, exact: false })
      .first()
      .click();
    output.write(`  clicked role ${role} "${name}"\n`);
    return;
  }

  if (mode === 'css') {
    const selector = args.join(' ');
    if (!selector) {
      output.write('  Usage: click css <selector>\n');
      return;
    }
    await page.locator(selector).first().click();
    output.write(`  clicked css ${selector}\n`);
    return;
  }

  output.write(`  Unknown click mode: ${mode}\n`);
}

async function fillTarget(page: Page, arg: string): Promise<void> {
  const args = parseArgs(arg);
  const selector = args.shift();
  const value = args.join(' ');
  if (!selector || !value) {
    output.write('  Usage: fill <selector> <value>\n');
    return;
  }
  await page.locator(selector).first().fill(value);
  output.write(`  filled ${selector}\n`);
}

async function runInteractive(opts: {
  label?: string;
  repl?: boolean;
  pauseAfterLogin?: boolean;
}): Promise<void> {
  await ensureLogsDir();
  const logFile = `logs/${dailyLogBasename()}`;
  const logPath = `${TRAFFIC_LOGS_DIR}/${dailyLogBasename()}`;

  output.write(`
mmcap — interactive GraphQL capture
  Log file: traffic/${logFile}${opts.label ? ` (label: ${opts.label})` : ''}

  1. A headed browser opens and capture starts immediately.
  2. Log in manually and browse Monarch normally.
  3. Each GraphQL call is appended to the JSONL log.
  4. Press Ctrl-C or close the browser to stop.
`);
  if (opts.repl) printHelp();

  let stopping = false;
  const { browser, page } = await createBrowserPage();

  await page.goto(MONARCH_APP, { waitUntil: 'domcontentloaded' });

  const rl =
    opts.repl || opts.pauseAfterLogin
      ? readline.createInterface({ input, output, terminal: true })
      : null;
  if (opts.pauseAfterLogin && rl) {
    output.write('\n[mmcap] Log in in the browser, then press Enter here to start capture.\n');
    await rl.question('login complete> ');
  }

  const capture = attachGraphQLCapture(page, logPath, logFile, () => stopping);
  output.write(`[mmcap] Capture is ON. Current page: ${page.url()}\n`);
  if (opts.repl) {
    output.write('[mmcap] Tip: run `reload` now if you want to capture initial page data.\n');
  } else {
    output.write('[mmcap] Browse in the opened browser. Press Ctrl-C or close it when done.\n');
  }

  const shutdown = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    capture.setStopping();
    rl?.close();
    await capture.flush();
    await browser.close();
    output.write(
      `\n[mmcap] Stopped. Captured ${capture.count()} GraphQL request(s) in traffic/${logFile}\n`,
    );
    output.write(`[mmcap] Analyze with: pnpm mmtraf summary ${logFile}\n`);
  };

  process.on('SIGINT', () => {
    void shutdown().finally(() => process.exit(0));
  });

  if (!opts.repl) {
    await new Promise<void>((resolveDone) => {
      browser.on('disconnected', resolveDone);
    });
    if (!stopping) await shutdown();
    return;
  }

  try {
    while (!stopping) {
      if (!rl) break;
      const line = (await rl.question('mmcap> ')).trim();
      if (!line) {
        await shutdown();
        break;
      }

      const [cmd, ...rest] = line.split(/\s+/);
      const arg = rest.join(' ').trim();

      switch (cmd.toLowerCase()) {
        case 'help':
        case '?':
          printHelp();
          break;
        case 'stop':
        case 'quit':
        case 'exit':
          await shutdown();
          break;
        case 'goto':
          if (!arg) {
            output.write('  Usage: goto <path|url>\n');
            break;
          }
          await page.goto(resolveGoto(arg), { waitUntil: 'domcontentloaded' });
          output.write(`  → ${page.url()}\n`);
          break;
        case 'back':
          await page.goBack({ waitUntil: 'domcontentloaded' });
          output.write(`  → ${page.url()}\n`);
          break;
        case 'reload':
          await page.reload({ waitUntil: 'domcontentloaded' });
          output.write(`  → ${page.url()}\n`);
          break;
        case 'snapshot':
          await printSnapshot(page, arg === 'all');
          break;
        case 'shot':
          await saveScreenshot(page, arg);
          break;
        case 'click':
          await clickTarget(page, arg);
          break;
        case 'fill':
          await fillTarget(page, arg);
          break;
        case 'press':
          if (!arg) {
            output.write('  Usage: press <key>\n');
            break;
          }
          await page.keyboard.press(arg);
          output.write(`  pressed ${arg}\n`);
          break;
        case 'wait': {
          const waitMs = arg ? Number(arg) : 1000;
          if (!Number.isFinite(waitMs) || waitMs < 0) {
            output.write('  Usage: wait [milliseconds]\n');
            break;
          }
          await page.waitForTimeout(waitMs);
          output.write(`  waited ${waitMs}ms\n`);
          break;
        }
        default:
          output.write(`  Unknown command: ${cmd} (type help)\n`);
      }
    }
  } finally {
    if (!stopping) await shutdown();
  }
}

const program = new Command();
program.name('mmcap').description('Capture Monarch GraphQL traffic to traffic/logs/*.jsonl');

// `pnpm mmcap` — interactive (no subcommand)
program
  .option('-l, --label <text>', 'Optional session label (terminal only)')
  .option('--repl', 'Enable experimental mmcap browser-control REPL', false)
  .option('--pause-after-login', 'Wait for Enter before starting capture', false)
  .action(async (opts: { label?: string; repl?: boolean; pauseAfterLogin?: boolean }) => {
    await runInteractive(opts);
  });

program.parseAsync().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
