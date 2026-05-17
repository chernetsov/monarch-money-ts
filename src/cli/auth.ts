import { EmailPasswordAuthProvider, FixedTokenAuthProvider, type AuthProvider } from '../auth.js';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { z } from 'zod';

import { CliError } from './output.js';

export function createAuthProvider(env: NodeJS.ProcessEnv = process.env): AuthProvider {
  const token = env.MONARCH_TOKEN;
  if (token) {
    return new FixedTokenAuthProvider(token);
  }

  const cached = readAuthState(env);
  const email = env.MONARCH_EMAIL;
  const password = env.MONARCH_PASSWORD;
  if (email && password) {
    return new EmailPasswordAuthProvider({
      email,
      password,
      totpKey: env.MONARCH_OTP_KEY,
      token: cached?.token,
      tokenExpiresAtMs: cached?.tokenExpiresAtMs,
      onTokenUpdate: async (newToken, tokenExpiresAtMs) => {
        writeAuthState(
          {
            token: newToken,
            tokenExpiresAtMs,
            email,
            updatedAt: new Date().toISOString(),
          },
          env,
        );
      },
    });
  }

  if (cached && isCachedTokenUsable(cached)) {
    return new CachedTokenAuthProvider(cached, env);
  }

  if (cached) {
    throw new CliError(
      'AUTH_EXPIRED',
      'Cached Monarch token is expired. Run `monarch-money auth login`, or set MONARCH_EMAIL and MONARCH_PASSWORD so the CLI can refresh it.',
      2,
      {
        path: getAuthStatePath(env),
        tokenExpiresAtMs: cached.tokenExpiresAtMs,
      },
    );
  }

  throw new CliError(
    'AUTH_REQUIRED',
    'Run `monarch-money auth login`, set MONARCH_TOKEN, or set MONARCH_EMAIL and MONARCH_PASSWORD with optional MONARCH_OTP_KEY.',
    2,
  );
}

const AuthStateSchema = z
  .object({
    token: z.string().min(1),
    tokenExpiresAtMs: z.number().optional(),
    email: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .strict();

export type AuthState = z.infer<typeof AuthStateSchema>;

class CachedTokenAuthProvider implements AuthProvider {
  private token: string | undefined;

  constructor(
    state: AuthState,
    private readonly env: NodeJS.ProcessEnv,
  ) {
    this.token = state.token;
  }

  async getToken(): Promise<string> {
    if (!this.token) {
      throw new CliError(
        'AUTH_EXPIRED',
        'Cached Monarch token is no longer usable. Run `monarch-money auth login`.',
        2,
        { path: getAuthStatePath(this.env) },
      );
    }

    return this.token;
  }

  async invalidate(): Promise<void> {
    this.token = undefined;
    clearAuthState(this.env);
  }
}

export function getAuthStatePath(env: NodeJS.ProcessEnv = process.env): string {
  return resolveHome(env.MONARCH_AUTH_FILE ?? '~/.monarch-money/auth.json');
}

export function readAuthState(env: NodeJS.ProcessEnv = process.env): AuthState | undefined {
  const file = getAuthStatePath(env);
  if (!existsSync(file)) return undefined;

  try {
    return AuthStateSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch (cause) {
    throw new CliError(
      'AUTH_STATE_INVALID',
      `Could not read Monarch auth state at ${file}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      2,
    );
  }
}

export function writeAuthState(state: AuthState, env: NodeJS.ProcessEnv = process.env): void {
  const file = getAuthStatePath(env);
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function clearAuthState(env: NodeJS.ProcessEnv = process.env): boolean {
  const file = getAuthStatePath(env);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}

export async function loginAndCacheAuthState(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Omit<AuthState, 'token'>> {
  const email = env.MONARCH_EMAIL;
  const password = env.MONARCH_PASSWORD;
  if (!email || !password) {
    throw new CliError(
      'LOGIN_CREDENTIALS_REQUIRED',
      'Set MONARCH_EMAIL and MONARCH_PASSWORD with optional MONARCH_OTP_KEY before running auth login.',
      2,
    );
  }

  const provider = new EmailPasswordAuthProvider({
    email,
    password,
    totpKey: env.MONARCH_OTP_KEY,
    onTokenUpdate: async (token, tokenExpiresAtMs) => {
      writeAuthState(
        {
          token,
          tokenExpiresAtMs,
          email,
          updatedAt: new Date().toISOString(),
        },
        env,
      );
    },
  });

  await provider.getToken();
  const state = readAuthState(env);
  if (!state) {
    throw new CliError(
      'AUTH_STATE_WRITE_FAILED',
      'Login succeeded but auth state was not written.',
      2,
    );
  }

  return {
    tokenExpiresAtMs: state.tokenExpiresAtMs,
    email: state.email,
    updatedAt: state.updatedAt,
  };
}

export function getAuthStatus(env: NodeJS.ProcessEnv = process.env): Record<string, unknown> {
  const state = readAuthState(env);
  return {
    path: getAuthStatePath(env),
    exists: Boolean(state),
    email: state?.email,
    updatedAt: state?.updatedAt,
    tokenExpiresAtMs: state?.tokenExpiresAtMs,
    usable: state ? isCachedTokenUsable(state) : false,
  };
}

function isCachedTokenUsable(state: AuthState): boolean {
  return !state.tokenExpiresAtMs || Date.now() + 60_000 < state.tokenExpiresAtMs;
}

function resolveHome(file: string): string {
  if (file === '~') return homedir();
  if (file.startsWith('~/')) return path.join(homedir(), file.slice(2));
  return path.resolve(file);
}
