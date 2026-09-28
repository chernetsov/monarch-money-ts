import { describe, expect, it } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import { getAggregatedRecurringItems, getRecurringTransactionStreams } from './recurring.api.js';

const currentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

describe('integration: recurring', () => {
  it('gets recurring transaction streams', async () => {
    const { auth, client } = getIntegrationContext();
    const streams = await getRecurringTransactionStreams(auth, client);

    expect(Array.isArray(streams)).toBe(true);
    if (streams.length > 0) {
      expect(streams[0]).toHaveProperty('stream');
      expect(streams[0].stream).toHaveProperty('id');
      expect(streams[0].stream).toHaveProperty('frequency');
      expect(streams[0].stream).toHaveProperty('name');
    }
  });

  it('gets aggregated recurring items for the current month', async () => {
    const { auth, client } = getIntegrationContext();
    const recurring = await getAggregatedRecurringItems(auth, client, currentMonthRange());

    expect(recurring).toHaveProperty('groups');
    expect(Array.isArray(recurring.groups)).toBe(true);
    expect(recurring).toHaveProperty('aggregatedSummary');
    expect(recurring.aggregatedSummary).toHaveProperty('expense');
    expect(recurring.aggregatedSummary).toHaveProperty('income');
  });
});
