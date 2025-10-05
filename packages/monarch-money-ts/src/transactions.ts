// src/transactions.ts - Transactions API with explicit per-request auth
import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
  GetTransactionsResponseSchema,
  type GetTransactionsResponse,
  type GetTransactionsOptions,
  type Transaction,
} from './transactions-types.js';

/**
 * Get transactions list with flexible filters and pagination.
 * 
 * @param auth - Authentication provider
 * @param client - MonarchGraphQLClient instance
 * @param options - Optional filters, pagination, and ordering
 * @returns Object containing transactions array, total count, and transaction rules
 * 
 * @example
 * ```typescript
 * const result = await getTransactions(auth, client, {
 *   limit: 25,
 *   orderBy: 'date',
 *   filters: {
 *     startDate: '2025-09-01',
 *     endDate: '2025-10-31',
 *     transactionVisibility: 'non_hidden_transactions_only'
 *   }
 * });
 * 
 * console.log(`Found ${result.totalCount} transactions`);
 * result.transactions.forEach(txn => {
 *   console.log(`${txn.date}: ${txn.merchant.name} - $${txn.amount}`);
 * });
 * ```
 */
export async function getTransactions(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  options?: GetTransactionsOptions
): Promise<{
  transactions: Transaction[];
  totalCount: number;
  totalSelectableCount: number;
  transactionRuleIds: string[];
}> {
  const query = gql`
    query Web_GetTransactionsList(
      $offset: Int,
      $limit: Int,
      $filters: TransactionFilterInput,
      $orderBy: TransactionOrdering
    ) {
      allTransactions(filters: $filters) {
        totalCount
        totalSelectableCount
        results(offset: $offset, limit: $limit, orderBy: $orderBy) {
          id
          amount
          pending
          date
          hideFromReports
          hiddenByAccount
          plaidName
          notes
          isRecurring
          reviewStatus
          needsReview
          isSplitTransaction
          dataProviderDescription
          attachments {
            id
            __typename
          }
          goal {
            id
            name
            __typename
          }
          category {
            id
            name
            icon
            group {
              id
              type
              __typename
            }
            __typename
          }
          merchant {
            name
            id
            transactionsCount
            logoUrl
            recurringTransactionStream {
              frequency
              isActive
              __typename
            }
            __typename
          }
          tags {
            id
            name
            color
            order
            __typename
          }
          account {
            id
            displayName
            icon
            logoUrl
            __typename
          }
          __typename
        }
        __typename
      }
      transactionRules {
        id
        __typename
      }
    }
  `;

  const variables = {
    offset: options?.offset,
    limit: options?.limit,
    orderBy: options?.orderBy,
    filters: options?.filters ?? {},
  } as Record<string, unknown>;

  const response = await client.request<GetTransactionsResponse>(
    query,
    auth,
    GetTransactionsResponseSchema,
    variables
  );

  return {
    transactions: response.allTransactions.results,
    totalCount: response.allTransactions.totalCount,
    totalSelectableCount: response.allTransactions.totalSelectableCount,
    transactionRuleIds: response.transactionRules.map((rule) => rule.id),
  };
}

