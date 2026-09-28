import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import { getTransactionTags } from './tags.api.js';

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
});
