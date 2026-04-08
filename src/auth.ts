import fetch from 'node-fetch';
import { TOTP } from 'totp-generator';
import { z } from 'zod';

/**
 * AuthProvider is the object passed to API methods.
 * It provides a token and supports invalidation (for refresh/retry flows).
 */
export interface AuthProvider {
  getToken(): Promise<string>;
  invalidate(): void | Promise<void>;
}

/**
 * FixedTokenAuthProvider returns a fixed token and ignores invalidation.
 */
export class FixedTokenAuthProvider implements AuthProvider {
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error('FixedTokenAuthProvider requires a non-empty token');
    }
    this.token = token;
  }

  async getToken(): Promise<string> {
    return this.token;
  }

  async invalidate(): Promise<void> {
    // No-op for fixed token
  }
}

/**
 * Perform a login request to Monarch with a hardcoded endpoint.
 */
const LOGIN_ENDPOINT = 'https://api.monarch.com/auth/login/';

export const LoginResponseSchema = z
  .object({
    token: z.string(),
    tokenExpiration: z.string(),
    id: z.string(),
    email: z.string(),
    name: z.string(),
  })
  .passthrough();

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

interface LoginParams {
  email: string;
  password: string;
  totp?: string;
  supportsMfa?: boolean;
  trustedDevice?: boolean;
}

const loginRequest = async (params: LoginParams): Promise<LoginResponse> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Client-Platform': 'web',
    'Content-Type': 'application/json',
    'User-Agent': 'MonarchMoneyAPI (https://github.com/hammem/monarchmoney)',
  };

  const body: Record<string, unknown> = {
    username: params.email,
    password: params.password,
    supports_mfa: params.supportsMfa ?? true,
    trusted_device: params.trustedDevice ?? false,
  };
  if (params.totp) {
    body.totp = params.totp;
  }

  const response = await fetch(LOGIN_ENDPOINT, {
    method: 'POST',
    headers: headers as Record<string, string>,
    body: JSON.stringify(body),
  });

  const raw = await response.text();

  if (response.status === 403) {
    throw new Error('MFA required or invalid TOTP');
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
    throw new LoginThrottledError(retryMs);
  }

  if (response.status !== 200) {
    throw new Error(`Login failed: HTTP ${response.status} ${response.statusText} - ${raw}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new Error(
      `Login response was not valid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }

  const parsed = LoginResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Login response validation failed: ${parsed.error.message}`);
  }

  return parsed.data;
};

/**
 * Callback invoked when a token is updated.
 */
export type TokenUpdateCallback = (
  token: string,
  tokenExpiresAtMs: number | undefined,
) => void | Promise<void>;

/**
 * Thrown when the login endpoint returns 429 Too Many Requests.
 */
export class LoginThrottledError extends Error {
  readonly retryAfterMs?: number;
  readonly cooldownUntilMs: number;

  constructor(retryAfterMs?: number) {
    const DEFAULT_COOLDOWN_MS = 5 * 60_000;
    const cooldownMs = retryAfterMs ?? DEFAULT_COOLDOWN_MS;
    const until = Date.now() + cooldownMs;
    const minutes = Math.ceil(cooldownMs / 60_000);
    super(
      `Login rate-limited by Monarch (429). ` +
        `Will not retry for ${minutes} minute(s). ` +
        `If this persists, extract a token from an active browser session or contact Monarch support.`,
    );
    this.name = 'LoginThrottledError';
    this.retryAfterMs = retryAfterMs;
    this.cooldownUntilMs = until;
  }
}

/**
 * EmailPasswordAuthProvider logs in via username/password and optional TOTP key.
 * It caches the retrieved token until invalidated, and enforces a cooldown
 * after login failures to avoid triggering Monarch's rate limiter.
 */
export class EmailPasswordAuthProvider implements AuthProvider {
  private readonly email: string;
  private readonly password: string;
  private readonly totpKey?: string;
  private readonly onTokenUpdate?: TokenUpdateCallback;

  private token?: string;
  private tokenExpiresAtMs?: number;

  private readonly refreshSkewMs: number = 60_000;

  private loginCooldownUntilMs: number = 0;
  private lastLoginError?: Error;

  constructor(params: {
    email: string;
    password: string;
    totpKey?: string;
    token?: string;
    tokenExpiresAtMs?: number;
    onTokenUpdate?: TokenUpdateCallback;
  }) {
    const { email, password, totpKey, token, tokenExpiresAtMs, onTokenUpdate } = params;
    if (!email || !password) {
      throw new Error('EmailPasswordAuthProvider requires email and password');
    }
    this.email = email;
    this.password = password;
    this.totpKey = totpKey;
    this.token = token;
    this.tokenExpiresAtMs = tokenExpiresAtMs;
    this.onTokenUpdate = onTokenUpdate;
  }

  private isTokenValid(): boolean {
    if (!this.token) return false;
    if (!this.tokenExpiresAtMs) return true;
    return Date.now() + this.refreshSkewMs < this.tokenExpiresAtMs;
  }

  private isInCooldown(): boolean {
    return Date.now() < this.loginCooldownUntilMs;
  }

  async getToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.token as string;
    }

    if (this.isInCooldown()) {
      const remainingSec = Math.ceil((this.loginCooldownUntilMs - Date.now()) / 1000);
      throw new Error(
        `Login is in cooldown (${remainingSec}s remaining) due to previous failure: ` +
          `${this.lastLoginError?.message ?? 'unknown'}. ` +
          `Provide a valid token directly to bypass.`,
      );
    }

    let totpCode: string | undefined;
    if (this.totpKey) {
      try {
        const generated = await TOTP.generate(this.totpKey);
        totpCode = generated.otp;
      } catch (cause) {
        throw new Error(
          `Failed to generate TOTP: ${cause instanceof Error ? cause.message : 'Unknown error'}`,
          { cause },
        );
      }
    }

    try {
      const login = await loginRequest({
        email: this.email,
        password: this.password,
        totp: totpCode,
      });

      this.loginCooldownUntilMs = 0;
      this.lastLoginError = undefined;

      this.token = login.token;
      const expiresAt = Date.parse(login.tokenExpiration);
      this.tokenExpiresAtMs = !Number.isNaN(expiresAt) ? expiresAt : undefined;

      if (this.onTokenUpdate) {
        await this.onTokenUpdate(this.token, this.tokenExpiresAtMs);
      }

      return login.token;
    } catch (e) {
      if (e instanceof LoginThrottledError) {
        this.loginCooldownUntilMs = e.cooldownUntilMs;
      } else {
        this.loginCooldownUntilMs = Date.now() + 30_000;
      }
      this.lastLoginError = e instanceof Error ? e : new Error(String(e));
      throw e;
    }
  }

  async invalidate(): Promise<void> {
    this.token = undefined;
    this.tokenExpiresAtMs = undefined;
  }
}

/**
 * Build standard API headers for Monarch requests with the given token.
 * Extra headers can be merged on top of defaults.
 */
export const buildAuthHeaders = (
  token: string,
  extra?: Record<string, string>,
): Record<string, string> => {
  const base: Record<string, string> = {
    Accept: 'application/json',
    'Client-Platform': 'web',
    'Content-Type': 'application/json',
    'User-Agent': 'MonarchMoneyAPI (https://github.com/hammem/monarchmoney)',
    Authorization: `Token ${token}`,
  };
  return { ...base, ...(extra || {}) };
};
