import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const PingArgsSchema = {
  message: z
    .string()
    .describe('Message to echo back to the caller. Defaults to "pong" if omitted.')
    .default('pong'),
};

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'monarch-money-mcp',
    version: '0.0.0',
    description: 'MCP server for Monarch Money data',
  });

  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Sanity check tool that echoes the provided message',
      inputSchema: PingArgsSchema,
    },
    async ({ message }) => ({
      content: [{ type: 'text', text: message }],
    })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main();

