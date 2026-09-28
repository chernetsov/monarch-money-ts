import { z } from 'zod';

// ---------------- Shared nested objects ----------------

export const RecurringMerchantFinancialInsightSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    description: z.string().nullable(),
    reasoning: z.string().nullable(),
    savingsEstimateLow: z.number().nullable(),
    capturedSavingsLow: z.number().nullable(),
    currentAnnualCost: z.number().nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringMerchantFinancialInsight = z.infer<
  typeof RecurringMerchantFinancialInsightSchema
>;

export const RecurringMerchantSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    logoUrl: z.string().nullable().optional(),
    financialInsights: z.array(RecurringMerchantFinancialInsightSchema).optional(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringMerchantSummary = z.infer<typeof RecurringMerchantSummarySchema>;

export const RecurringAccountSummarySchema = z
  .object({
    id: z.string(),
    displayName: z.string().optional(),
    icon: z.string().optional(),
    logoUrl: z.string().nullable().optional(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringAccountSummary = z.infer<typeof RecurringAccountSummarySchema>;

export const RecurringCategorySummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringCategorySummary = z.infer<typeof RecurringCategorySummarySchema>;

export const RecurringCategoryGroupSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringCategoryGroupSummary = z.infer<typeof RecurringCategoryGroupSummarySchema>;

export const RecurringPaymentTransactionSchema = z
  .object({
    id: z.string(),
    amount: z.number(),
    date: z.string(),
    category: RecurringCategorySummarySchema.extend({
      group: RecurringCategoryGroupSummarySchema,
    }).strict(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringPaymentTransaction = z.infer<typeof RecurringPaymentTransactionSchema>;

export const RecurringPaymentsInformationSchema = z
  .object({
    status: z.string(),
    remainingBalance: z.number(),
    transactions: z.array(RecurringPaymentTransactionSchema).nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringPaymentsInformation = z.infer<typeof RecurringPaymentsInformationSchema>;

export const RecurringLiabilityStatementSchema = z
  .object({
    id: z.string(),
    minimumPaymentAmount: z.number(),
    paymentsInformation: RecurringPaymentsInformationSchema,
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringLiabilityStatement = z.infer<typeof RecurringLiabilityStatementSchema>;

export const RecurringLiabilityAccountSchema = z
  .object({
    id: z.string(),
    liabilityType: z.string().optional(),
    account: RecurringAccountSummarySchema.pick({ id: true, __typename: true }).nullable(),
    lastStatement: z
      .object({
        id: z.string(),
        dueDate: z.string(),
        __typename: z.string().optional(),
      })
      .strict()
      .optional(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringLiabilityAccount = z.infer<typeof RecurringLiabilityAccountSchema>;

// ---------------- Recurring streams ----------------

export const RecurringStreamSchema = z
  .object({
    id: z.string(),
    reviewStatus: z.string().optional(),
    frequency: z.string(),
    isActive: z.boolean().optional(),
    amount: z.number().nullable(),
    baseDate: z.string().optional(),
    dayOfTheMonth: z.number().nullable().optional(),
    isApproximate: z.boolean(),
    name: z.string(),
    logoUrl: z.string().nullable(),
    recurringType: z.string().optional(),
    merchant: RecurringMerchantSummarySchema.pick({
      id: true,
      name: true,
      logoUrl: true,
      financialInsights: true,
      __typename: true,
    }).nullable(),
    creditReportLiabilityAccount: RecurringLiabilityAccountSchema.nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringStream = z.infer<typeof RecurringStreamSchema>;

export const RECURRING_STREAM_FIELDS = `
  id
  reviewStatus
  frequency
  amount
  baseDate
  dayOfTheMonth
  isApproximate
  name
  logoUrl
  recurringType
  merchant {
    id
    __typename
  }
  creditReportLiabilityAccount {
    id
    account {
      id
      __typename
    }
    lastStatement {
      id
      dueDate
      __typename
    }
    __typename
  }
  __typename
`;

export const RecurringTransactionStreamItemSchema = z
  .object({
    stream: RecurringStreamSchema,
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringTransactionStreamItem = z.infer<typeof RecurringTransactionStreamItemSchema>;

export const GetRecurringTransactionStreamsResponseSchema = z
  .object({
    recurringTransactionStreams: z.array(RecurringTransactionStreamItemSchema),
  })
  .strict();
export type GetRecurringTransactionStreamsResponse = z.infer<
  typeof GetRecurringTransactionStreamsResponseSchema
>;

export const GetRecurringTransactionStreamsInputSchema = z
  .object({
    includeLiabilities: z.boolean().optional(),
  })
  .strict();
export type GetRecurringTransactionStreamsInput = z.infer<
  typeof GetRecurringTransactionStreamsInputSchema
>;

// ---------------- Aggregated recurring items ----------------

export const RECURRING_ITEM_STREAM_FIELDS = `
  id
  frequency
  isActive
  amount
  isApproximate
  name
  logoUrl
  merchant {
    id
    name
    logoUrl
    financialInsights @include(if: $includeFinancialInsights) {
      id
      status
      description
      reasoning
      savingsEstimateLow
      capturedSavingsLow
      currentAnnualCost
      __typename
    }
    __typename
  }
  creditReportLiabilityAccount {
    id
    liabilityType
    account {
      id
      __typename
    }
    __typename
  }
  __typename
`;

export const RECURRING_ITEM_LIABILITY_FIELDS = `
  id
  minimumPaymentAmount
  paymentsInformation {
    status
    remainingBalance
    transactions {
      id
      amount
      date
      category {
        id
        name
        icon
        group {
          id
          name
          type
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
`;

export const RecurringCalendarItemSchema = z
  .object({
    stream: RecurringStreamSchema,
    date: z.string(),
    isPast: z.boolean(),
    isLate: z.boolean(),
    markedPaidAt: z.string().nullable(),
    isCompleted: z.boolean(),
    transactionId: z.string().nullable(),
    amount: z.number(),
    amountDiff: z.number().nullable(),
    isAmountDifferentThanOriginal: z.boolean().nullable(),
    creditReportLiabilityStatementId: z.string().nullable(),
    category: RecurringCategorySummarySchema.nullable(),
    account: RecurringAccountSummarySchema.nullable(),
    liabilityStatement: RecurringLiabilityStatementSchema.nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringCalendarItem = z.infer<typeof RecurringCalendarItemSchema>;

export const RECURRING_CALENDAR_ITEM_FIELDS = `
  stream {
    ${RECURRING_ITEM_STREAM_FIELDS}
  }
  date
  isPast
  isLate
  markedPaidAt
  isCompleted
  transactionId
  amount
  amountDiff
  isAmountDifferentThanOriginal
  creditReportLiabilityStatementId
  category {
    id
    name
    icon
    __typename
  }
  account {
    id
    displayName
    icon
    logoUrl
    __typename
  }
  liabilityStatement {
    ${RECURRING_ITEM_LIABILITY_FIELDS}
  }
  __typename
`;

export const RecurringTotalSummarySchema = z
  .object({
    total: z.number(),
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringTotalSummary = z.infer<typeof RecurringTotalSummarySchema>;

export const RecurringProgressSummarySchema = RecurringTotalSummarySchema.extend({
  completed: z.number(),
  remaining: z.number(),
  count: z.number().optional(),
  pendingAmountCount: z.number().optional(),
}).strict();
export type RecurringProgressSummary = z.infer<typeof RecurringProgressSummarySchema>;

export const RecurringGroupSummarySchema = z
  .object({
    expense: RecurringTotalSummarySchema,
    creditCard: RecurringTotalSummarySchema,
    income: RecurringTotalSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringGroupSummary = z.infer<typeof RecurringGroupSummarySchema>;

export const RecurringAggregatedSummarySchema = z
  .object({
    expense: RecurringProgressSummarySchema,
    creditCard: RecurringProgressSummarySchema,
    income: RecurringProgressSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringAggregatedSummary = z.infer<typeof RecurringAggregatedSummarySchema>;

export const RecurringItemsGroupSchema = z
  .object({
    groupBy: z
      .object({
        status: z.string(),
        __typename: z.string().optional(),
      })
      .strict(),
    results: z.array(RecurringCalendarItemSchema),
    summary: RecurringGroupSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();
export type RecurringItemsGroup = z.infer<typeof RecurringItemsGroupSchema>;

export const AggregatedRecurringItemsSchema = z
  .object({
    groups: z.array(RecurringItemsGroupSchema),
    aggregatedSummary: RecurringAggregatedSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();
export type AggregatedRecurringItems = z.infer<typeof AggregatedRecurringItemsSchema>;

export const GetAggregatedRecurringItemsResponseSchema = z
  .object({
    aggregatedRecurringItems: AggregatedRecurringItemsSchema,
  })
  .strict();
export type GetAggregatedRecurringItemsResponse = z.infer<
  typeof GetAggregatedRecurringItemsResponseSchema
>;

export const RecurringTransactionFilterInputSchema = z.record(z.unknown());
export type RecurringTransactionFilterInput = z.infer<typeof RecurringTransactionFilterInputSchema>;

export const GetAggregatedRecurringItemsInputSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
    filters: RecurringTransactionFilterInputSchema.optional(),
    includeFinancialInsights: z.boolean().optional(),
  })
  .strict();
export type GetAggregatedRecurringItemsInput = z.infer<
  typeof GetAggregatedRecurringItemsInputSchema
>;
