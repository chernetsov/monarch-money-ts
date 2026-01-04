import { gql } from "graphql-request";
import { z } from "zod";
import type { AuthProvider } from "./auth.js";
import type { MonarchGraphQLClient } from "./graphql.js";
import {
  BudgetReportSchema,
  type BudgetReport,
  type BudgetReportInput,
  BUDGET_DATA_FIELDS,
  BUDGET_REPORT_CATEGORY_GROUP_FIELDS,
  GOAL_V2_FIELDS,
  SAVINGS_GOAL_MONTHLY_BUDGET_AMOUNTS_FIELDS,
  BudgetStatusSchema,
  type BudgetStatus,
  BUDGET_STATUS_FIELDS,
  BudgetSettingsSchema,
  type BudgetSettings,
} from "./budget.types.js";

/**
 * Fetches comprehensive budget report data including:
 * - Budget data with monthly amounts by category and category group
 * - Category groups with their categories
 * - Goals V2 with planned contributions
 * - Savings goal monthly budget amounts
 *
 * @param auth - Authentication provider
 * @param client - GraphQL client
 * @param input - Start and end dates for the budget report (format: "YYYY-MM-DD")
 * @returns Parsed budget report data
 *
 * @example
 * ```typescript
 * const report = await getBudgetReport(auth, client, {
 *   startDate: "2025-12-01",
 *   endDate: "2026-03-01"
 * });
 * ```
 */
export async function getBudgetReport(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: BudgetReportInput
): Promise<BudgetReport> {
  const query = gql`
    query GetBudgetReport($startDate: Date!, $endDate: Date!) {
      budgetSystem
      budgetData(startMonth: $startDate, endMonth: $endDate) {
        ${BUDGET_DATA_FIELDS}
      }
      categoryGroups {
        ${BUDGET_REPORT_CATEGORY_GROUP_FIELDS}
      }
      goalsV2 {
        ${GOAL_V2_FIELDS}
      }
      savingsGoalMonthlyBudgetAmounts(startMonth: $startDate, endMonth: $endDate) {
        ${SAVINGS_GOAL_MONTHLY_BUDGET_AMOUNTS_FIELDS}
      }
    }
  `;

  const variables = {
    startDate: input.startDate,
    endDate: input.endDate,
  };

  const response = await client.request<BudgetReport>(
    query,
    auth,
    BudgetReportSchema,
    variables
  );
  return response;
}

/**
 * Fetches budget status information indicating whether the user has:
 * - A budget set up
 * - Transactions in their account
 * - Will create a budget from empty default categories
 *
 * @param auth - Authentication provider
 * @param client - GraphQL client
 * @returns Budget status information
 *
 * @example
 * ```typescript
 * const status = await getBudgetStatus(auth, client);
 * if (status.hasBudget) {
 *   console.log("User has a budget set up");
 * }
 * ```
 */
export async function getBudgetStatus(
  auth: AuthProvider,
  client: MonarchGraphQLClient
): Promise<BudgetStatus> {
  const query = gql`
    query GetBudgetStatus {
      budgetStatus {
        ${BUDGET_STATUS_FIELDS}
      }
    }
  `;

  const responseSchema = z.object({
    budgetStatus: BudgetStatusSchema,
  });
  const response = await client.request<z.infer<typeof responseSchema>>(
    query,
    auth,
    responseSchema
  );
  return response.budgetStatus;
}

/**
 * Fetches budget settings including:
 * - Budget system type (e.g., "groups_and_categories")
 * - Whether to apply budget changes to future months by default
 * - Flex expense rollover period configuration
 *
 * @param auth - Authentication provider
 * @param client - GraphQL client
 * @returns Budget settings
 *
 * @example
 * ```typescript
 * const settings = await getBudgetSettings(auth, client);
 * console.log(`Budget system: ${settings.budgetSystem}`);
 * ```
 */
export async function getBudgetSettings(
  auth: AuthProvider,
  client: MonarchGraphQLClient
): Promise<BudgetSettings> {
  const query = gql`
    query GetBudgetSettings {
      budgetSystem
      budgetApplyToFutureMonthsDefault
      flexExpenseRolloverPeriod {
        id
        startMonth
        startingBalance
      }
    }
  `;

  const response = await client.request<BudgetSettings>(
    query,
    auth,
    BudgetSettingsSchema
  );
  return response;
}

