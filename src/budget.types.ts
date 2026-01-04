import { z } from "zod";

// ==================== Enums ====================

export const BudgetVariabilitySchema = z.enum(["fixed", "flexible"]);
export type BudgetVariability = z.infer<typeof BudgetVariabilitySchema>;

export const RolloverTypeSchema = z.enum(["monthly"]);
export type RolloverType = z.infer<typeof RolloverTypeSchema>;

export const BudgetSystemSchema = z.enum(["groups_and_categories"]);
export type BudgetSystem = z.infer<typeof BudgetSystemSchema>;

export const CategoryGroupTypeSchema = z.enum(["income", "expense", "transfer"]);
export type CategoryGroupType = z.infer<typeof CategoryGroupTypeSchema>;

// ==================== Budget Rollover Period ====================

export const BudgetRolloverPeriodSchema = z
  .object({
    id: z.string(),
    startMonth: z.string(),
    endMonth: z.string().nullable(),
    startingBalance: z.number(),
    targetAmount: z.number().nullable(),
    frequency: RolloverTypeSchema.nullable(),
    type: RolloverTypeSchema,
    __typename: z.literal("BudgetRolloverPeriod").optional(),
  })
  .strict();

export type BudgetRolloverPeriod = z.infer<typeof BudgetRolloverPeriodSchema>;

export const BUDGET_ROLLOVER_PERIOD_FIELDS = `
  id
  startMonth
  endMonth
  startingBalance
  targetAmount
  frequency
  type
`;

// ==================== Budget Report Category (nested in CategoryGroup) ====================

export const BudgetReportCategoryGroupRefSchema = z
  .object({
    id: z.string(),
    type: CategoryGroupTypeSchema,
    budgetVariability: BudgetVariabilitySchema.nullable(),
    groupLevelBudgetingEnabled: z.boolean(),
    __typename: z.literal("CategoryGroup").optional(),
  })
  .strict();

export type BudgetReportCategoryGroupRef = z.infer<typeof BudgetReportCategoryGroupRefSchema>;

export const BudgetReportCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    order: z.number(),
    budgetVariability: BudgetVariabilitySchema.nullable(),
    excludeFromBudget: z.boolean(),
    isSystemCategory: z.boolean(),
    updatedAt: z.string(),
    group: BudgetReportCategoryGroupRefSchema,
    rolloverPeriod: BudgetRolloverPeriodSchema.nullable(),
    __typename: z.literal("Category").optional(),
  })
  .strict();

export type BudgetReportCategory = z.infer<typeof BudgetReportCategorySchema>;

export const BUDGET_REPORT_CATEGORY_FIELDS = `
  id
  name
  icon
  order
  budgetVariability
  excludeFromBudget
  isSystemCategory
  updatedAt
  group {
    id
    type
    budgetVariability
    groupLevelBudgetingEnabled
  }
  rolloverPeriod {
    ${BUDGET_ROLLOVER_PERIOD_FIELDS}
  }
`;

// ==================== Budget Report Category Group ====================

export const BudgetReportCategoryGroupSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
    type: CategoryGroupTypeSchema,
    budgetVariability: BudgetVariabilitySchema.nullable(),
    updatedAt: z.string(),
    groupLevelBudgetingEnabled: z.boolean(),
    categories: z.array(BudgetReportCategorySchema),
    rolloverPeriod: BudgetRolloverPeriodSchema.nullable(),
    __typename: z.literal("CategoryGroup").optional(),
  })
  .strict();

export type BudgetReportCategoryGroup = z.infer<typeof BudgetReportCategoryGroupSchema>;

export const BUDGET_REPORT_CATEGORY_GROUP_FIELDS = `
  id
  name
  order
  type
  budgetVariability
  updatedAt
  groupLevelBudgetingEnabled
  categories {
    ${BUDGET_REPORT_CATEGORY_FIELDS}
  }
  rolloverPeriod {
    id
    type
    startMonth
    endMonth
    startingBalance
    frequency
    targetAmount
  }
`;

// ==================== Budget Monthly Amounts ====================

export const BudgetMonthlyAmountsSchema = z
  .object({
    month: z.string(),
    plannedCashFlowAmount: z.number(),
    plannedSetAsideAmount: z.number().nullable(),
    actualAmount: z.number(),
    remainingAmount: z.number(),
    previousMonthRolloverAmount: z.number().nullable(),
    rolloverType: RolloverTypeSchema.nullable(),
    cumulativeActualAmount: z.number(),
    rolloverTargetAmount: z.number().nullable(),
    __typename: z.literal("BudgetMonthlyAmounts").optional(),
  })
  .strict();

export type BudgetMonthlyAmounts = z.infer<typeof BudgetMonthlyAmountsSchema>;

export const BUDGET_MONTHLY_AMOUNTS_FIELDS = `
  month
  plannedCashFlowAmount
  plannedSetAsideAmount
  actualAmount
  remainingAmount
  previousMonthRolloverAmount
  rolloverType
  cumulativeActualAmount
  rolloverTargetAmount
`;

// ==================== Budget Category Monthly Amounts ====================

export const CategoryRefSchema = z
  .object({
    id: z.string(),
    __typename: z.literal("Category").optional(),
  })
  .strict();

export type CategoryRef = z.infer<typeof CategoryRefSchema>;

export const BudgetCategoryMonthlyAmountsSchema = z
  .object({
    category: CategoryRefSchema,
    monthlyAmounts: z.array(BudgetMonthlyAmountsSchema),
    __typename: z.literal("BudgetCategoryMonthlyAmounts").optional(),
  })
  .strict();

export type BudgetCategoryMonthlyAmounts = z.infer<
  typeof BudgetCategoryMonthlyAmountsSchema
>;

export const BUDGET_CATEGORY_MONTHLY_AMOUNTS_FIELDS = `
  category {
    id
  }
  monthlyAmounts {
    ${BUDGET_MONTHLY_AMOUNTS_FIELDS}
  }
`;

// ==================== Budget Category Group Monthly Amounts ====================

export const CategoryGroupRefSchema = z
  .object({
    id: z.string(),
    __typename: z.literal("CategoryGroup").optional(),
  })
  .strict();

export type CategoryGroupRef = z.infer<typeof CategoryGroupRefSchema>;

export const BudgetCategoryGroupMonthlyAmountsSchema = z
  .object({
    categoryGroup: CategoryGroupRefSchema,
    monthlyAmounts: z.array(BudgetMonthlyAmountsSchema),
    __typename: z.literal("BudgetCategoryGroupMonthlyAmounts").optional(),
  })
  .strict();

export type BudgetCategoryGroupMonthlyAmounts = z.infer<
  typeof BudgetCategoryGroupMonthlyAmountsSchema
>;

export const BUDGET_CATEGORY_GROUP_MONTHLY_AMOUNTS_FIELDS = `
  categoryGroup {
    id
  }
  monthlyAmounts {
    ${BUDGET_MONTHLY_AMOUNTS_FIELDS}
  }
`;

// ==================== Budget Flex Monthly Amounts ====================

export const BudgetFlexMonthlyAmountsSchema = z
  .object({
    budgetVariability: BudgetVariabilitySchema,
    monthlyAmounts: z.array(BudgetMonthlyAmountsSchema),
    __typename: z.literal("BudgetFlexMonthlyAmounts").optional(),
  })
  .strict();

export type BudgetFlexMonthlyAmounts = z.infer<typeof BudgetFlexMonthlyAmountsSchema>;

export const BUDGET_FLEX_MONTHLY_AMOUNTS_FIELDS = `
  budgetVariability
  monthlyAmounts {
    ${BUDGET_MONTHLY_AMOUNTS_FIELDS}
  }
`;

// ==================== Budget Totals ====================

export const BudgetTotalsSchema = z
  .object({
    actualAmount: z.number(),
    plannedAmount: z.number(),
    previousMonthRolloverAmount: z.number(),
    remainingAmount: z.number(),
    __typename: z.literal("BudgetTotals").optional(),
  })
  .strict();

export type BudgetTotals = z.infer<typeof BudgetTotalsSchema>;

export const BUDGET_TOTALS_FIELDS = `
  actualAmount
  plannedAmount
  previousMonthRolloverAmount
  remainingAmount
`;

// ==================== Budget Month Totals ====================

export const BudgetMonthTotalsSchema = z
  .object({
    month: z.string(),
    totalIncome: BudgetTotalsSchema,
    totalExpenses: BudgetTotalsSchema,
    totalFixedExpenses: BudgetTotalsSchema,
    totalNonMonthlyExpenses: BudgetTotalsSchema,
    totalFlexibleExpenses: BudgetTotalsSchema,
    __typename: z.literal("BudgetMonthTotals").optional(),
  })
  .strict();

export type BudgetMonthTotals = z.infer<typeof BudgetMonthTotalsSchema>;

export const BUDGET_MONTH_TOTALS_FIELDS = `
  month
  totalIncome {
    ${BUDGET_TOTALS_FIELDS}
  }
  totalExpenses {
    ${BUDGET_TOTALS_FIELDS}
  }
  totalFixedExpenses {
    ${BUDGET_TOTALS_FIELDS}
  }
  totalNonMonthlyExpenses {
    ${BUDGET_TOTALS_FIELDS}
  }
  totalFlexibleExpenses {
    ${BUDGET_TOTALS_FIELDS}
  }
`;

// ==================== Budget Data ====================

export const BudgetDataSchema = z
  .object({
    monthlyAmountsByCategory: z.array(BudgetCategoryMonthlyAmountsSchema),
    monthlyAmountsByCategoryGroup: z.array(BudgetCategoryGroupMonthlyAmountsSchema),
    monthlyAmountsForFlexExpense: BudgetFlexMonthlyAmountsSchema,
    totalsByMonth: z.array(BudgetMonthTotalsSchema),
    __typename: z.literal("BudgetData").optional(),
  })
  .strict();

export type BudgetData = z.infer<typeof BudgetDataSchema>;

export const BUDGET_DATA_FIELDS = `
  monthlyAmountsByCategory {
    ${BUDGET_CATEGORY_MONTHLY_AMOUNTS_FIELDS}
  }
  monthlyAmountsByCategoryGroup {
    ${BUDGET_CATEGORY_GROUP_MONTHLY_AMOUNTS_FIELDS}
  }
  monthlyAmountsForFlexExpense {
    ${BUDGET_FLEX_MONTHLY_AMOUNTS_FIELDS}
  }
  totalsByMonth {
    ${BUDGET_MONTH_TOTALS_FIELDS}
  }
`;

// ==================== Goals V2 ====================

export const GoalV2MonthlyContributionSummarySchema = z
  .object({
    month: z.string(),
    sum: z.number(),
    __typename: z.literal("GoalV2MonthlyContributionSummary").optional(),
  })
  .strict();

export type GoalV2MonthlyContributionSummary = z.infer<
  typeof GoalV2MonthlyContributionSummarySchema
>;

export const GoalV2PlannedContributionSchema = z
  .object({
    id: z.string(),
    month: z.string(),
    amount: z.number(),
    __typename: z.literal("GoalV2PlannedContribution").optional(),
  })
  .strict();

export type GoalV2PlannedContribution = z.infer<typeof GoalV2PlannedContributionSchema>;

export const GoalV2Schema = z
  .object({
    id: z.string(),
    name: z.string(),
    archivedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    priority: z.number(),
    imageStorageProvider: z.string(),
    imageStorageProviderId: z.string(),
    plannedContributions: z.array(GoalV2PlannedContributionSchema),
    monthlyContributionSummaries: z.array(GoalV2MonthlyContributionSummarySchema),
    __typename: z.literal("GoalV2").optional(),
  })
  .strict();

export type GoalV2 = z.infer<typeof GoalV2Schema>;

export const GOAL_V2_FIELDS = `
  id
  name
  archivedAt
  completedAt
  priority
  imageStorageProvider
  imageStorageProviderId
  plannedContributions(startMonth: $startDate, endMonth: $endDate) {
    id
    month
    amount
  }
  monthlyContributionSummaries(startMonth: $startDate, endMonth: $endDate) {
    month
    sum
  }
`;

// ==================== Savings Goal Monthly Budget Amounts ====================

export const SavingsGoalSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string(),
    archivedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    priority: z.number(),
    targetDate: z.string().nullable(),
    imageStorageProvider: z.string(),
    imageStorageProviderId: z.string(),
    __typename: z.literal("SavingsGoal").optional(),
  })
  .strict();

export type SavingsGoal = z.infer<typeof SavingsGoalSchema>;

export const SavingsGoalMonthlyAmountSchema = z
  .object({
    id: z.string(),
    month: z.string(),
    plannedAmount: z.number(),
    actualAmount: z.number(),
    remainingAmount: z.number(),
    __typename: z.literal("SavingsGoalMonthlyAmount").optional(),
  })
  .strict();

export type SavingsGoalMonthlyAmount = z.infer<typeof SavingsGoalMonthlyAmountSchema>;

export const SavingsGoalMonthlyBudgetAmountsSchema = z
  .object({
    id: z.string(),
    savingsGoal: SavingsGoalSchema,
    monthlyAmounts: z.array(SavingsGoalMonthlyAmountSchema),
    __typename: z.literal("SavingsGoalMonthlyBudgetAmounts").optional(),
  })
  .strict();

export type SavingsGoalMonthlyBudgetAmounts = z.infer<
  typeof SavingsGoalMonthlyBudgetAmountsSchema
>;

export const SAVINGS_GOAL_MONTHLY_BUDGET_AMOUNTS_FIELDS = `
  id
  savingsGoal {
    id
    name
    type
    status
    archivedAt
    completedAt
    priority
    targetDate
    imageStorageProvider
    imageStorageProviderId
  }
  monthlyAmounts {
    id
    month
    plannedAmount
    actualAmount
    remainingAmount
  }
`;

// ==================== Budget Report (Joint Planning Data) ====================

export const BudgetReportSchema = z
  .object({
    budgetSystem: BudgetSystemSchema,
    budgetData: BudgetDataSchema,
    categoryGroups: z.array(BudgetReportCategoryGroupSchema),
    goalsV2: z.array(GoalV2Schema),
    savingsGoalMonthlyBudgetAmounts: z.array(SavingsGoalMonthlyBudgetAmountsSchema),
  })
  .strict();

export type BudgetReport = z.infer<typeof BudgetReportSchema>;

// ==================== Budget Status ====================

export const BudgetStatusSchema = z
  .object({
    hasBudget: z.boolean(),
    hasTransactions: z.boolean(),
    willCreateBudgetFromEmptyDefaultCategories: z.boolean(),
    __typename: z.literal("BudgetStatus").optional(),
  })
  .strict();

export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;

export const BUDGET_STATUS_FIELDS = `
  hasBudget
  hasTransactions
  willCreateBudgetFromEmptyDefaultCategories
`;

// ==================== Budget Settings ====================

export const FlexExpenseRolloverPeriodSchema = z
  .object({
    id: z.string(),
    startMonth: z.string(),
    startingBalance: z.number(),
    __typename: z.literal("FlexExpenseRolloverPeriod").optional(),
  })
  .strict();

export type FlexExpenseRolloverPeriod = z.infer<typeof FlexExpenseRolloverPeriodSchema>;

export const BudgetSettingsSchema = z
  .object({
    budgetSystem: BudgetSystemSchema,
    budgetApplyToFutureMonthsDefault: z.boolean().nullable(),
    flexExpenseRolloverPeriod: FlexExpenseRolloverPeriodSchema.nullable(),
  })
  .strict();

export type BudgetSettings = z.infer<typeof BudgetSettingsSchema>;

// ==================== Input Types ====================

/**
 * Input parameters for fetching budget report data
 */
export interface BudgetReportInput {
  /** Start month in YYYY-MM-DD format (e.g., "2025-12-01") */
  startDate: string;
  /** End month in YYYY-MM-DD format (e.g., "2026-03-01") */
  endDate: string;
}

