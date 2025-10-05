import {
  EmailPasswordAuthProvider,
  MonarchGraphQLClient,
} from 'monarch-money-ts';

export function createAuthProvider(): EmailPasswordAuthProvider {
  const email = process.env.MONARCH_EMAIL;
  const password = process.env.MONARCH_PASSWORD;
  const totpKey = process.env.MONARCH_OTP_KEY;

  if (!email || !password) {
    throw new Error('MONARCH_EMAIL and MONARCH_PASSWORD must be set');
  }

  return new EmailPasswordAuthProvider({
    email,
    password,
    totpKey: totpKey || undefined,
  });
}

export function createGraphQLClient(): MonarchGraphQLClient {
  return new MonarchGraphQLClient();
}

