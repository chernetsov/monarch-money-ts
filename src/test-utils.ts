import 'dotenv/config'
import { EmailPasswordAuthProvider } from './auth.js'
import { MonarchGraphQLClient } from './graphql.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export interface IntegrationContext {
  auth: EmailPasswordAuthProvider;
  client: MonarchGraphQLClient;
}

interface TokenCache {
  email: string;
  token: string;
  tokenExpiresAtMs?: number;
}

const TOKEN_CACHE_FILE = '.tests-cached-token.json';

const testLog = (message: string, details?: Record<string, unknown>): void => {
  const payload = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[tests] ${message}${payload}`);
};

const loadTokenCache = (email: string): Pick<TokenCache, 'token' | 'tokenExpiresAtMs'> | null => {
  try {
    if (!existsSync(TOKEN_CACHE_FILE)) {
      testLog('token cache file not found');
      return null;
    }
    const data = readFileSync(TOKEN_CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data) as TokenCache;
    if (cache.email === email) {
      testLog('loaded token from cache', {
        email,
        hasToken: Boolean(cache.token),
        tokenExpiresAtMs: cache.tokenExpiresAtMs,
      });
      return { token: cache.token, tokenExpiresAtMs: cache.tokenExpiresAtMs };
    }
    testLog('token cache email mismatch', {
      cacheEmail: cache.email,
      requestedEmail: email,
    });
  } catch (e) {
    // Ignore errors and proceed without cache
    testLog('failed to load token cache', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return null;
};

const saveTokenCache = (email: string, token: string, tokenExpiresAtMs: number | undefined): void => {
  try {
    const cache: TokenCache = { email, token, tokenExpiresAtMs };
    writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    testLog('saved token cache', {
      email,
      hasToken: Boolean(token),
      tokenExpiresAtMs,
    });
  } catch (e) {
    // Ignore save errors
    testLog('failed to save token cache', {
      error: e instanceof Error ? e.message : String(e),
    });
  }
};

let cached: IntegrationContext | null = null;

export const getIntegrationContext = (): IntegrationContext => {
  if (cached) return cached;
  const email = process.env.MONARCH_EMAIL;
  const password = process.env.MONARCH_PASSWORD;
  const totpKey = process.env.MONARCH_OTP_KEY;

  if (!email || !password) {
    throw new Error('Missing MONARCH_EMAIL or MONARCH_PASSWORD in environment');
  }

  // Try to load cached token for this email
  const cachedToken = loadTokenCache(email);

  const auth = new EmailPasswordAuthProvider({
    email, 
    password, 
    totpKey: totpKey || undefined,
    token: cachedToken?.token,
    tokenExpiresAtMs: cachedToken?.tokenExpiresAtMs,
    onTokenUpdate: (token, tokenExpiresAtMs) => {
      testLog('onTokenUpdate invoked', {
        email,
        hasToken: Boolean(token),
        tokenExpiresAtMs,
      });
      saveTokenCache(email, token, tokenExpiresAtMs);
    }
  });
  const client = new MonarchGraphQLClient();
  cached = { auth, client };
  return cached;
};
