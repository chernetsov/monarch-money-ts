/**
 * Shared traffic capture format used by mmcap (write) and mmtraf (read).
 */

import path from 'path';

export const TRAFFIC_DIR = path.resolve(process.cwd(), 'traffic');
export const TRAFFIC_LOGS_DIR = path.join(TRAFFIC_DIR, 'logs');

export interface TrafficHeader {
  name: string;
  value: string;
}

export interface TrafficEntry {
  url: string;
  method: string;
  requestHeaders: TrafficHeader[];
  requestBody: string | null;
  status: number;
  responseHeaders: TrafficHeader[];
  responseBody: string;
  time: number;
  timestamp: string;
}

const SENSITIVE_HEADERS = new Set(['authorization', 'x-api-key', 'x-auth-token', 'cookie']);

export function toDevToolsHeaders(headers: Record<string, string>): TrafficHeader[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

export function redactHeaders(headers: TrafficHeader[]): TrafficHeader[] {
  return headers.map((h) => {
    const nameLower = (h.name || '').toLowerCase();
    if (SENSITIVE_HEADERS.has(nameLower)) {
      return { name: h.name, value: '***REDACTED***' };
    }
    return h;
  });
}

export function isMonarchGraphQLUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!u.pathname.includes('/graphql')) return false;
    const host = u.hostname.toLowerCase();
    return host.endsWith('monarchmoney.com') || host.endsWith('monarch.com');
  } catch {
    return false;
  }
}

export function operationNameFromEntry(entry: TrafficEntry): string | undefined {
  const ctype =
    entry.requestHeaders.find((h) => h.name.toLowerCase() === 'content-type')?.value || '';
  let payload: unknown = entry.requestBody;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (
      ctype.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')
    ) {
      try {
        payload = JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    }
  }
  if (payload && typeof payload === 'object' && typeof (payload as { operationName?: string }).operationName === 'string') {
    return (payload as { operationName: string }).operationName;
  }
  return undefined;
}

export function dailyLogBasename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `mmcap-${y}-${m}-${d}.jsonl`;
}

export function resolveTrafficPath(file: string): string {
  if (path.isAbsolute(file)) {
    throw new Error('Provide a path under traffic/ (no absolute paths)');
  }
  const normalized = path.normalize(file);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new Error('Provide a path under traffic/ (no parent traversal)');
  }
  if (!normalized.endsWith('.json') && !normalized.endsWith('.jsonl')) {
    throw new Error('Filename must end with .json or .jsonl');
  }
  if (normalized.endsWith('.json.gz')) {
    throw new Error('Gzipped files are not supported');
  }
  const full = path.join(TRAFFIC_DIR, normalized);
  if (!full.startsWith(TRAFFIC_DIR + path.sep) && full !== TRAFFIC_DIR) {
    throw new Error('Path must stay under traffic/');
  }
  return full;
}

export function isJsonlFile(filePath: string): boolean {
  return filePath.endsWith('.jsonl');
}
