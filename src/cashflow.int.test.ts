import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import { getCashflow, getCashflowSummary } from './cashflow.api.js';

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
});
