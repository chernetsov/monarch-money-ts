// src/transactions.api.ts - Transactions API with explicit per-request auth
import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import {
  GetTransactionsResponseSchema,
  type GetTransactionsResponse,
  type GetTransactionsOptions,
  type Transaction,
  UpdateTransactionResponseSchema,
  type UpdateTransactionResponse,
  type UpdateTransactionCategoryInput,
  TRANSACTION_FIELDS,
} from './transactions.types.js';

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
          ${TRANSACTION_FIELDS}
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

/**
 * Update the category of a transaction.
 * 
 * @param auth - Authentication provider
 * @param client - MonarchGraphQLClient instance
 * @param input - Transaction ID and new category ID
 * @returns The updated transaction
 * 
 * @example
 * ```typescript
 * const updated = await updateTransactionCategory(auth, client, {
 *   id: '231907009223344866',
 *   categoryId: '170834763911676527'
 * });
 * 
 * console.log(`Updated category to: ${updated.category.name}`);
 * ```
 */
export async function updateTransactionCategory(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: UpdateTransactionCategoryInput
): Promise<Transaction> {
  const mutation = gql`
    mutation Web_UpdateTransactionOverview($input: UpdateTransactionMutationInput!) {
      updateTransaction(input: $input) {
        transaction {
          ${TRANSACTION_FIELDS}
        }
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
        __typename
      }
    }
  `;

  const variables = {
    input: {
      id: input.id,
      category: input.categoryId,
      isRecommendedCategory: false,
    },
  };

  const response = await client.request<UpdateTransactionResponse>(
    mutation,
    auth,
    UpdateTransactionResponseSchema,
    variables
  );

  const { transaction, errors } = response.updateTransaction;

  if (errors) {
    throw new MonarchMutationError(
      errors.message,
      errors.code,
      errors.fieldErrors.map((fe) => ({ field: fe.field, messages: fe.messages }))
    );
  }

  if (!transaction) {
    throw new MonarchMutationError(
      'Transaction update failed: no transaction returned',
      null,
      []
    );
  }

  return transaction;
}

