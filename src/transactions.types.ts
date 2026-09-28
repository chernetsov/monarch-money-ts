import { z } from 'zod';
import { CategorySummarySchema, CATEGORY_SUMMARY_FIELDS } from './categories.types.js';
import { AccountSummarySchema, ACCOUNT_SUMMARY_FIELDS } from './accounts.types.js';
import {
  MerchantSchema,
  MERCHANT_FIELDS,
  TagSchema,
  TAG_FIELDS,
  GoalSummarySchema,
  GOAL_SUMMARY_FIELDS,
  AttachmentSummarySchema,
  ATTACHMENT_SUMMARY_FIELDS,
  UserSummarySchema,
  USER_SUMMARY_FIELDS,
  MutationErrorSchema,
} from './common.types.js';
import { TransactionRuleSummarySchema } from './rules.types.js';

// ---------------- Transaction ----------------

/**
 * Savings goal event embedded in transaction responses.
 */
export const SavingsGoalEventSchema = z
  .object({
    id: z.string(),
    goal: GoalSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();
export type SavingsGoalEvent = z.infer<typeof SavingsGoalEventSchema>;

export const SAVINGS_GOAL_EVENT_FIELDS = `
  id
  goal {
    ${GOAL_SUMMARY_FIELDS}
  }
  __typename
`;

export const TransactionSchema = z
  .object({
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
    reviewedAt: z.string().nullable(), // ISO 8601 timestamp
    reviewedByUser: UserSummarySchema.nullable(),
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
    // Additional fields from detailed transaction view (getTransaction query)
    originalDate: z.string().optional(), // YYYY-MM-DD format
    hasSplitTransactions: z.boolean().optional(),
    isManual: z.boolean().optional(),
    updatedByRetailSync: z.boolean().optional(),
    splitTransactions: z.array(z.unknown()).optional(), // Array of split transaction references
    originalTransaction: z.unknown().optional(), // Original transaction reference if this is a correction
    needsReviewByUser: UserSummarySchema.nullable().optional(),
    ownershipOverriddenAt: z.string().nullable().optional(), // ISO 8601 timestamp
    __typename: z.string().optional(),
  })
  .strict();
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
  reviewedAt
  reviewedByUser {
    ${USER_SUMMARY_FIELDS}
  }
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

export const AllTransactionsSchema = z
  .object({
    totalCount: z.number(),
    totalSelectableCount: z.number(),
    results: z.array(TransactionSchema),
    __typename: z.string().optional(),
  })
  .strict();
export type AllTransactions = z.infer<typeof AllTransactionsSchema>;

// Re-export for backwards compatibility
export { TransactionRuleSummarySchema, type TransactionRuleSummary } from './rules.types.js';

export const GetTransactionsResponseSchema = z
  .object({
    allTransactions: AllTransactionsSchema,
    transactionRules: z.array(TransactionRuleSummarySchema),
  })
  .strict();
export type GetTransactionsResponse = z.infer<typeof GetTransactionsResponseSchema>;

// ---------------- Input Types ----------------

/**
 * Filters for transactions query (aligns with TransactionFilterInput in GraphQL).
 * All fields are optional to allow flexible filtering.
 */
export const TransactionFiltersInputSchema = z
  .object({
    search: z.string().optional(),
    accountIds: z.array(z.string()).optional(),
    categoryIds: z.array(z.string()).optional(),
    merchantIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
    goalIds: z.array(z.string()).optional(),
    startDate: z.string().optional(), // YYYY-MM-DD
    endDate: z.string().optional(), // YYYY-MM-DD
    /** Compared against the absolute amount, so debits and credits match alike. */
    amount: z.number().optional(),
    /** Defaults to "eq". Monarch only supports inclusive bounds, so "gt"/"lt" behave like "gte"/"lte". */
    amountOperator: z.enum(['lt', 'lte', 'eq', 'gte', 'gt']).optional(),
    isPending: z.boolean().optional(), // Note: filter uses isPending, but Transaction type has pending field
    hideFromReports: z.boolean().optional(),
    needsReview: z.boolean().optional(),
    isRecurring: z.boolean().optional(),
    isSplitTransaction: z.boolean().optional(),
    transactionVisibility: z.string().optional(), // "non_hidden_transactions_only" | "hidden_transactions_only" | "all_transactions"
  })
  .catchall(z.unknown());

export type TransactionFiltersInput = z.infer<typeof TransactionFiltersInputSchema>;

/**
 * Options for getTransactions function
 */
export const GetTransactionsOptionsSchema = z
  .object({
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().positive().optional(),
    orderBy: z.string().optional(), // "date" | "amount" | etc.
    filters: TransactionFiltersInputSchema.optional(),
  })
  .strict();

export type GetTransactionsOptions = z.infer<typeof GetTransactionsOptionsSchema>;

// ---------------- Get Single Transaction Response ----------------

/**
 * Response from getTransaction query.
 * Returns a single transaction by ID along with household user information.
 */
export const GetTransactionResponseSchema = z
  .object({
    getTransaction: TransactionSchema.nullable(),
    myHousehold: z
      .object({
        id: z.string(),
        users: z.array(UserSummarySchema),
        __typename: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type GetTransactionResponse = z.infer<typeof GetTransactionResponseSchema>;

/**
 * Input options for fetching a single transaction.
 */
export const GetTransactionOptionsSchema = z
  .object({
    /** Transaction ID to fetch */
    id: z.string().min(1),
    /** Whether to redirect posted transactions (optional) */
    redirectPosted: z.boolean().optional(),
  })
  .strict();

export type GetTransactionOptions = z.infer<typeof GetTransactionOptionsSchema>;

// ---------------- Update Transaction Types ----------------

/**
 * Generic input for updating a transaction.
 * All fields except id are optional - only provide the fields you want to update.
 */
export const UpdateTransactionInputSchema = z
  .object({
    /** Transaction ID to update */
    id: z.string().min(1),
    /** Category ID to assign */
    category: z.string().optional(),
    /** Whether this is a recommended category (used with category updates) */
    isRecommendedCategory: z.boolean().optional(),
    /** Mark transaction as reviewed (true) or needing review (false) */
    reviewed: z.boolean().optional(),
    /** Mark transaction as needing review */
    needsReview: z.boolean().optional(),
    /** Transaction notes */
    notes: z.string().optional(),
    /** Merchant ID */
    merchant: z.string().optional(),
    /** Hide from reports */
    hideFromReports: z.boolean().optional(),
    /** Tag IDs to assign */
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionInputSchema>;

/**
 * Response schema for updateTransaction mutation.
 * Note: transaction is nullable - on error, it will be null and errors will be populated.
 */
export const UpdateTransactionResponseSchema = z
  .object({
    updateTransaction: z
      .object({
        transaction: TransactionSchema.nullable(),
        errors: MutationErrorSchema.nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type UpdateTransactionResponse = z.infer<typeof UpdateTransactionResponseSchema>;

// ---------------- Transaction Splits ----------------

/** Minimal `{ id, name }` reference used in split responses. */
const SplitEntityRefSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    __typename: z.string().optional(),
  })
  .strict();

const SPLIT_ENTITY_REF_FIELDS = `
  id
  name
  __typename
`;

export const TransactionSplitSchema = z
  .object({
    id: z.string(),
    merchant: SplitEntityRefSchema.nullable(),
    category: SplitEntityRefSchema.nullable(),
    amount: z.number(),
    notes: z.string().nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type TransactionSplit = z.infer<typeof TransactionSplitSchema>;

export const TRANSACTION_SPLIT_FIELDS = `
  id
  merchant {
    ${SPLIT_ENTITY_REF_FIELDS}
  }
  category {
    ${SPLIT_ENTITY_REF_FIELDS}
  }
  amount
  notes
  __typename
`;

/** Parent transaction with its split children. */
export const TransactionSplitsSchema = z
  .object({
    id: z.string(),
    amount: z.number(),
    category: SplitEntityRefSchema.nullable(),
    merchant: SplitEntityRefSchema.nullable(),
    splitTransactions: z.array(TransactionSplitSchema),
    __typename: z.string().optional(),
  })
  .strict();
export type TransactionSplits = z.infer<typeof TransactionSplitsSchema>;

export const TRANSACTION_SPLITS_FIELDS = `
  id
  amount
  category {
    ${SPLIT_ENTITY_REF_FIELDS}
  }
  merchant {
    ${SPLIT_ENTITY_REF_FIELDS}
  }
  splitTransactions {
    ${TRANSACTION_SPLIT_FIELDS}
  }
  __typename
`;

export const GetTransactionSplitsResponseSchema = z
  .object({
    getTransaction: TransactionSplitsSchema.nullable(),
  })
  .strict();
export type GetTransactionSplitsResponse = z.infer<typeof GetTransactionSplitsResponseSchema>;

export const GetTransactionSplitsInputSchema = z
  .object({
    /** Parent transaction ID */
    id: z.string().min(1),
  })
  .strict();
export type GetTransactionSplitsInput = z.infer<typeof GetTransactionSplitsInputSchema>;

/**
 * One split in an update request. Known fields are documented; additional
 * `TransactionSplitInput` fields are passed through unchanged.
 */
export const TransactionSplitInputSchema = z
  .object({
    /** Split amount; all split amounts must sum to the parent transaction amount */
    amount: z.number(),
    merchantName: z.string().optional(),
    categoryId: z.string().optional(),
  })
  .catchall(z.unknown());
export type TransactionSplitInput = z.infer<typeof TransactionSplitInputSchema>;

export const UpdateTransactionSplitsInputSchema = z
  .object({
    /** Parent transaction ID */
    transactionId: z.string().min(1),
    /** Replaces all existing splits. An empty array removes all splits. */
    splitData: z.array(TransactionSplitInputSchema),
  })
  .strict();
export type UpdateTransactionSplitsInput = z.infer<typeof UpdateTransactionSplitsInputSchema>;

export const UpdatedTransactionSplitsSchema = z
  .object({
    id: z.string(),
    hasSplitTransactions: z.boolean(),
    splitTransactions: z.array(TransactionSplitSchema),
    __typename: z.string().optional(),
  })
  .strict();
export type UpdatedTransactionSplits = z.infer<typeof UpdatedTransactionSplitsSchema>;

export const UpdateTransactionSplitsResponseSchema = z
  .object({
    updateTransactionSplit: z
      .object({
        errors: MutationErrorSchema.nullable(),
        transaction: UpdatedTransactionSplitsSchema.nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type UpdateTransactionSplitsResponse = z.infer<typeof UpdateTransactionSplitsResponseSchema>;
