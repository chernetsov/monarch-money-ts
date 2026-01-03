import { z } from 'zod';

// ---------------- Category Group ----------------

export const BudgetCategoryGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  type: z.string(),
  __typename: z.string().optional(),
}).strict();
export type BudgetCategoryGroup = z.infer<typeof BudgetCategoryGroupSchema>;

/**
 * Lightweight category group summary embedded in categories.
 * For full category group details (order, color, budgetVariability), use getBudgetCategoryGroups().
 */
export const CategoryGroupSummarySchema = z.object({
  id: z.string(),
  type: z.string(), // "expense" | "income" | "transfer"
  name: z.string(),
  __typename: z.string().optional(),
}).strict();
export type CategoryGroupSummary = z.infer<typeof CategoryGroupSummarySchema>;

export const CATEGORY_GROUP_SUMMARY_FIELDS = `
  id
  type
  name
  __typename
`;

export const BudgetCategoryGroupWithBudgetingSchema = BudgetCategoryGroupSchema.extend({
  color: z.string().nullable(),
  groupLevelBudgetingEnabled: z.boolean(),
  budgetVariability: z.string().nullable(),
  rolloverPeriod: z.object({
    id: z.string(),
    startMonth: z.string().nullable(),
    endMonth: z.string().nullable(),
    startingBalance: z.number(),
    __typename: z.string().optional(),
  }).strict().nullable(),
});
export type BudgetCategoryGroupWithBudgeting = z.infer<typeof BudgetCategoryGroupWithBudgetingSchema>;

export const BudgetCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  icon: z.string(),
  isSystemCategory: z.boolean(),
  systemCategory: z.string().nullable(),
  isDisabled: z.boolean(),
  group: CategoryGroupSummarySchema,
  __typename: z.string().optional(),
}).strict();
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

/**
 * Lightweight category summary embedded in transactions.
 * For full category details (budgetVariability, rollover, etc.), use getBudgetCategory(id).
 */
export const CategorySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  group: CategoryGroupSummarySchema,
  __typename: z.string().optional(),
}).strict();
export type CategorySummary = z.infer<typeof CategorySummarySchema>;

export const CATEGORY_SUMMARY_FIELDS = `
  id
  name
  icon
  group {
    ${CATEGORY_GROUP_SUMMARY_FIELDS}
  }
  __typename
`;

export const ManageCategoryGroupsResponseSchema = z.object({
  categoryGroups: z.array(BudgetCategoryGroupSchema),
  categories: z.array(BudgetCategorySchema),
}).strict();
export type ManageCategoryGroupsResponse = z.infer<typeof ManageCategoryGroupsResponseSchema>;

export const BudgetCategoryDetailGroupSchema = z.object({
  id: z.string(),
  type: z.string(),
  groupLevelBudgetingEnabled: z.boolean(),
  __typename: z.string().optional(),
}).strict();
export type BudgetCategoryDetailGroup = z.infer<typeof BudgetCategoryDetailGroupSchema>;

export const BudgetCategoryRolloverPeriodSchema = z.object({
  id: z.string(),
  startMonth: z.string(),
  startingBalance: z.number(),
  type: z.string(),
  frequency: z.string(),
  targetAmount: z.number().nullable(),
  __typename: z.string().optional(),
}).strict();
export type BudgetCategoryRolloverPeriod = z.infer<typeof BudgetCategoryRolloverPeriodSchema>;

export const BudgetCategoryDetailSchema = z.object({
  id: z.string(),
  order: z.number(),
  name: z.string(),
  icon: z.string(),
  systemCategory: z.string().nullable(),
  systemCategoryDisplayName: z.string().nullable(),
  budgetVariability: z.string().nullable(),
  excludeFromBudget: z.boolean(),
  isSystemCategory: z.boolean(),
  isDisabled: z.boolean(),
  group: BudgetCategoryDetailGroupSchema,
  rolloverPeriod: BudgetCategoryRolloverPeriodSchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type BudgetCategoryDetail = z.infer<typeof BudgetCategoryDetailSchema>;

export const GetBudgetCategoryResponseSchema = z.object({
  category: BudgetCategoryDetailSchema,
}).strict();
export type GetBudgetCategoryResponse = z.infer<typeof GetBudgetCategoryResponseSchema>;

export const GetBudgetCategoryGroupsResponseSchema = z.object({
  categoryGroups: z.array(BudgetCategoryGroupWithBudgetingSchema),
}).strict();
export type GetBudgetCategoryGroupsResponse = z.infer<typeof GetBudgetCategoryGroupsResponseSchema>;

