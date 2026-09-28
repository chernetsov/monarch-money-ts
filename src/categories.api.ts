import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import { startOfCurrentMonth } from './dates.js';
import {
  CreateCategoryResponseSchema,
  type CreateCategoryInput,
  type CreateCategoryResponse,
  RestoreCategoryResponseSchema,
  DeleteCategoryResponseSchema,
  type DeleteCategoryInput,
  type DeleteCategoryResponse,
  type RestoreCategoryResponse,
  ManageCategoryGroupsResponseSchema,
  type ManageCategoryGroupsResponse,
  GetBudgetCategoryGroupsResponseSchema,
  type BudgetCategoryGroupWithBudgeting,
  GetBudgetCategoryResponseSchema,
  type BudgetCategoryDetail,
} from './categories.types.js';

/**
 * Fetches all budget categories and their groups (includes disabled system categories).
 */
export async function getBudgetCategories(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
): Promise<ManageCategoryGroupsResponse> {
  const query = gql`
    query ManageGetCategoryGroups {
      categoryGroups {
        id
        name
        order
        type
        __typename
      }
      categories(includeDisabledSystemCategories: true) {
        id
        name
        order
        icon
        isSystemCategory
        systemCategory
        isDisabled
        group {
          id
          type
          name
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<ManageCategoryGroupsResponse>(
    query,
    auth,
    ManageCategoryGroupsResponseSchema,
  );

  return response;
}

/**
 * Retrieves category groups with budgeting metadata (color, variability, rollover).
 */
export async function getBudgetCategoryGroups(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
): Promise<BudgetCategoryGroupWithBudgeting[]> {
  const query = gql`
    query GetCategoryGroups {
      categoryGroups {
        id
        name
        order
        type
        color
        groupLevelBudgetingEnabled
        budgetVariability
        rolloverPeriod {
          id
          startMonth
          endMonth
          startingBalance
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request(query, auth, GetBudgetCategoryGroupsResponseSchema);
  return response.categoryGroups;
}

/**
 * Fetches full detail for a single budget category (edit form payload).
 */
export async function getBudgetCategory(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  categoryId: string,
): Promise<BudgetCategoryDetail> {
  const query = gql`
    query Web_GetEditCategory($id: UUID!) {
      category(id: $id) {
        id
        order
        name
        icon
        systemCategory
        systemCategoryDisplayName
        budgetVariability
        excludeFromBudget
        isSystemCategory
        isDisabled
        group {
          id
          type
          groupLevelBudgetingEnabled
          __typename
        }
        rolloverPeriod {
          id
          startMonth
          startingBalance
          type
          frequency
          targetAmount
          __typename
        }
        __typename
      }
    }
  `;

  const variables = { id: categoryId } as Record<string, unknown>;
  const response = await client.request(query, auth, GetBudgetCategoryResponseSchema, variables);
  return response.category;
}

/**
 * Creates a budget category in an existing category group.
 *
 * @example
 * ```typescript
 * const category = await createCategory(auth, client, { groupId: 'GROUP_ID', name: 'Kids Sports', icon: '🏐' });
 * ```
 */
export async function createCategory(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: CreateCategoryInput,
): Promise<BudgetCategoryDetail> {
  const mutation = gql`
    mutation Web_CreateCategory($input: CreateCategoryInput!) {
      createCategory(input: $input) {
        errors {
          fieldErrors {
            field
            messages
            __typename
          }
          message
          code
          __typename
        }
        category {
          id
          order
          name
          icon
          systemCategory
          systemCategoryDisplayName
          budgetVariability
          excludeFromBudget
          isSystemCategory
          isDisabled
          group {
            id
            type
            groupLevelBudgetingEnabled
            __typename
          }
          rolloverPeriod {
            id
            startMonth
            startingBalance
            type
            frequency
            targetAmount
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<CreateCategoryResponse>(
    mutation,
    auth,
    CreateCategoryResponseSchema,
    {
      input: {
        group: input.groupId,
        name: input.name,
        icon: input.icon ?? '\u2753',
        rolloverEnabled: input.rolloverEnabled ?? false,
        rolloverType: input.rolloverType ?? 'monthly',
        rolloverStartMonth: input.rolloverStartMonth ?? startOfCurrentMonth(),
      },
    },
  );

  const { category, errors } = response.createCategory;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!category) {
    throw new MonarchMutationError('Category creation failed: no category returned', null, []);
  }
  return category;
}

/**
 * Re-enables a disabled system category (the web app's "Enable category" action).
 *
 * @example
 * ```typescript
 * const rent = await restoreCategory(auth, client, 'CATEGORY_ID');
 * ```
 */
export async function restoreCategory(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  categoryId: string,
): Promise<BudgetCategoryDetail> {
  const mutation = gql`
    mutation Web_RestoreCategory($id: UUID!) {
      restoreCategory(id: $id) {
        errors {
          fieldErrors {
            field
            messages
            __typename
          }
          message
          code
          __typename
        }
        category {
          id
          order
          name
          icon
          systemCategory
          systemCategoryDisplayName
          budgetVariability
          excludeFromBudget
          isSystemCategory
          isDisabled
          group {
            id
            type
            groupLevelBudgetingEnabled
            __typename
          }
          rolloverPeriod {
            id
            startMonth
            startingBalance
            type
            frequency
            targetAmount
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<RestoreCategoryResponse>(
    mutation,
    auth,
    RestoreCategoryResponseSchema,
    { id: categoryId },
  );

  const { category, errors } = response.restoreCategory;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!category) {
    throw new MonarchMutationError('Category restore failed: no category returned', null, []);
  }
  return category;
}

/**
 * Delete a category. Custom categories are removed; system categories are disabled
 * and can be re-enabled with `restoreCategory`. Pass `moveToCategoryId` when the
 * category still has transactions.
 *
 * @example
 * ```typescript
 * await deleteCategory(auth, client, { categoryId: 'CATEGORY_ID', moveToCategoryId: 'OTHER_ID' });
 * ```
 */
export async function deleteCategory(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: DeleteCategoryInput,
): Promise<true> {
  const mutation = gql`
    mutation Web_DeleteCategory($id: UUID!, $moveToCategoryId: UUID) {
      deleteCategory(id: $id, moveToCategoryId: $moveToCategoryId) {
        errors {
          fieldErrors {
            field
            messages
            __typename
          }
          message
          code
          __typename
        }
        deleted
        __typename
      }
    }
  `;

  const response = await client.request<DeleteCategoryResponse>(
    mutation,
    auth,
    DeleteCategoryResponseSchema,
    { id: input.categoryId, moveToCategoryId: input.moveToCategoryId },
  );

  const { deleted, errors } = response.deleteCategory;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!deleted) {
    throw new MonarchMutationError('Category deletion failed: category was not deleted', null, []);
  }
  return true;
}
