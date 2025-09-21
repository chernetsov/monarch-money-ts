import 'dotenv/config'
import { EmailPasswordAuthProvider } from './auth.js'
import { MonarchGraphQLClient } from './graphql.js'

export interface IntegrationContext {
  auth: EmailPasswordAuthProvider;
  client: MonarchGraphQLClient;
}

let cached: IntegrationContext | null = null;

export const getIntegrationContext = (): IntegrationContext => {
  if (cached) return cached;
  const email = process.env.MONARCH_EMAIL;
  const password = process.env.MONARCH_PASSWORD;
  const totpKey = process.env.MONARCH_OTP_KEY;

  if (!email || !password) {
    throw new Error('Missing MONARCH_EMAIL or MONARCH_PASSWORD in environment');
  }

  const auth = new EmailPasswordAuthProvider({ email, password, totpKey: totpKey || undefined });
  const client = new MonarchGraphQLClient();
  cached = { auth, client };
  return cached;
};
