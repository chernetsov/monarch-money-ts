import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
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

  const response = await client.request(
    query,
    auth,
    GetBudgetCategoryGroupsResponseSchema,
  );
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
  const response = await client.request(
    query,
    auth,
    GetBudgetCategoryResponseSchema,
    variables,
  );
  return response.category;
}

