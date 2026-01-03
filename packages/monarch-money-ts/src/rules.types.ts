import { z } from 'zod';
import {
  CategorySummarySchema,
  CATEGORY_SUMMARY_FIELDS,
} from './categories.types.js';
import {
  AccountSummarySchema,
  ACCOUNT_SUMMARY_FIELDS,
} from './accounts.types.js';
import {
  TagSchema,
  TAG_FIELDS,
  UserSummarySchema,
  USER_SUMMARY_FIELDS,
} from './common.types.js';

// ---------------- Rule Summary (embedded in transaction responses) ----------------

/**
 * Lightweight rule summary embedded in transaction list responses.
 * For full rule details, use getTransactionRules().
 */
export const TransactionRuleSummarySchema = z.object({
  id: z.string(),
  __typename: z.string().optional(),
}).strict();
export type TransactionRuleSummary = z.infer<typeof TransactionRuleSummarySchema>;

export const TRANSACTION_RULE_SUMMARY_FIELDS = `
  id
  __typename
`;

// ---------------- Criteria Schemas ----------------

export const MerchantCriterionSchema = z.object({
  operator: z.string(), // "contains" | "eq"
  value: z.string(),
  __typename: z.string().optional(),
}).strict();
export type MerchantCriterion = z.infer<typeof MerchantCriterionSchema>;

export const MERCHANT_CRITERION_FIELDS = `
  operator
  value
  __typename
`;

export const AmountCriteriaValueRangeSchema = z.object({
  lower: z.number(),
  upper: z.number(),
  __typename: z.string().optional(),
}).strict();
export type AmountCriteriaValueRange = z.infer<typeof AmountCriteriaValueRangeSchema>;

export const AmountCriteriaSchema = z.object({
  operator: z.string(), // "gt" | "lt" | "gte" | "lte" | "eq" | "between"
  isExpense: z.boolean(),
  value: z.number().nullable(),
  valueRange: AmountCriteriaValueRangeSchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type AmountCriteria = z.infer<typeof AmountCriteriaSchema>;

export const AMOUNT_CRITERIA_FIELDS = `
  operator
  isExpense
  value
  valueRange {
    lower
    upper
    __typename
  }
  __typename
`;

// ---------------- Rule Category Summary (simpler than full CategorySummary) ----------------

/**
 * Lightweight category summary embedded in rules.
 * Only includes id, name, and icon (no group).
 */
export const RuleCategorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  __typename: z.string().optional(),
}).strict();
export type RuleCategorySummary = z.infer<typeof RuleCategorySummarySchema>;

export const RULE_CATEGORY_SUMMARY_FIELDS = `
  id
  name
  icon
  __typename
`;

// ---------------- Rule Account Summary ----------------

/**
 * Lightweight account summary embedded in rules.
 */
export const RuleAccountSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  icon: z.string(),
  logoUrl: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();
export type RuleAccountSummary = z.infer<typeof RuleAccountSummarySchema>;

export const RULE_ACCOUNT_SUMMARY_FIELDS = `
  id
  displayName
  icon
  logoUrl
  __typename
`;

// ---------------- Rule Merchant Summary ----------------

/**
 * Lightweight merchant summary embedded in rules.
 */
export const RuleMerchantSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  __typename: z.string().optional(),
}).strict();
export type RuleMerchantSummary = z.infer<typeof RuleMerchantSummarySchema>;

export const RULE_MERCHANT_SUMMARY_FIELDS = `
  id
  name
  __typename
`;

// ---------------- Rule Goal Summary ----------------

/**
 * Lightweight goal summary embedded in rules.
 */
export const RuleGoalSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  imageStorageProvider: z.string().nullable(),
  imageStorageProviderId: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();
export type RuleGoalSummary = z.infer<typeof RuleGoalSummarySchema>;

export const RULE_GOAL_SUMMARY_FIELDS = `
  id
  name
  imageStorageProvider
  imageStorageProviderId
  __typename
`;

// ---------------- Rule Tag Summary ----------------

/**
 * Tag summary embedded in rules (includes id, name, color but not order).
 */
export const RuleTagSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  __typename: z.string().optional(),
}).strict();
export type RuleTagSummary = z.infer<typeof RuleTagSummarySchema>;

export const RULE_TAG_SUMMARY_FIELDS = `
  id
  name
  color
  __typename
`;

// ---------------- Rule User Summary ----------------

/**
 * User summary embedded in rules (same as common UserSummary).
 */
export const RuleUserSummarySchema = UserSummarySchema;
export type RuleUserSummary = z.infer<typeof RuleUserSummarySchema>;

export const RULE_USER_SUMMARY_FIELDS = USER_SUMMARY_FIELDS;

// ---------------- Split Transaction Action ----------------

export const SplitTransactionInfoSchema = z.object({
  categoryId: z.string().nullable(),
  merchantName: z.string().nullable(),
  amount: z.number().nullable(),
  goalId: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  hideFromReports: z.boolean().nullable(),
  reviewStatus: z.string().nullable(),
  needsReviewByUserId: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  ownerIsJoint: z.boolean().nullable(),
  __typename: z.string().optional(),
}).strict();
export type SplitTransactionInfo = z.infer<typeof SplitTransactionInfoSchema>;

export const SplitTransactionsActionSchema = z.object({
  amountType: z.string(),
  splitsInfo: z.array(SplitTransactionInfoSchema),
  __typename: z.string().optional(),
}).strict();
export type SplitTransactionsAction = z.infer<typeof SplitTransactionsActionSchema>;

export const SPLIT_TRANSACTIONS_ACTION_FIELDS = `
  amountType
  splitsInfo {
    categoryId
    merchantName
    amount
    goalId
    tags
    hideFromReports
    reviewStatus
    needsReviewByUserId
    ownerUserId
    ownerIsJoint
    __typename
  }
  __typename
`;

// ---------------- Full Transaction Rule ----------------

export const TransactionRuleSchema = z.object({
  id: z.string(),
  order: z.number(),
  merchantCriteriaUseOriginalStatement: z.boolean(),
  merchantCriteria: z.array(MerchantCriterionSchema),
  originalStatementCriteria: z.array(MerchantCriterionSchema).nullable(),
  merchantNameCriteria: z.array(MerchantCriterionSchema).nullable(),
  amountCriteria: AmountCriteriaSchema.nullable(),
  categoryIds: z.array(z.string()).nullable(),
  accountIds: z.array(z.string()).nullable(),
  categories: z.array(RuleCategorySummarySchema),
  accounts: z.array(RuleAccountSummarySchema),
  criteriaOwnerIsJoint: z.boolean(),
  criteriaOwnerUserIds: z.array(z.string()).nullable(),
  criteriaOwnerUsers: z.array(RuleUserSummarySchema).nullable(),
  // Actions
  setMerchantAction: RuleMerchantSummarySchema.nullable(),
  setCategoryAction: RuleCategorySummarySchema.nullable(),
  addTagsAction: z.array(RuleTagSummarySchema).nullable(),
  linkGoalAction: RuleGoalSummarySchema.nullable(),
  needsReviewByUserAction: z.object({
    id: z.string(),
    displayName: z.string().nullable(),
    __typename: z.string().optional(),
  }).strict().nullable(),
  unassignNeedsReviewByUserAction: z.boolean(),
  sendNotificationAction: z.boolean(),
  setHideFromReportsAction: z.boolean(),
  reviewStatusAction: z.string().nullable(),
  actionSetOwnerIsJoint: z.boolean(),
  actionSetOwner: RuleUserSummarySchema.nullable(),
  splitTransactionsAction: SplitTransactionsActionSchema.nullable(),
  // Metadata
  recentApplicationCount: z.number(),
  lastAppliedAt: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();
export type TransactionRule = z.infer<typeof TransactionRuleSchema>;

export const TRANSACTION_RULE_FIELDS = `
  id
  order
  merchantCriteriaUseOriginalStatement
  merchantCriteria {
    ${MERCHANT_CRITERION_FIELDS}
  }
  originalStatementCriteria {
    ${MERCHANT_CRITERION_FIELDS}
  }
  merchantNameCriteria {
    ${MERCHANT_CRITERION_FIELDS}
  }
  amountCriteria {
    ${AMOUNT_CRITERIA_FIELDS}
  }
  categoryIds
  accountIds
  categories {
    ${RULE_CATEGORY_SUMMARY_FIELDS}
  }
  accounts {
    ${RULE_ACCOUNT_SUMMARY_FIELDS}
  }
  criteriaOwnerIsJoint
  criteriaOwnerUserIds
  criteriaOwnerUsers {
    ${RULE_USER_SUMMARY_FIELDS}
  }
  setMerchantAction {
    ${RULE_MERCHANT_SUMMARY_FIELDS}
  }
  setCategoryAction {
    ${RULE_CATEGORY_SUMMARY_FIELDS}
  }
  addTagsAction {
    ${RULE_TAG_SUMMARY_FIELDS}
  }
  linkGoalAction {
    ${RULE_GOAL_SUMMARY_FIELDS}
  }
  needsReviewByUserAction {
    id
    displayName
    __typename
  }
  unassignNeedsReviewByUserAction
  sendNotificationAction
  setHideFromReportsAction
  reviewStatusAction
  actionSetOwnerIsJoint
  actionSetOwner {
    ${RULE_USER_SUMMARY_FIELDS}
  }
  splitTransactionsAction {
    ${SPLIT_TRANSACTIONS_ACTION_FIELDS}
  }
  recentApplicationCount
  lastAppliedAt
  __typename
`;

// ---------------- GetTransactionRules Response ----------------

export const GetTransactionRulesResponseSchema = z.object({
  transactionRules: z.array(TransactionRuleSchema),
}).strict();
export type GetTransactionRulesResponse = z.infer<typeof GetTransactionRulesResponseSchema>;

// ---------------- Preview Transaction Rule Input ----------------

/**
 * Input for previewing which transactions a rule would match.
 * Mirrors TransactionRulePreviewInput from the GraphQL schema.
 */
export type TransactionRulePreviewInput = {
  merchantCriteriaUseOriginalStatement?: boolean;
  merchantCriteria?: Array<{ operator: string; value: string }>;
  merchantNameCriteria?: Array<{ operator: string; value: string }>;
  originalStatementCriteria?: Array<{ operator: string; value: string }>;
  amountCriteria?: {
    operator: string;
    isExpense: boolean;
    value?: number | null;
    valueRange?: { lower: number; upper: number } | null;
  } | null;
  categoryIds?: string[];
  accountIds?: string[];
  criteriaOwnerIsJoint?: boolean;
  criteriaOwnerUserIds?: string[];
  // Actions
  setCategoryAction?: string;
  setMerchantAction?: string;
  addTagsAction?: string[];
  linkGoalAction?: string;
  needsReviewByUserAction?: string;
  unassignNeedsReviewByUserAction?: boolean;
  sendNotificationAction?: boolean;
  setHideFromReportsAction?: boolean;
  reviewStatusAction?: string;
  actionSetOwnerIsJoint?: boolean;
  actionSetOwner?: string;
  applyToExistingTransactions?: boolean;
};

// ---------------- Preview Transaction Rule Response ----------------

/**
 * A single matched transaction in the preview results.
 */
export const RulePreviewTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.number(),
  merchant: RuleMerchantSummarySchema,
  category: RuleCategorySummarySchema,
  ownedByUser: RuleUserSummarySchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type RulePreviewTransaction = z.infer<typeof RulePreviewTransactionSchema>;

export const RULE_PREVIEW_TRANSACTION_FIELDS = `
  id
  date
  amount
  merchant {
    ${RULE_MERCHANT_SUMMARY_FIELDS}
  }
  category {
    ${RULE_CATEGORY_SUMMARY_FIELDS}
  }
  ownedByUser {
    ${RULE_USER_SUMMARY_FIELDS}
  }
  __typename
`;

/**
 * A single preview result showing what changes would be applied to a transaction.
 */
export const RulePreviewResultSchema = z.object({
  newName: z.string().nullable(),
  newSplitTransactions: z.unknown().nullable(), // Complex nested structure
  newCategory: RuleCategorySummarySchema.nullable(),
  newOwnerIsJoint: z.boolean().nullable(),
  newOwnerUser: RuleUserSummarySchema.nullable(),
  newHideFromReports: z.boolean().nullable(),
  newTags: z.array(TagSchema).nullable(),
  newGoal: RuleGoalSummarySchema.nullable(),
  transaction: RulePreviewTransactionSchema,
  __typename: z.string().optional(),
}).strict();
export type RulePreviewResult = z.infer<typeof RulePreviewResultSchema>;

export const RULE_PREVIEW_RESULT_FIELDS = `
  newName
  newSplitTransactions
  newCategory {
    ${RULE_CATEGORY_SUMMARY_FIELDS}
  }
  newOwnerIsJoint
  newOwnerUser {
    ${RULE_USER_SUMMARY_FIELDS}
  }
  newHideFromReports
  newTags {
    ${TAG_FIELDS}
  }
  newGoal {
    ${RULE_GOAL_SUMMARY_FIELDS}
  }
  transaction {
    ${RULE_PREVIEW_TRANSACTION_FIELDS}
  }
  __typename
`;

export const TransactionRulePreviewSchema = z.object({
  totalCount: z.number(),
  results: z.array(RulePreviewResultSchema),
  __typename: z.string().optional(),
}).strict();
export type TransactionRulePreview = z.infer<typeof TransactionRulePreviewSchema>;

export const PreviewTransactionRuleResponseSchema = z.object({
  transactionRulePreview: TransactionRulePreviewSchema,
}).strict();
export type PreviewTransactionRuleResponse = z.infer<typeof PreviewTransactionRuleResponseSchema>;

/**
 * Options for previewTransactionRule function.
 */
export interface PreviewTransactionRuleOptions {
  offset?: number;
  limit?: number;
}

