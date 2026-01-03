#!/usr/bin/env tsx
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailPasswordAuthProvider } from '../src/new/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if present (dotenv/config already loaded .env), but ensure .env.local as well
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocalPath });
}


async function main() {
  try {
    const email = process.env.MONARCH_EMAIL;
    const password = process.env.MONARCH_PASSWORD;
    const totpKey = process.env.MONARCH_OTP_KEY;

    if (!email || !password) {
    console.error('Missing MONARCH_EMAIL or MONARCH_PASSWORD in environment (.env.local).');
    process.exit(1);
    }

    const auth = new EmailPasswordAuthProvider({ email, password, totpKey });
    const token = await auth.getToken();
    console.log('Login OK. Token length:', token.length);
    process.exit(0);
  } catch (err) {
    console.error('Login failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
