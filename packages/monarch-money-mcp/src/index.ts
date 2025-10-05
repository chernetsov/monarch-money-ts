import 'dotenv/config';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTransactionsTool } from './tools/transactions.js';

async function main(): Promise<void> {
  ensureAuthEnv();

  const server = new McpServer({
    name: 'monarch-money-mcp',
    version: '0.0.0',
    description: 'MCP server for Monarch Money data',
  });

  registerTransactionsTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main();

function ensureAuthEnv(): void {
  const missing: string[] = [];
  if (!process.env.MONARCH_EMAIL) missing.push('MONARCH_EMAIL');
  if (!process.env.MONARCH_PASSWORD) missing.push('MONARCH_PASSWORD');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
