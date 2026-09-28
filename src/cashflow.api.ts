import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import type { MonarchGraphQLClient } from './graphql.js';
import {
  CASHFLOW_SUMMARY_FIELDS,
  CashflowInputSchema,
  CashflowSchema,
  GetCashflowSummaryResponseSchema,
  type Cashflow,
  type CashflowInput,
  type CashflowSummary,
  type GetCashflowSummaryResponse,
} from './cashflow.types.js';
import { endOfCurrentMonth, startOfCurrentMonth } from './dates.js';

function buildCashflowVariables(input?: CashflowInput): Record<string, unknown> {
  const parsed = CashflowInputSchema.parse(input ?? {});
  return {
    filters: {
      ...parsed.filters,
      startDate: parsed.startDate ?? startOfCurrentMonth(),
      endDate: parsed.endDate ?? endOfCurrentMonth(),
    },
  };
}

/**
 * Get cash flow for a date range broken down by category, category group, and merchant,
 * plus income/expense/savings totals. Defaults to the current month.
 *
 * @example
 * ```typescript
 * const cashflow = await getCashflow(auth, client, {
 *   startDate: '2026-09-01',
 *   endDate: '2026-09-30',
 * });
 * ```
 */
export async function getCashflow(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: CashflowInput,
): Promise<Cashflow> {
  const query = gql`
    query Web_GetCashFlowPage($filters: TransactionFilterInput) {
      byCategory: aggregates(filters: $filters, groupBy: ["category"]) {
        groupBy {
          category {
            id
            name
            group {
              id
              type
              __typename
            }
            __typename
          }
          __typename
        }
        summary {
          sum
          __typename
        }
        __typename
      }
      byCategoryGroup: aggregates(filters: $filters, groupBy: ["categoryGroup"]) {
        groupBy {
          categoryGroup {
            id
            name
            type
            __typename
          }
          __typename
        }
        summary {
          sum
          __typename
        }
        __typename
      }
      byMerchant: aggregates(filters: $filters, groupBy: ["merchant"]) {
        groupBy {
          merchant {
            id
            name
            logoUrl
            __typename
          }
          __typename
        }
        summary {
          sumIncome
          sumExpense
          __typename
        }
        __typename
      }
      summary: aggregates(filters: $filters, fillEmptyValues: true) {
        summary {
          ${CASHFLOW_SUMMARY_FIELDS}
        }
        __typename
      }
    }
  `;

  return client.request<Cashflow>(query, auth, CashflowSchema, buildCashflowVariables(input));
}

/**
 * Get income, expense, savings, and savings rate totals for a date range.
 * Defaults to the current month.
 *
 * @example
 * ```typescript
 * const summary = await getCashflowSummary(auth, client, {
 *   startDate: '2026-09-01',
 *   endDate: '2026-09-30',
 * });
 * console.log(summary.savingsRate);
 * ```
 */
export async function getCashflowSummary(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: CashflowInput,
): Promise<CashflowSummary> {
  const query = gql`
    query Web_GetCashFlowPage($filters: TransactionFilterInput) {
      summary: aggregates(filters: $filters, fillEmptyValues: true) {
        summary {
          ${CASHFLOW_SUMMARY_FIELDS}
        }
        __typename
      }
    }
  `;

  const response = await client.request<GetCashflowSummaryResponse>(
    query,
    auth,
    GetCashflowSummaryResponseSchema,
    buildCashflowVariables(input),
  );
  const first = response.summary[0];
  if (!first) {
    throw new Error('Cash flow summary response contained no aggregates');
  }
  return first.summary;
}
