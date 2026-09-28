import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import { getCashflow, getCashflowSummary } from './cashflow.api.js';
import { getTransactions } from './transactions.api.js';

describe('integration: cashflow', () => {
  it('gets the cash flow summary for the current month', async () => {
    const { auth, client } = getIntegrationContext();
    const summary = await getCashflowSummary(auth, client);
    expect(typeof summary.sumIncome).toBe('number');
    expect(typeof summary.sumExpense).toBe('number');
    expect(typeof summary.savingsRate).toBe('number');
  });

  it('gets the cash flow breakdown for a date range', async () => {
    const { auth, client } = getIntegrationContext();
    const cashflow = await getCashflow(auth, client, {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(Array.isArray(cashflow.byCategory)).toBe(true);
    expect(Array.isArray(cashflow.byCategoryGroup)).toBe(true);
    expect(Array.isArray(cashflow.byMerchant)).toBe(true);
    expect(cashflow.summary.length).toBeGreaterThan(0);
  });

  it('applies transaction filters to the breakdown', async () => {
    const { auth, client } = getIntegrationContext();
    const range = { startDate: '2026-01-01', endDate: '2026-03-31' };
    const { transactions } = await getTransactions(auth, client, {
      limit: 1,
      filters: { ...range, categoryType: 'expense' },
    });
    expect(transactions.length).toBeGreaterThan(0);
    const categoryId = transactions[0].category!.id;

    const cashflow = await getCashflow(auth, client, {
      ...range,
      filters: { categoryIds: [categoryId] },
    });
    expect(cashflow.byCategory.length).toBeGreaterThan(0);
    for (const entry of cashflow.byCategory) {
      expect(entry.groupBy.category?.id).toBe(categoryId);
    }
  });
});
