import { z } from 'zod';
import {
  CategorySummarySchema,
  CATEGORY_SUMMARY_FIELDS,
  type CategorySummary,
} from './categories.types.js';
import {
  AccountSummarySchema,
  ACCOUNT_SUMMARY_FIELDS,
  type AccountSummary,
} from './accounts.types.js';
import {
  MerchantSchema,
  MERCHANT_FIELDS,
  type Merchant,
  TagSchema,
  TAG_FIELDS,
  type Tag,
  GoalSummarySchema,
  GOAL_SUMMARY_FIELDS,
  type GoalSummary,
  AttachmentSummarySchema,
  ATTACHMENT_SUMMARY_FIELDS,
  type AttachmentSummary,
  UserSummarySchema,
  USER_SUMMARY_FIELDS,
  type UserSummary,
  MutationErrorSchema,
  type MutationError,
} from './common.types.js';
import {
  TransactionRuleSummarySchema,
  TRANSACTION_RULE_SUMMARY_FIELDS,
  type TransactionRuleSummary,
} from './rules.types.js';

// ---------------- Transaction ----------------

/**
 * Savings goal event embedded in transaction responses.
 */
export const SavingsGoalEventSchema = z.object({
  id: z.string(),
  goal: GoalSummarySchema,
  __typename: z.string().optional(),
}).strict();
export type SavingsGoalEvent = z.infer<typeof SavingsGoalEventSchema>;

export const SAVINGS_GOAL_EVENT_FIELDS = `
  id
  goal {
    ${GOAL_SUMMARY_FIELDS}
  }
  __typename
`;

export const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  pending: z.boolean(),
  date: z.string(), // YYYY-MM-DD format
  hideFromReports: z.boolean(),
  hiddenByAccount: z.boolean(),
  plaidName: z.string(),
  notes: z.string().nullable(),
  isRecurring: z.boolean(),
  reviewStatus: z.string().nullable(),
  needsReview: z.boolean(),
  isSplitTransaction: z.boolean(),
  dataProviderDescription: z.string(),
  attachments: z.array(AttachmentSummarySchema),
  goal: GoalSummarySchema.nullable(),
  category: CategorySummarySchema,
  merchant: MerchantSchema,
  tags: z.array(TagSchema),
  account: AccountSummarySchema,
  savingsGoalEvent: SavingsGoalEventSchema.nullable(),
  ownedByUser: UserSummarySchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type Transaction = z.infer<typeof TransactionSchema>;

export const TRANSACTION_FIELDS = `
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
    ${ATTACHMENT_SUMMARY_FIELDS}
  }
  goal {
    ${GOAL_SUMMARY_FIELDS}
  }
  category {
    ${CATEGORY_SUMMARY_FIELDS}
  }
  merchant {
    ${MERCHANT_FIELDS}
  }
  tags {
    ${TAG_FIELDS}
  }
  account {
    ${ACCOUNT_SUMMARY_FIELDS}
  }
  savingsGoalEvent {
    ${SAVINGS_GOAL_EVENT_FIELDS}
  }
  ownedByUser {
    ${USER_SUMMARY_FIELDS}
  }
  __typename
`;

// ---------------- Transaction List Response ----------------

export const AllTransactionsSchema = z.object({
  totalCount: z.number(),
  totalSelectableCount: z.number(),
  results: z.array(TransactionSchema),
  __typename: z.string().optional(),
}).strict();
export type AllTransactions = z.infer<typeof AllTransactionsSchema>;

// Re-export for backwards compatibility
export { TransactionRuleSummarySchema, type TransactionRuleSummary } from './rules.types.js';

export const GetTransactionsResponseSchema = z.object({
  allTransactions: AllTransactionsSchema,
  transactionRules: z.array(TransactionRuleSummarySchema),
}).strict();
export type GetTransactionsResponse = z.infer<typeof GetTransactionsResponseSchema>;

// ---------------- Input Types ----------------

/**
 * Filters for transactions query (aligns with TransactionFilterInput in GraphQL).
 * All fields are optional to allow flexible filtering.
 */
export type TransactionFiltersInput = Partial<{
  search: string;
  accountIds: string[];
  categoryIds: string[];
  merchantIds: string[];
  tagIds: string[];
  goalIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  amount: number;
  amountOperator: string; // "lt" | "lte" | "eq" | "gte" | "gt"
  pending: boolean;
  hideFromReports: boolean;
  needsReview: boolean;
  isRecurring: boolean;
  isSplitTransaction: boolean;
  transactionVisibility: string; // "non_hidden_transactions_only" | "hidden_transactions_only" | "all_transactions"
}> & Record<string, unknown>;

/**
 * Options for getTransactions function
 */
export interface GetTransactionsOptions {
  offset?: number;
  limit?: number;
  orderBy?: string; // "date" | "amount" | etc.
  filters?: TransactionFiltersInput;
}

// ---------------- Update Transaction Types ----------------

/**
 * Input for updating a transaction's category.
 */
export interface UpdateTransactionCategoryInput {
  /** Transaction ID to update */
  id: string;
  /** Category ID to assign */
  categoryId: string;
}

/**
 * Response schema for updateTransaction mutation.
 * Note: transaction is nullable - on error, it will be null and errors will be populated.
 */
export const UpdateTransactionResponseSchema = z.object({
  updateTransaction: z.object({
    transaction: TransactionSchema.nullable(),
    errors: MutationErrorSchema.nullable(),
    __typename: z.string().optional(),
  }).strict(),
}).strict();
export type UpdateTransactionResponse = z.infer<typeof UpdateTransactionResponseSchema>;

