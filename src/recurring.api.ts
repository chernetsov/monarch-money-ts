import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import type { MonarchGraphQLClient } from './graphql.js';
import {
  AggregatedRecurringItemsSchema,
  GetAggregatedRecurringItemsResponseSchema,
  GetRecurringTransactionStreamsResponseSchema,
  RECURRING_CALENDAR_ITEM_FIELDS,
  RECURRING_STREAM_FIELDS,
  type AggregatedRecurringItems,
  type GetAggregatedRecurringItemsInput,
  type GetAggregatedRecurringItemsResponse,
  type GetRecurringTransactionStreamsInput,
  type GetRecurringTransactionStreamsResponse,
  type RecurringTransactionStreamItem,
} from './recurring.types.js';

/**
 * Fetch recurring transaction streams, including pending streams and optionally liabilities.
 *
 * This mirrors the web app's recurring overview stream query.
 */
export async function getRecurringTransactionStreams(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: GetRecurringTransactionStreamsInput,
): Promise<RecurringTransactionStreamItem[]> {
  const query = gql`
    query Common_GetRecurringStreams($includeLiabilities: Boolean) {
      recurringTransactionStreams(includePending: true, includeLiabilities: $includeLiabilities) {
        stream {
          ${RECURRING_STREAM_FIELDS}
        }
        __typename
      }
    }
  `;

  const response = await client.request<GetRecurringTransactionStreamsResponse>(
    query,
    auth,
    GetRecurringTransactionStreamsResponseSchema,
    { includeLiabilities: input?.includeLiabilities ?? true },
  );
  return response.recurringTransactionStreams;
}

/**
 * Fetch recurring calendar items grouped by status for a date range.
 *
 * The web app uses this for the recurring upcoming/merchant views.
 */
export async function getAggregatedRecurringItems(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: GetAggregatedRecurringItemsInput,
): Promise<AggregatedRecurringItems> {
  const query = gql`
    query Common_GetAggregatedRecurringItems(
      $startDate: Date!
      $endDate: Date!
      $filters: RecurringTransactionFilter
      $includeFinancialInsights: Boolean = false
    ) {
      aggregatedRecurringItems(
        startDate: $startDate
        endDate: $endDate
        groupBy: "status"
        filters: $filters
      ) {
        groups {
          groupBy {
            status
            __typename
          }
          results {
            ${RECURRING_CALENDAR_ITEM_FIELDS}
          }
          summary {
            expense {
              total
              __typename
            }
            creditCard {
              total
              __typename
            }
            income {
              total
              __typename
            }
            __typename
          }
          __typename
        }
        aggregatedSummary {
          expense {
            completed
            remaining
            total
            count
            pendingAmountCount
            __typename
          }
          creditCard {
            completed
            remaining
            total
            count
            pendingAmountCount
            __typename
          }
          income {
            completed
            remaining
            total
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<GetAggregatedRecurringItemsResponse>(
    query,
    auth,
    GetAggregatedRecurringItemsResponseSchema,
    {
      startDate: input.startDate,
      endDate: input.endDate,
      filters: input.filters ?? {},
      includeFinancialInsights: input.includeFinancialInsights ?? false,
    },
  );
  return AggregatedRecurringItemsSchema.parse(response.aggregatedRecurringItems);
}
