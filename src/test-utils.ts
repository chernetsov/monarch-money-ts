import { config as loadEnv } from 'dotenv'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EmailPasswordAuthProvider } from './auth.js'
import { MonarchGraphQLClient } from './graphql.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envCandidates = [
  resolve(__dirname, '../../..', '.env'),
  resolve(__dirname, '..', '.env')
]

let envLoaded = false
for (const candidate of envCandidates) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  loadEnv()
}

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

const loadTokenCache = (email: string): Pick<TokenCache, 'token' | 'tokenExpiresAtMs'> | null => {
  try {
    if (!existsSync(TOKEN_CACHE_FILE)) {
      return null;
    }
    const data = readFileSync(TOKEN_CACHE_FILE, 'utf-8');
    const cache = JSON.parse(data) as TokenCache;
    if (cache.email === email) {
      return { token: cache.token, tokenExpiresAtMs: cache.tokenExpiresAtMs };
    }
  } catch (e) {
    // Ignore errors and proceed without cache
  }
  return null;
};

const saveTokenCache = (email: string, token: string, tokenExpiresAtMs: number | undefined): void => {
  try {
    const cache: TokenCache = { email, token, tokenExpiresAtMs };
    writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    // Ignore save errors
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
      saveTokenCache(email, token, tokenExpiresAtMs);
    }
  });
  const client = new MonarchGraphQLClient();
  cached = { auth, client };
  return cached;
};
