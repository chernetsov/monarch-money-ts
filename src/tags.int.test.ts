import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import {
  createTransactionTag,
  deleteTransactionTag,
  getTransactionTags,
  setTransactionTags,
} from './tags.api.js';
import { getTransactions } from './transactions.api.js';

describe('integration: tags', () => {
  it('lists household transaction tags', async () => {
    const { auth, client } = getIntegrationContext();
    const tags = await getTransactionTags(auth, client);
    expect(Array.isArray(tags)).toBe(true);
    if (tags.length > 0) {
      expect(tags[0]).toHaveProperty('id');
      expect(tags[0]).toHaveProperty('name');
      expect(tags[0]).toHaveProperty('transactionCount');
    }
  });

  it('creates a tag, assigns it, filters by it, and deletes it', async () => {
    const { auth, client } = getIntegrationContext();
    const { transactions } = await getTransactions(auth, client, { limit: 1 });
    expect(transactions.length).toBeGreaterThan(0);
    const txn = transactions[0];
    const originalTagIds = txn.tags.map((tag) => tag.id);

    const tag = await createTransactionTag(auth, client, {
      name: `mm-ts integration ${Date.now()}`,
      color: '#19D2A5',
    });
    try {
      const assignment = await setTransactionTags(auth, client, {
        transactionId: txn.id,
        tagIds: [...originalTagIds, tag.id],
      });
      expect(assignment.tags.map((t) => t.id)).toContain(tag.id);

      const tagged = await getTransactions(auth, client, {
        limit: 10,
        filters: { tagIds: [tag.id] },
      });
      expect(tagged.totalCount).toBe(1);
      expect(tagged.transactions[0].id).toBe(txn.id);
    } finally {
      await setTransactionTags(auth, client, { transactionId: txn.id, tagIds: originalTagIds });
      await deleteTransactionTag(auth, client, { tagId: tag.id });
    }

    const tags = await getTransactionTags(auth, client);
    expect(tags.some((t) => t.id === tag.id)).toBe(false);
  });
});
