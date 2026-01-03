import { describe, it, expect } from 'vitest';
import { getIntegrationContext } from './test-utils.js';
import {
  getBudgetCategories,
  getBudgetCategoryGroups,
  getBudgetCategory,
} from './categories.api.js';

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
});

