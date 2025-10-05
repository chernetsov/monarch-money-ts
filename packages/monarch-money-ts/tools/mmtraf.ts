#!/usr/bin/env -S node --enable-source-maps

// This CLI can be run via: pnpm mmtraf (see package.json)
// Examples:
//   pnpm mmtraf list
//   pnpm mmtraf show <filename>.json 0

import { Command } from 'commander';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import StreamJson from 'stream-json';
import StreamArrayMod from 'stream-json/streamers/StreamArray.js';
import { InputData, jsonInputForTargetLanguage, quicktype } from 'quicktype-core';

// CJS interop: these modules export defaults with helper properties
const { parser } = StreamJson as unknown as { parser: (opts?: any) => NodeJS.ReadWriteStream };
const { streamArray } = StreamArrayMod as unknown as { streamArray: (opts?: any) => NodeJS.ReadWriteStream };

// Utilities
const TRAFFIC_DIR = path.resolve(process.cwd(), 'traffic');

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function maskHeaders(headers: Array<{ name: string; value: string }>): Array<{ name: string; value: string }>{
  const SENSITIVE = new Set([
    'authorization',
    'x-api-key',
    'x-auth-token',
    'cookie'
  ]);
  return (headers || []).map(h => {
    const nameLower = (h?.name || '').toLowerCase();
    if (SENSITIVE.has(nameLower)) {
      return { name: h.name, value: '***REDACTED***' };
    }
    return h;
  });
}

function omittedString(body: unknown, label?: string, see?: string[]): string | null {
  if (body == null) return null;
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  const len = Buffer.byteLength(str, 'utf8');
  const head = label ? `${label}: ${formatBytes(len)} omitted` : `${formatBytes(len)} omitted`;
  const refs = see && see.length ? ` (see: ${see.join(', ')})` : '';
  return `<<${head}>>${refs}`;
}

async function listTrafficFiles(): Promise<Array<{ file: string; path: string; size: number; count: number }>> {
  const results: Array<{ file: string; path: string; size: number; count: number }> = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(TRAFFIC_DIR);
  } catch (err) {
    throw new Error(`Traffic directory not found: ${TRAFFIC_DIR}`);
  }

  const jsonFiles = entries.filter(e => e.endsWith('.json'));
  for (const file of jsonFiles) {
    const full = path.join(TRAFFIC_DIR, file);
    const stat = await fs.stat(full);
    const count = await countJsonArrayItems(full);
    results.push({ file, path: full, size: stat.size, count });
  }
  return results;
}

async function countJsonArrayItems(fullPath: string): Promise<number> {
  const input = createReadStream(fullPath);
  let count = 0;
  const pipelineStreams: Array<NodeJS.ReadableStream | NodeJS.ReadWriteStream> = [input as NodeJS.ReadableStream];
  pipelineStreams.push(parser());
  pipelineStreams.push(streamArray());

  await pipeline(
    // @ts-ignore - pipeline variadic typing
    ...pipelineStreams,
    async function (source: AsyncIterable<any>) {
      for await (const _ of source) {
        count++;
      }
    }
  );
  return count;
}

async function showRecord(fileBase: string, index: number): Promise<void> {
  const full = resolveTrafficPath(fileBase);
  const input = createReadStream(full);

  let found: any = null;

  try {
    // Build stream chain manually to allow early break and cleanup
    const p = parser();
    const s = streamArray();

    let src: NodeJS.ReadableStream = input;
    src = src.pipe(p).pipe(s);

    for await (const chunk of src as AsyncIterable<any>) {
      if (chunk.key === index) {
        found = chunk.value;
        break;
      }
    }

    // Cleanup stream chain explicitly
    safeDestroy(s);
    safeDestroy(p);
    safeDestroy(input);
  } catch (err) {
    // Ensure streams are closed on error
    safeDestroy(input);
    throw err;
  }

  if (!found) throw new Error(`Index ${index} not found in ${full}`);

  const safe = {
    url: found.url,
    method: found.method,
    requestHeaders: maskHeaders(found.requestHeaders || []),
    requestBody: omittedString(found.requestBody, 'request body', ['body:req-at', 'graphql:req-at']),
    status: found.status,
    responseHeaders: maskHeaders(found.responseHeaders || []),
    responseBody: omittedString(found.responseBody, 'response body', ['body:res-at']),
    time: found.time,
    timestamp: found.timestamp
  };

  // Pretty print minimal safe object
  process.stdout.write(JSON.stringify(safe, null, 2) + '\n');
}

// CLI
const program = new Command();
program
  .name('mmtraf')
  .description('Monarch Money traffic recordings analyzer')
  .version('0.1.0');

program
  .command('list')
  .description('List traffic files and counts from traffic/ directory')
  .action(async () => {
    const rows = await listTrafficFiles();
    if (rows.length === 0) {
      console.log('No traffic files found in', TRAFFIC_DIR);
      return;
    }
    const data = rows.map(r => ({ file: r.file, size: formatBytes(r.size), count: r.count }));
    console.table(data);
  });

program
  .command('show')
  .description('Show a specific request-response by index in a given filename under traffic/')
  .argument('<file>', 'Filename under traffic/ (e.g. monarch-traffic-... .json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    const index = Number(idx);
    if (!Number.isInteger(index) || index < 0) {
      throw new Error('Index must be a non-negative integer');
    }
    await showRecord(file, index);
  });

// ---------------- Schema inference ----------------
// quicktype helpers
async function quicktypeFromSample(name: string, sample: unknown, target: 'schema' | 'typescript'): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage(target === 'schema' ? 'schema' : 'typescript');
  const text = typeof sample === 'string' ? sample : JSON.stringify(sample ?? null);
  await jsonInput.addSource({ name, samples: [text] });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({ inputData, lang: target === 'schema' ? 'schema' : 'typescript', rendererOptions: target === 'typescript' ? { 'just-types': 'true' } : {} });
  return result.lines.join('\n');
}

function tryParseJsonString(s: unknown): unknown {
  if (s == null) return null;
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* fallthrough */ }
  }
  return s; // keep as string if not JSON
}

function headerValue(headers: Array<{ name: string; value: string }>, find: string): string | undefined {
  const f = find.toLowerCase();
  for (const h of headers || []) {
    if ((h?.name || '').toLowerCase() === f) return h.value;
  }
  return undefined;
}

// -------- small helpers for reuse --------
function resolveTrafficPath(file: string): string {
  if (path.isAbsolute(file)) throw new Error('Provide a bare filename under traffic/ (no absolute paths)');
  if (file.includes(path.sep)) throw new Error('Provide a bare filename under traffic/ (no relative paths)');
  if (!file.endsWith('.json')) throw new Error('Filename must end with .json');
  if (file.endsWith('.json.gz')) throw new Error('Gzipped files are not supported. Use a .json file.');
  return path.join(TRAFFIC_DIR, file);
}

function parseIndex(idx: string): number {
  const index = Number(idx);
  if (!Number.isInteger(index) || index < 0) throw new Error('Index must be a non-negative integer');
  return index;
}

function contentTypeFromHeaders(headers: Array<{ name: string; value: string }> | undefined): string {
  return headerValue(headers || [], 'content-type') || '';
}

function parseBodyUsingContentType(body: unknown, contentType: string): unknown {
  let parsed: unknown = body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      parsed = tryParseJsonString(body);
    }
  }
  return parsed;
}

async function withRecord(file: string, idx: string, fn: (rec: any) => Promise<void> | void): Promise<void> {
  const index = parseIndex(idx);
  const full = resolveTrafficPath(file);
  const rec = await readRecord(full, index);
  await fn(rec);
}

function extractGraphQLQueryFromRequest(body: unknown, contentType: string): string | null {
  const ctype = contentType || '';
  let payload: any = body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (ctype.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      payload = tryParseJsonString(body);
    } else if (ctype.includes('application/graphql')) {
      return body;
    }
  }
  if (payload && typeof payload === 'object' && typeof (payload as any).query === 'string') {
    return (payload as any).query as string;
  }
  return null;
}

program
  .command('schema:req-at')
  .description('Infer TypeScript types for request body at a specific index')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    await withRecord(file, idx, async (rec) => {
      const ctype = contentTypeFromHeaders(rec?.requestHeaders);
      const body = parseBodyUsingContentType(rec?.requestBody, ctype);
      const output = await quicktypeFromSample('RequestBody', body, 'typescript');
      process.stdout.write(output + '\n');
    });
  });

program
  .command('schema:res-at')
  .description('Infer TypeScript types for response body at a specific index')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    await withRecord(file, idx, async (rec) => {
      const ctype = contentTypeFromHeaders(rec?.responseHeaders);
      const body = parseBodyUsingContentType(rec?.responseBody, ctype);
      const output = await quicktypeFromSample('ResponseBody', body, 'typescript');
      process.stdout.write(output + '\n');
    });
  });

program
  .command('body:req-at')
  .description('Output parsed request body at a specific index (JSON for jq). GraphQL query is omitted; use graphql:req-at to view it')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    await withRecord(file, idx, (rec) => {
      const ctype = contentTypeFromHeaders(rec?.requestHeaders);
      const body = parseBodyUsingContentType(rec?.requestBody, ctype);
      // If GraphQL, redact query field and point to graphql:req-at
      if (body && typeof body === 'object' && (body as any).query) {
        const clone = { ...(body as any) } as any;
        clone.query = omittedString((body as any).query, 'GraphQL query', ['graphql:req-at']);
        process.stdout.write(JSON.stringify(clone) + '\n');
        return;
      }
      // If raw GraphQL body (application/graphql), emit a redaction note with size
      if (typeof rec?.requestBody === 'string' && ctype.includes('application/graphql')) {
        process.stdout.write(JSON.stringify(omittedString(rec?.requestBody, 'GraphQL query', ['graphql:req-at'])) + '\n');
        return;
      }
      process.stdout.write(JSON.stringify(body ?? null) + '\n');
    });
  });

program
  .command('body:res-at')
  .description('Output parsed response body at a specific index (JSON for jq)')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    await withRecord(file, idx, (rec) => {
      const ctype = contentTypeFromHeaders(rec?.responseHeaders);
      const body = parseBodyUsingContentType(rec?.responseBody, ctype);
      process.stdout.write(JSON.stringify(body ?? null) + '\n');
    });
  });

program
  .command('graphql:req-at')
  .description('Output GraphQL query string from request body at a specific index')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .argument('<index>', 'Zero-based index of entry')
  .action(async (file: string, idx: string) => {
    await withRecord(file, idx, (rec) => {
      const ctype = contentTypeFromHeaders(rec?.requestHeaders);
      const gql = extractGraphQLQueryFromRequest(rec?.requestBody, ctype);
      process.stdout.write((gql ?? '') + '\n');
    });
  });

// ---------------- Summary table ----------------
function truncate(input: unknown, len: number): string {
  const s = typeof input === 'string' ? input : input == null ? '' : String(input);
  if (s.length <= len) return s;
  return s.slice(0, len - 1) + '…';
}

function byteSizeOf(body: unknown): number {
  if (body == null) return 0;
  if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
  try {
    const s = JSON.stringify(body);
    return Buffer.byteLength(s, 'utf8');
  } catch {
    return 0;
  }
}

program
  .command('summary')
  .description('Show a one-line-per-request table summary for a traffic file under traffic/')
  .argument('<file>', 'Filename under traffic/ (.json)')
  .action(async (file: string) => {
    const full = resolveTrafficPath(file);
    const input = createReadStream(full);
    const p = parser();
    const s = streamArray();
    let src: NodeJS.ReadableStream = input;
    src = src.pipe(p).pipe(s);

    const rows: Array<Record<string, unknown>> = [];
    try {
      for await (const chunk of src as AsyncIterable<any>) {
        const rec = chunk.value;
        const reqCtype = contentTypeFromHeaders(rec?.requestHeaders || []);
        const parsedReq = parseBodyUsingContentType(rec?.requestBody, reqCtype) as any;
        const opName: string | undefined = typeof parsedReq?.operationName === 'string' ? parsedReq.operationName : undefined;
        const reqSize = byteSizeOf(rec?.requestBody);
        const resSize = byteSizeOf(rec?.responseBody);
        const totalSize = reqSize + resSize;

        rows.push({
          gqlOp: opName || '',
          sizeReq: formatBytes(reqSize),
          sizeRes: formatBytes(resSize),
          sizeTotal: formatBytes(totalSize),
        });
      }
    } finally {
      safeDestroy(s);
      safeDestroy(p);
      safeDestroy(input);
    }

    if (rows.length === 0) {
      console.log('No entries found in', full);
      return;
    }
    console.table(rows);
  });

async function readRecord(full: string, index: number): Promise<any> {
  const input = createReadStream(full);
  const p = parser();
  const s = streamArray();
  let src: NodeJS.ReadableStream = input;
  src = src.pipe(p).pipe(s);
  try {
    for await (const chunk of src as AsyncIterable<any>) {
      if (chunk.key === index) return chunk.value;
    }
  } finally {
    safeDestroy(s);
    safeDestroy(p);
    safeDestroy(input);
  }
  throw new Error(`Index ${index} not found in ${full}`);
}

function safeDestroy(stream: unknown): void {
  try {
    const anyStream = stream as any;
    if (anyStream && typeof anyStream.destroy === 'function') anyStream.destroy();
  } catch {
    // noop
  }
}

program.parseAsync().catch(err => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
