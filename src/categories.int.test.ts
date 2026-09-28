import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import {
  createCategory,
  deleteCategory,
  getBudgetCategories,
  getBudgetCategoryGroups,
  getBudgetCategory,
  restoreCategory,
} from './categories.api.js';
import { getTransactions } from './transactions.api.js';

describe('integration: categories', () => {
  it('gets budget categories and groups', async () => {
    const { auth, client } = getIntegrationContext();
    const { categories, categoryGroups } = await getBudgetCategories(auth, client);
    expect(Array.isArray(categories)).toBe(true);
    expect(Array.isArray(categoryGroups)).toBe(true);
    if (categories.length > 0) {
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('group');
    }
  });

  it('gets budget category groups with budgeting metadata', async () => {
    const { auth, client } = getIntegrationContext();
    const groups = await getBudgetCategoryGroups(auth, client);
    expect(Array.isArray(groups)).toBe(true);
    if (groups.length > 0) {
      expect(groups[0]).toHaveProperty('color');
      expect(groups[0]).toHaveProperty('groupLevelBudgetingEnabled');
    }
  });

  it('gets single budget category detail', async () => {
    const { auth, client } = getIntegrationContext();
    const { categories } = await getBudgetCategories(auth, client);
    if (categories.length === 0) {
      expect(categories.length).toBe(0);
      return;
    }
    const categoryId = categories[0].id;
    const category = await getBudgetCategory(auth, client, categoryId);
    expect(category.id).toBe(categoryId);
    expect(category).toHaveProperty('budgetVariability');
    expect(category.group).toHaveProperty('groupLevelBudgetingEnabled');
  });

  it('creates and deletes a custom category', async () => {
    const { auth, client } = getIntegrationContext();
    const { categoryGroups } = await getBudgetCategories(auth, client);
    const group = categoryGroups.find((g) => g.type === 'expense');
    expect(group).toBeDefined();

    const name = `mm-ts integration ${Date.now()}`;
    const created = await createCategory(auth, client, { groupId: group!.id, name });
    try {
      expect(created.name).toBe(name);
      expect(created.group.id).toBe(group!.id);
      const fetched = await getBudgetCategory(auth, client, created.id);
      expect(fetched.id).toBe(created.id);
    } finally {
      await deleteCategory(auth, client, { categoryId: created.id });
    }

    const { categories } = await getBudgetCategories(auth, client);
    expect(categories.some((c) => c.id === created.id)).toBe(false);
  });

  it('restores a disabled system category and disables it again', async () => {
    const { auth, client } = getIntegrationContext();
    const { categories } = await getBudgetCategories(auth, client);
    let target: (typeof categories)[number] | undefined;
    for (const c of categories.filter((c) => c.isSystemCategory && c.isDisabled)) {
      const { totalCount } = await getTransactions(auth, client, {
        limit: 1,
        filters: { categoryIds: [c.id] },
      });
      if (totalCount === 0) {
        target = c;
        break;
      }
    }
    if (!target) {
      console.warn('No unused disabled system category; skipping restore round trip');
      return;
    }

    try {
      const restored = await restoreCategory(auth, client, target.id);
      expect(restored.id).toBe(target.id);
      expect(restored.isDisabled).toBe(false);
    } finally {
      await deleteCategory(auth, client, { categoryId: target.id });
    }

    const after = await getBudgetCategory(auth, client, target.id);
    expect(after.isDisabled).toBe(true);
  });
});
