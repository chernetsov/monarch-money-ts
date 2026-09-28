import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import {
  createTransactionRule,
  deleteTransactionRule,
  getTransactionRules,
  previewTransactionRule,
} from './rules.api.js';
import { getBudgetCategories } from './categories.api.js';

describe('integration: rules', () => {
  it('gets transaction rules', async () => {
    const { auth, client } = getIntegrationContext();
    const rules = await getTransactionRules(auth, client);
    expect(Array.isArray(rules)).toBe(true);
    if (rules.length > 0) {
      expect(rules[0]).toHaveProperty('id');
      expect(rules[0]).toHaveProperty('order');
      expect(typeof rules[0].order).toBe('number');
      expect(rules[0]).toHaveProperty('merchantCriteria');
      expect(Array.isArray(rules[0].merchantCriteria)).toBe(true);
    }
  });

  it('previews a transaction rule with merchant criteria', async () => {
    const { auth, client } = getIntegrationContext();
    const preview = await previewTransactionRule(auth, client, {
      merchantCriteriaUseOriginalStatement: false,
      merchantCriteria: [{ operator: 'contains', value: 'test' }],
    });
    expect(preview).toHaveProperty('totalCount');
    expect(typeof preview.totalCount).toBe('number');
    expect(preview).toHaveProperty('results');
    expect(Array.isArray(preview.results)).toBe(true);
  });

  it('creates and deletes a transaction rule', async () => {
    const { auth, client } = getIntegrationContext();
    const { categories } = await getBudgetCategories(auth, client);
    const category = categories.find((c) => !c.isDisabled);
    expect(category).toBeDefined();

    const marker = `mm-ts-integration-${Date.now()}`;
    const rule = await createTransactionRule(auth, client, {
      merchantCriteriaUseOriginalStatement: false,
      merchantCriteria: [{ operator: 'contains', value: marker }],
      setCategoryAction: category!.id,
      applyToExistingTransactions: false,
    });
    try {
      expect(rule.merchantCriteria?.[0]?.value).toBe(marker);
      expect(rule.setCategoryAction?.id).toBe(category!.id);
    } finally {
      await deleteTransactionRule(auth, client, rule.id);
    }

    const rules = await getTransactionRules(auth, client);
    expect(rules.some((r) => r.id === rule.id)).toBe(false);
  });
});
