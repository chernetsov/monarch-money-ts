import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import type { AuthProvider } from './auth.js';
import type { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import { setBudgetAmount } from './budget.api.js';
import { SetBudgetAmountInputSchema } from './budget.types.js';
import {
  createTransactionTag,
  deleteTransactionTag,
  getTransactionTags,
  setTransactionTags,
} from './tags.api.js';
import {
  getTransactionSplits,
  toTransactionFilterInput,
  updateTransactionSplits,
} from './transactions.api.js';
import { getCashflow, getCashflowSummary } from './cashflow.api.js';
import { CashflowInputSchema } from './cashflow.types.js';
import { getAccountsRefreshStatus, refreshAccounts } from './accounts.api.js';
import { startOfCurrentMonth, endOfCurrentMonth } from './dates.js';
import { createCategory, deleteCategory, restoreCategory } from './categories.api.js';
import { createTransactionRule, deleteTransactionRule } from './rules.api.js';

interface RecordedCall {
  query: string;
  variables?: Record<string, unknown>;
}

const auth = {} as AuthProvider;

/** Client whose responses are validated by the real schemas, like MonarchGraphQLClient. */
function mockClient(...responses: unknown[]): {
  client: MonarchGraphQLClient;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const client = {
    async request<T>(
      query: string,
      _auth: AuthProvider,
      schema: ZodType<T>,
      variables?: Record<string, unknown>,
    ): Promise<T> {
      calls.push({ query, variables });
      if (responses.length === 0) throw new Error('Unexpected request');
      return schema.parse(responses.shift());
    },
  } as unknown as MonarchGraphQLClient;
  return { client, calls };
}

const payloadError = {
  fieldErrors: [{ field: 'tagIds', messages: ['Invalid tag'], __typename: 'FieldErrorType' }],
  message: 'Invalid input',
  code: 'BAD_INPUT',
  __typename: 'PayloadError',
};

describe('setBudgetAmount', () => {
  it('sends Common_UpdateBudgetItem with Python-compatible variables', async () => {
    const { client, calls } = mockClient({
      updateOrCreateBudgetItem: {
        budgetItem: { id: 'b1', budgetAmount: 123, __typename: 'BudgetItem' },
        __typename: 'UpdateOrCreateBudgetItemMutation',
      },
    });

    const item = await setBudgetAmount(auth, client, {
      categoryId: 'c1',
      amount: 123,
      startDate: '2026-10-01',
    });

    expect(item).toEqual({ id: 'b1', budgetAmount: 123, __typename: 'BudgetItem' });
    expect(calls[0].query).toContain('mutation Common_UpdateBudgetItem');
    expect(calls[0].query).toContain('updateOrCreateBudgetItem(input: $input)');
    expect(calls[0].variables).toEqual({
      input: {
        startDate: '2026-10-01',
        timeframe: 'month',
        categoryId: 'c1',
        categoryGroupId: null,
        amount: 123,
        applyToFuture: false,
      },
    });
  });

  it('defaults startDate to the current month for category groups', async () => {
    const { client, calls } = mockClient({
      updateOrCreateBudgetItem: { budgetItem: { id: 'b2', budgetAmount: 0 } },
    });
    await setBudgetAmount(auth, client, { categoryGroupId: 'g1', amount: 0, applyToFuture: true });
    expect(calls[0].variables).toMatchObject({
      input: {
        startDate: startOfCurrentMonth(),
        categoryId: null,
        categoryGroupId: 'g1',
        applyToFuture: true,
      },
    });
  });

  it('requires exactly one of categoryId or categoryGroupId', () => {
    expect(SetBudgetAmountInputSchema.safeParse({ amount: 1 }).success).toBe(false);
    expect(
      SetBudgetAmountInputSchema.safeParse({ amount: 1, categoryId: 'a', categoryGroupId: 'b' })
        .success,
    ).toBe(false);
    expect(SetBudgetAmountInputSchema.safeParse({ amount: 1, categoryId: 'a' }).success).toBe(true);
  });
});

describe('tags', () => {
  const tag = {
    id: 't1',
    name: 'Tax',
    color: '#19D2A5',
    order: 0,
    transactionCount: 3,
    __typename: 'TransactionTag',
  };

  it('lists household tags', async () => {
    const { client, calls } = mockClient({ householdTransactionTags: [tag] });
    await expect(getTransactionTags(auth, client)).resolves.toEqual([tag]);
    expect(calls[0].query).toContain('query GetHouseholdTransactionTags');
  });

  it('creates a tag', async () => {
    const { client, calls } = mockClient({ createTransactionTag: { tag, errors: null } });
    await expect(
      createTransactionTag(auth, client, { name: 'Tax', color: '#19D2A5' }),
    ).resolves.toEqual(tag);
    expect(calls[0].query).toContain('mutation Common_CreateTransactionTag');
    expect(calls[0].variables).toEqual({ input: { name: 'Tax', color: '#19D2A5' } });
  });

  it('throws when tag creation returns errors', async () => {
    const { client } = mockClient({
      createTransactionTag: { tag: null, errors: { message: 'Duplicate tag' } },
    });
    await expect(
      createTransactionTag(auth, client, { name: 'Tax', color: '#19D2A5' }),
    ).rejects.toThrow('Duplicate tag');
  });

  it('sets tags on a transaction', async () => {
    const { client, calls } = mockClient({
      setTransactionTags: {
        errors: null,
        transaction: { id: 'tx1', tags: [{ id: 't1' }] },
      },
    });
    await expect(
      setTransactionTags(auth, client, { transactionId: 'tx1', tagIds: ['t1'] }),
    ).resolves.toEqual({ id: 'tx1', tags: [{ id: 't1' }] });
    expect(calls[0].query).toContain('mutation Web_SetTransactionTags');
    expect(calls[0].variables).toEqual({ input: { transactionId: 'tx1', tagIds: ['t1'] } });
  });

  it('surfaces set-tags payload errors as MonarchMutationError', async () => {
    const { client } = mockClient({
      setTransactionTags: { errors: payloadError, transaction: null },
    });
    const error = await setTransactionTags(auth, client, {
      transactionId: 'tx1',
      tagIds: ['bad'],
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MonarchMutationError);
    expect(error).toMatchObject({ code: 'BAD_INPUT', fieldErrors: [{ field: 'tagIds' }] });
  });
});

describe('transaction splits', () => {
  const split = {
    id: 's1',
    merchant: { id: 'm1', name: 'Costco' },
    category: { id: 'c1', name: 'Groceries' },
    amount: -60,
    notes: null,
  };

  it('gets splits for a transaction', async () => {
    const { client, calls } = mockClient({
      getTransaction: {
        id: 'tx1',
        amount: -100,
        category: { id: 'c0', name: 'Shopping' },
        merchant: { id: 'm1', name: 'Costco' },
        splitTransactions: [split],
      },
    });
    const result = await getTransactionSplits(auth, client, { id: 'tx1' });
    expect(result?.splitTransactions).toHaveLength(1);
    expect(calls[0].query).toContain('query TransactionSplitQuery($id: UUID!)');
    expect(calls[0].variables).toEqual({ id: 'tx1' });
  });

  it('updates splits', async () => {
    const { client, calls } = mockClient({
      updateTransactionSplit: {
        errors: null,
        transaction: { id: 'tx1', hasSplitTransactions: true, splitTransactions: [split] },
      },
    });
    const splitData = [
      { merchantName: 'Costco', amount: -60, categoryId: 'c1' },
      { merchantName: 'Costco', amount: -40, categoryId: 'c2' },
    ];
    const result = await updateTransactionSplits(auth, client, {
      transactionId: 'tx1',
      splitData,
    });
    expect(result.hasSplitTransactions).toBe(true);
    expect(calls[0].query).toContain('mutation Common_SplitTransactionMutation');
    expect(calls[0].query).toContain('updateTransactionSplit(input: $input)');
    expect(calls[0].variables).toEqual({ input: { transactionId: 'tx1', splitData } });
  });

  it('throws on split update errors', async () => {
    const { client } = mockClient({
      updateTransactionSplit: { errors: payloadError, transaction: null },
    });
    await expect(
      updateTransactionSplits(auth, client, { transactionId: 'tx1', splitData: [] }),
    ).rejects.toBeInstanceOf(MonarchMutationError);
  });
});

describe('cashflow', () => {
  const summary = { sumIncome: 10, sumExpense: -5, savings: 5, savingsRate: 0.5 };

  it('translates library filter names for the server', async () => {
    const { client, calls } = mockClient({ summary: [{ summary }] });
    await getCashflowSummary(auth, client, {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      filters: { categoryIds: ['c1'], accountIds: ['a1'] },
    });
    expect(calls[0].variables).toEqual({
      filters: {
        categories: ['c1'],
        accounts: ['a1'],
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      },
    });
  });

  it('returns the summary aggregate for a date range', async () => {
    const { client, calls } = mockClient({ summary: [{ summary }] });
    await expect(
      getCashflowSummary(auth, client, { startDate: '2026-09-01', endDate: '2026-09-30' }),
    ).resolves.toEqual(summary);
    expect(calls[0].variables).toEqual({
      filters: { startDate: '2026-09-01', endDate: '2026-09-30' },
    });
  });

  it('defaults to the current month and parses breakdowns', async () => {
    const { client, calls } = mockClient({
      byCategory: [
        {
          groupBy: {
            category: { id: 'c1', name: 'Groceries', group: { id: 'g1', type: 'expense' } },
          },
          summary: { sum: -5 },
        },
      ],
      byCategoryGroup: [
        {
          groupBy: { categoryGroup: { id: 'g1', name: 'Food', type: 'expense' } },
          summary: { sum: -5 },
        },
      ],
      byMerchant: [
        {
          groupBy: { merchant: { id: 'm1', name: 'Costco', logoUrl: null } },
          summary: { sumIncome: 0, sumExpense: -5 },
        },
      ],
      summary: [{ summary }],
    });
    const result = await getCashflow(auth, client);
    expect(result.byCategory).toHaveLength(1);
    expect(calls[0].variables).toEqual({
      filters: { startDate: startOfCurrentMonth(), endDate: endOfCurrentMonth() },
    });
  });

  it('rejects a half-open date range', () => {
    expect(CashflowInputSchema.safeParse({ startDate: '2026-09-01' }).success).toBe(false);
  });
});

describe('accounts refresh', () => {
  it('reports pending accounts from sync status', async () => {
    const { client } = mockClient({
      accounts: [
        { id: 'a1', hasSyncInProgress: true },
        { id: 'a2', hasSyncInProgress: false },
        { id: 'a3', hasSyncInProgress: true },
      ],
    });
    await expect(
      getAccountsRefreshStatus(auth, client, { accountIds: ['a1', 'a2'] }),
    ).resolves.toMatchObject({ complete: false, pendingAccountIds: ['a1'] });
  });

  it('requests a refresh and waits for completion', async () => {
    const { client, calls } = mockClient(
      { forceRefreshAccounts: { success: true, errors: null } },
      { accounts: [{ id: 'a1', hasSyncInProgress: true }] },
      { accounts: [{ id: 'a1', hasSyncInProgress: false }] },
    );
    const result = await refreshAccounts(auth, client, {
      accountIds: ['a1'],
      wait: true,
      delaySeconds: 0,
    });
    expect(result).toMatchObject({ waited: true, complete: true, pendingAccountIds: [] });
    expect(calls[0].query).toContain('mutation Common_ForceRefreshAccountsMutation');
    expect(calls[0].variables).toEqual({ input: { accountIds: ['a1'] } });
    expect(calls).toHaveLength(3);
  });

  it('throws when the refresh request is not successful', async () => {
    const { client } = mockClient({
      forceRefreshAccounts: { success: false, errors: payloadError },
    });
    await expect(refreshAccounts(auth, client, { accountIds: ['a1'] })).rejects.toBeInstanceOf(
      MonarchMutationError,
    );
  });
});

const categoryDetail = {
  id: 'cat1',
  order: 3,
  name: 'Kids Sports',
  icon: '🏐',
  systemCategory: null,
  systemCategoryDisplayName: null,
  budgetVariability: 'flexible',
  excludeFromBudget: false,
  isSystemCategory: false,
  isDisabled: false,
  group: {
    id: 'g1',
    type: 'expense',
    groupLevelBudgetingEnabled: false,
    __typename: 'CategoryGroup',
  },
  rolloverPeriod: null,
  __typename: 'Category',
};

describe('createCategory', () => {
  it('sends Web_CreateCategory with web-app defaults', async () => {
    const { client, calls } = mockClient({
      createCategory: {
        errors: null,
        category: categoryDetail,
        __typename: 'CreateCategoryMutation',
      },
    });

    const category = await createCategory(auth, client, {
      groupId: 'g1',
      name: 'Kids Sports',
      icon: '🏐',
    });

    expect(category.id).toBe('cat1');
    expect(calls[0].query).toContain('mutation Web_CreateCategory');
    expect(calls[0].variables).toEqual({
      input: {
        group: 'g1',
        name: 'Kids Sports',
        icon: '🏐',
        rolloverEnabled: false,
        rolloverType: 'monthly',
        rolloverStartMonth: startOfCurrentMonth(),
      },
    });
  });

  it('throws MonarchMutationError on payload errors', async () => {
    const { client } = mockClient({ createCategory: { errors: payloadError, category: null } });
    await expect(createCategory(auth, client, { groupId: 'g1', name: 'X' })).rejects.toBeInstanceOf(
      MonarchMutationError,
    );
  });
});

describe('restoreCategory', () => {
  it('sends Web_RestoreCategory with the category id', async () => {
    const { client, calls } = mockClient({
      restoreCategory: {
        errors: null,
        category: { ...categoryDetail, name: 'Rent', isSystemCategory: true },
      },
    });

    const category = await restoreCategory(auth, client, 'cat1');

    expect(category.name).toBe('Rent');
    expect(calls[0].query).toContain('mutation Web_RestoreCategory($id: UUID!)');
    expect(calls[0].variables).toEqual({ id: 'cat1' });
  });

  it('throws when no category is returned', async () => {
    const { client } = mockClient({ restoreCategory: { errors: null, category: null } });
    await expect(restoreCategory(auth, client, 'cat1')).rejects.toBeInstanceOf(
      MonarchMutationError,
    );
  });
});

function rule(id: string) {
  return {
    id,
    order: 0,
    merchantCriteriaUseOriginalStatement: false,
    merchantCriteria: [
      { operator: 'contains', value: 'terrazzo', __typename: 'MerchantCriterion' },
    ],
    originalStatementCriteria: null,
    merchantNameCriteria: null,
    amountCriteria: null,
    categoryIds: null,
    accountIds: null,
    categories: [],
    accounts: [],
    criteriaOwnerIsJoint: false,
    criteriaOwnerUserIds: null,
    criteriaOwnerUsers: null,
    setMerchantAction: null,
    setCategoryAction: { id: 'cat1', name: 'Rent', icon: '🏠', __typename: 'Category' },
    addTagsAction: null,
    linkGoalAction: null,
    needsReviewByUserAction: null,
    unassignNeedsReviewByUserAction: false,
    sendNotificationAction: false,
    setHideFromReportsAction: false,
    reviewStatusAction: null,
    actionSetOwnerIsJoint: false,
    actionSetOwner: null,
    splitTransactionsAction: null,
    recentApplicationCount: 0,
    lastAppliedAt: null,
    __typename: 'TransactionRuleV2',
  };
}

describe('createTransactionRule', () => {
  const input = {
    merchantCriteria: [{ operator: 'contains', value: 'terrazzo' }],
    setCategoryAction: 'cat1',
    applyToExistingTransactions: false,
  };

  it('creates the rule and returns the newly listed one', async () => {
    const { client, calls } = mockClient(
      { transactionRules: [rule('r1')] },
      { createTransactionRuleV2: { errors: null, __typename: 'CreateTransactionRuleV2Mutation' } },
      { transactionRules: [rule('r1'), rule('r2')] },
    );

    const created = await createTransactionRule(auth, client, input);

    expect(created.id).toBe('r2');
    expect(calls[1].query).toContain('mutation Common_CreateTransactionRuleMutationV2');
    expect(calls[1].variables).toEqual({ input });
  });

  it('throws MonarchMutationError on payload errors', async () => {
    const { client } = mockClient(
      { transactionRules: [] },
      { createTransactionRuleV2: { errors: payloadError } },
    );
    await expect(createTransactionRule(auth, client, input)).rejects.toBeInstanceOf(
      MonarchMutationError,
    );
  });
});

describe('toTransactionFilterInput', () => {
  it('renames library filters to server field names', () => {
    expect(
      toTransactionFilterInput({
        accountIds: ['a1'],
        categoryIds: ['c1'],
        merchantIds: ['m1'],
        tagIds: ['t1'],
        goalIds: ['g1'],
        isSplitTransaction: true,
        startDate: '2026-09-01',
        isPending: false,
      }),
    ).toEqual({
      accounts: ['a1'],
      categories: ['c1'],
      merchants: ['m1'],
      tags: ['t1'],
      goals: ['g1'],
      isSplit: true,
      startDate: '2026-09-01',
      isPending: false,
    });
  });

  it('maps amount filters to absolute-amount bounds', () => {
    expect(toTransactionFilterInput({ amount: -500, amountOperator: 'gt' })).toEqual({
      absAmountGte: 500,
    });
    expect(toTransactionFilterInput({ amount: 20, amountOperator: 'lte' })).toEqual({
      absAmountLte: 20,
    });
    expect(toTransactionFilterInput({ amount: 42 })).toEqual({
      absAmountGte: 42,
      absAmountLte: 42,
    });
  });
});

describe('MonarchMutationError.fromPayload', () => {
  it('falls back to field errors when the payload message is null', () => {
    const error = MonarchMutationError.fromPayload({
      fieldErrors: [{ field: 'category', messages: ['Category does not exist'] }],
      message: null,
      code: null,
    });
    expect(error.message).toBe('category: Category does not exist');
    expect(error.fieldErrors).toEqual([
      { field: 'category', messages: ['Category does not exist'] },
    ]);
  });
});

describe('delete mutations', () => {
  const failed = {
    message: null,
    code: null,
    fieldErrors: [{ field: 'id', messages: ['Not found'] }],
  };

  it('deletes a category, forwarding moveToCategoryId', async () => {
    const { client, calls } = mockClient({ deleteCategory: { errors: null, deleted: true } });
    await expect(
      deleteCategory(auth, client, { categoryId: 'c1', moveToCategoryId: 'c2' }),
    ).resolves.toBe(true);
    expect(calls[0].query).toContain('mutation Web_DeleteCategory');
    expect(calls[0].variables).toEqual({ id: 'c1', moveToCategoryId: 'c2' });
  });

  it('throws when a category is not deleted', async () => {
    const { client } = mockClient({ deleteCategory: { errors: null, deleted: false } });
    await expect(deleteCategory(auth, client, { categoryId: 'c1' })).rejects.toBeInstanceOf(
      MonarchMutationError,
    );
  });

  it('deletes a tag', async () => {
    const { client, calls } = mockClient({ deleteTransactionTag: { errors: null } });
    await expect(deleteTransactionTag(auth, client, { tagId: 't1' })).resolves.toBe(true);
    expect(calls[0].variables).toEqual({ tagId: 't1' });
  });

  it('deletes a rule even when Monarch reports deleted: false', async () => {
    const { client, calls } = mockClient({
      deleteTransactionRule: { deleted: false, errors: null },
    });
    await expect(deleteTransactionRule(auth, client, 'r1')).resolves.toBe(true);
    expect(calls[0].variables).toEqual({ id: 'r1' });
  });

  it('surfaces field errors from delete payloads', async () => {
    const { client } = mockClient({ deleteTransactionRule: { deleted: false, errors: failed } });
    await expect(deleteTransactionRule(auth, client, 'r1')).rejects.toThrow('id: Not found');
  });
});
