import { z } from 'zod';
import { TransactionFiltersInputSchema } from './transactions.types.js';

// ---------------- Aggregate Summaries ----------------

export const CashflowSumSchema = z
  .object({
    sum: z.number(),
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowSum = z.infer<typeof CashflowSumSchema>;

export const CashflowIncomeExpenseSchema = z
  .object({
    sumIncome: z.number(),
    sumExpense: z.number(),
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowIncomeExpense = z.infer<typeof CashflowIncomeExpenseSchema>;

/** Income, expense, and savings totals for a date range. */
export const CashflowSummarySchema = z
  .object({
    sumIncome: z.number(),
    sumExpense: z.number(),
    savings: z.number(),
    savingsRate: z.number(),
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowSummary = z.infer<typeof CashflowSummarySchema>;

export const CASHFLOW_SUMMARY_FIELDS = `
  sumIncome
  sumExpense
  savings
  savingsRate
  __typename
`;

// ---------------- Breakdown Rows ----------------

export const CashflowCategoryRowSchema = z
  .object({
    groupBy: z
      .object({
        category: z
          .object({
            id: z.string(),
            name: z.string(),
            group: z
              .object({
                id: z.string(),
                type: z.string(),
                __typename: z.string().optional(),
              })
              .strict(),
            __typename: z.string().optional(),
          })
          .strict()
          .nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
    summary: CashflowSumSchema,
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowCategoryRow = z.infer<typeof CashflowCategoryRowSchema>;

export const CashflowCategoryGroupRowSchema = z
  .object({
    groupBy: z
      .object({
        categoryGroup: z
          .object({
            id: z.string(),
            name: z.string(),
            type: z.string(),
            __typename: z.string().optional(),
          })
          .strict()
          .nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
    summary: CashflowSumSchema,
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowCategoryGroupRow = z.infer<typeof CashflowCategoryGroupRowSchema>;

export const CashflowMerchantRowSchema = z
  .object({
    groupBy: z
      .object({
        merchant: z
          .object({
            id: z.string(),
            name: z.string(),
            logoUrl: z.string().nullable(),
            __typename: z.string().optional(),
          })
          .strict()
          .nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
    summary: CashflowIncomeExpenseSchema,
    __typename: z.string().optional(),
  })
  .strict();
export type CashflowMerchantRow = z.infer<typeof CashflowMerchantRowSchema>;

const CashflowSummaryRowSchema = z
  .object({
    summary: CashflowSummarySchema,
    __typename: z.string().optional(),
  })
  .strict();

// ---------------- Responses ----------------

/** Cash flow for a date range broken down by category, category group, and merchant. */
export const CashflowSchema = z
  .object({
    byCategory: z.array(CashflowCategoryRowSchema),
    byCategoryGroup: z.array(CashflowCategoryGroupRowSchema),
    byMerchant: z.array(CashflowMerchantRowSchema),
    summary: z.array(CashflowSummaryRowSchema),
  })
  .strict();
export type Cashflow = z.infer<typeof CashflowSchema>;

export const GetCashflowSummaryResponseSchema = z
  .object({
    summary: z.array(CashflowSummaryRowSchema),
  })
  .strict();
export type GetCashflowSummaryResponse = z.infer<typeof GetCashflowSummaryResponseSchema>;

// ---------------- Input Types ----------------

/**
 * Date range and optional transaction filters for cash flow queries.
 * Provide both startDate and endDate, or neither to use the current month.
 */
export const CashflowInputSchema = z
  .object({
    /** Start date in YYYY-MM-DD format */
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** End date in YYYY-MM-DD format */
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Additional TransactionFilterInput fields; startDate/endDate above take precedence */
    filters: TransactionFiltersInputSchema.optional(),
  })
  .strict()
  .refine((input) => (input.startDate === undefined) === (input.endDate === undefined), {
    message: 'Provide both startDate and endDate, or neither',
    path: ['startDate'],
  });
export type CashflowInput = z.infer<typeof CashflowInputSchema>;
