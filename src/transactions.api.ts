// src/transactions.api.ts - Transactions API with explicit per-request auth
import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import {
  GetTransactionsResponseSchema,
  type GetTransactionsResponse,
  type GetTransactionsOptions,
  type TransactionFiltersInput,
  GetTransactionResponseSchema,
  type GetTransactionResponse,
  type GetTransactionOptions,
  type Transaction,
  UpdateTransactionResponseSchema,
  type UpdateTransactionResponse,
  type UpdateTransactionInput,
  TRANSACTION_FIELDS,
  GetTransactionSplitsResponseSchema,
  type GetTransactionSplitsResponse,
  type GetTransactionSplitsInput,
  type TransactionSplits,
  UpdateTransactionSplitsResponseSchema,
  type UpdateTransactionSplitsResponse,
  type UpdateTransactionSplitsInput,
  type UpdatedTransactionSplits,
  TRANSACTION_SPLITS_FIELDS,
  TRANSACTION_SPLIT_FIELDS,
} from './transactions.types.js';

/** Library filter names that differ from the server's TransactionFilterInput. */
const FILTER_FIELD_NAMES: Record<string, string> = {
  accountIds: 'accounts',
  categoryIds: 'categories',
  merchantIds: 'merchants',
  tagIds: 'tags',
  goalIds: 'goals',
  isSplitTransaction: 'isSplit',
};

/**
 * Converts library filters to TransactionFilterInput. The server rejects unknown
 * fields with a masked error, so renamed fields must never be sent as-is.
 * `amount` + `amountOperator` map to the server's absolute-amount bounds.
 */
export function toTransactionFilterInput(
  filters: TransactionFiltersInput,
): Record<string, unknown> {
  const { amount, amountOperator, ...rest } = filters;
  const input: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    input[FILTER_FIELD_NAMES[key] ?? key] = value;
  }
  if (amount !== undefined) {
    const abs = Math.abs(amount);
    const op = amountOperator ?? 'eq';
    if (op === 'gt' || op === 'gte' || op === 'eq') input.absAmountGte = abs;
    if (op === 'lt' || op === 'lte' || op === 'eq') input.absAmountLte = abs;
  }
  return input;
}

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
  options?: GetTransactionsOptions,
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
    filters: toTransactionFilterInput(options?.filters ?? {}),
  } as Record<string, unknown>;

  const response = await client.request<GetTransactionsResponse>(
    query,
    auth,
    GetTransactionsResponseSchema,
    variables,
  );

  return {
    transactions: response.allTransactions.results,
    totalCount: response.allTransactions.totalCount,
    totalSelectableCount: response.allTransactions.totalSelectableCount,
    transactionRuleIds: response.transactionRules.map((rule) => rule.id),
  };
}

/**
 * Get a single transaction by ID with full detail.
 *
 * @param auth - Authentication provider
 * @param client - MonarchGraphQLClient instance
 * @param options - Transaction ID and optional flags
 * @returns The transaction with full details
 *
 * @example
 * ```typescript
 * const transaction = await getTransaction(auth, client, {
 *   id: 'TRANSACTION_ID',
 *   redirectPosted: true
 * });
 *
 * console.log(`Transaction: ${transaction.merchant.name} - $${transaction.amount}`);
 * if (transaction.hasSplitTransactions) {
 *   console.log(`Has ${transaction.splitTransactions?.length} split transactions`);
 * }
 * ```
 */
export async function getTransaction(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  options: GetTransactionOptions,
): Promise<Transaction | null> {
  const query = gql`
    query GetTransactionDrawer($id: UUID!, $redirectPosted: Boolean) {
      getTransaction(id: $id, redirectPosted: $redirectPosted) {
        ${TRANSACTION_FIELDS}
        originalDate
        hasSplitTransactions
        isManual
        updatedByRetailSync
        splitTransactions {
          id
          __typename
        }
        originalTransaction {
          id
          __typename
        }
        needsReviewByUser {
          id
          __typename
        }
        ownershipOverriddenAt
      }
    }
  `;

  const variables = {
    id: options.id,
    redirectPosted: options.redirectPosted ?? true,
  };

  const response = await client.request<GetTransactionResponse>(
    query,
    auth,
    GetTransactionResponseSchema,
    variables,
  );

  return response.getTransaction;
}

/**
 * Update a transaction with flexible field updates.
 *
 * @param auth - Authentication provider
 * @param client - MonarchGraphQLClient instance
 * @param input - Transaction ID and fields to update
 * @returns The updated transaction
 *
 * @example
 * ```typescript
 * // Update category
 * const updated = await updateTransaction(auth, client, {
 *   id: 'TRANSACTION_ID',
 *   category: 'CATEGORY_ID',
 *   isRecommendedCategory: false
 * });
 *
 * // Mark as reviewed
 * const reviewed = await updateTransaction(auth, client, {
 *   id: 'TRANSACTION_ID',
 *   reviewed: true
 * });
 *
 * // Mark as needing review
 * const needsReview = await updateTransaction(auth, client, {
 *   id: 'TRANSACTION_ID',
 *   needsReview: true
 * });
 *
 * // Update notes
 * const withNotes = await updateTransaction(auth, client, {
 *   id: 'TRANSACTION_ID',
 *   notes: 'Business expense'
 * });
 * ```
 */
export async function updateTransaction(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const mutation = gql`
    mutation Web_UpdateTransaction($input: UpdateTransactionMutationInput!) {
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

  // Build variables object with only the fields that were provided
  const { id, ...updateFields } = input;
  const variables = {
    input: {
      id,
      ...updateFields,
    },
  };

  const response = await client.request<UpdateTransactionResponse>(
    mutation,
    auth,
    UpdateTransactionResponseSchema,
    variables,
  );

  const { transaction, errors } = response.updateTransaction;

  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }

  if (!transaction) {
    throw new MonarchMutationError('Transaction update failed: no transaction returned', null, []);
  }

  return transaction;
}

/**
 * Get a transaction's split children.
 *
 * @returns The parent transaction with `splitTransactions`, or null if not found
 *
 * @example
 * ```typescript
 * const splits = await getTransactionSplits(auth, client, { id: 'TRANSACTION_ID' });
 * ```
 */
export async function getTransactionSplits(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: GetTransactionSplitsInput,
): Promise<TransactionSplits | null> {
  const query = gql`
    query TransactionSplitQuery($id: UUID!) {
      getTransaction(id: $id) {
        ${TRANSACTION_SPLITS_FIELDS}
      }
    }
  `;

  const response = await client.request<GetTransactionSplitsResponse>(
    query,
    auth,
    GetTransactionSplitsResponseSchema,
    { id: input.id },
  );
  return response.getTransaction;
}

/**
 * Replace a transaction's splits. Split amounts must sum to the parent amount;
 * an empty `splitData` array removes all splits.
 *
 * @example
 * ```typescript
 * await updateTransactionSplits(auth, client, {
 *   transactionId: 'TRANSACTION_ID',
 *   splitData: [
 *     { merchantName: 'Costco', amount: -60, categoryId: 'GROCERIES_ID' },
 *     { merchantName: 'Costco', amount: -40, categoryId: 'HOUSEHOLD_ID' },
 *   ],
 * });
 * ```
 */
export async function updateTransactionSplits(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: UpdateTransactionSplitsInput,
): Promise<UpdatedTransactionSplits> {
  const mutation = gql`
    mutation Common_SplitTransactionMutation($input: UpdateTransactionSplitMutationInput!) {
      updateTransactionSplit(input: $input) {
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
        transaction {
          id
          hasSplitTransactions
          splitTransactions {
            ${TRANSACTION_SPLIT_FIELDS}
          }
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<UpdateTransactionSplitsResponse>(
    mutation,
    auth,
    UpdateTransactionSplitsResponseSchema,
    { input: { transactionId: input.transactionId, splitData: input.splitData } },
  );

  const { transaction, errors } = response.updateTransactionSplit;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!transaction) {
    throw new MonarchMutationError('Split update failed: no transaction returned', null, []);
  }
  return transaction;
}
