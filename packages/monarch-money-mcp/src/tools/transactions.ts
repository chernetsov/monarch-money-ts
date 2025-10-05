import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getTransactions } from 'monarch-money-ts';
import { createAuthProvider, createGraphQLClient } from '../auth.js';

const inputSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .max(50)
    .default(10)
    .describe('Maximum number of transactions to return (1-50).'),
};

interface TransactionLike {
  date?: string | null;
  amount: number;
  merchant?: { name?: string | null } | null;
  plaidName?: string | null;
  category?: { name?: string | null } | null;
}

export function registerTransactionsTool(server: McpServer): void {
  server.registerTool(
    'list-transactions',
    {
      title: 'List Transactions',
      description: 'Fetch recent Monarch transactions',
      inputSchema,
    },
    async ({ limit }, extra) => {
      const auth = createAuthProvider();
      const client = createGraphQLClient();
      const { transactions } = await getTransactions(auth, client, {
        limit,
        offset: 0,
        orderBy: 'date',
        filters: {
          transactionVisibility: 'non_hidden_transactions_only',
        },
      });

      const rows = transactions.slice(0, limit).map((txn) => formatTransactionRow(txn));
      const text = renderTransactionTable(rows);

      const sessionId = extra.sessionId;
      if (sessionId) {
        server
          .sendLoggingMessage(
            {
              level: 'info',
              message: `Fetched ${rows.length} transactions (limit=${limit})`,
            },
            sessionId
          )
          .catch(() => {});
      }

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }
  );
}

function formatTransactionRow(txn: TransactionLike): {
  date: string;
  merchant: string;
  amount: string;
  category: string;
} {
  const amount = formatCurrency(txn.amount);
  const merchant = txn.merchant?.name || txn.plaidName || 'Unknown merchant';
  const category = txn.category?.name || 'Uncategorized';
  return {
    date: txn.date ?? '',
    merchant,
    amount,
    category,
  };
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function renderTransactionTable(rows: Array<{ date: string; merchant: string; amount: string; category: string }>): string {
  if (rows.length === 0) {
    return 'No transactions found for the requested criteria.';
  }

  const headers = ['Date', 'Merchant', 'Category', 'Amount'];
  const allRows = [headers, ...rows.map((row) => [row.date, row.merchant, row.category, row.amount])];
  const colWidths = headers.map((_, idx) => Math.max(...allRows.map((r) => r[idx]?.length ?? 0)));

  const formatRow = (cols: string[]): string =>
    cols
      .map((col, idx) => {
        const width = colWidths[idx];
        const value = col ?? '';
        return idx === colWidths.length - 1 ? value.padStart(width) : value.padEnd(width);
      })
      .join('  ');

  const lines = [
    formatRow(headers),
    formatRow(headers.map((_, idx) => '-'.repeat(colWidths[idx]))),
    ...rows.map((row) => formatRow([row.date, row.merchant, row.category, row.amount])),
  ];
  return lines.join('\n');
}
