import { z } from 'zod';
import {
  CategorySchema,
  type Category,
  MerchantSchema,
  type Merchant,
  TagSchema,
  type Tag,
  GoalSchema,
  type Goal,
  AttachmentSchema,
  type Attachment,
} from './common-types.js';

// ---------------- Transaction-specific Sub-objects ----------------

export const TransactionAccountSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  icon: z.string(),
  logoUrl: z.string(),
  __typename: z.string().optional(),
}).strict();
export type TransactionAccount = z.infer<typeof TransactionAccountSchema>;

// ---------------- Transaction ----------------

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
  attachments: z.array(AttachmentSchema),
  goal: GoalSchema.nullable(),
  category: CategorySchema,
  merchant: MerchantSchema,
  tags: z.array(TagSchema),
  account: TransactionAccountSchema,
  __typename: z.string().optional(),
}).strict();
export type Transaction = z.infer<typeof TransactionSchema>;

// ---------------- Transaction List Response ----------------

export const AllTransactionsSchema = z.object({
  totalCount: z.number(),
  totalSelectableCount: z.number(),
  results: z.array(TransactionSchema),
  __typename: z.string().optional(),
}).strict();
export type AllTransactions = z.infer<typeof AllTransactionsSchema>;

export const TransactionRuleSchema = z.object({
  id: z.string(),
  __typename: z.string().optional(),
}).strict();
export type TransactionRule = z.infer<typeof TransactionRuleSchema>;

export const GetTransactionsResponseSchema = z.object({
  allTransactions: AllTransactionsSchema,
  transactionRules: z.array(TransactionRuleSchema),
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

