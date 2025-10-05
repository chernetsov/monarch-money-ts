import { z } from 'zod';

// ---------------- Shared Domain Objects ----------------
// These types appear across multiple APIs (transactions, budgets, rules, trends, etc.)

export const CategoryGroupSchema = z.object({
  id: z.string(),
  type: z.string(), // "expense" | "income" | "transfer"
  __typename: z.string().optional(),
}).strict();
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  group: CategoryGroupSchema,
  __typename: z.string().optional(),
}).strict();
export type Category = z.infer<typeof CategorySchema>;

export const RecurringTransactionStreamSchema = z.object({
  frequency: z.string(),
  isActive: z.boolean(),
  __typename: z.string().optional(),
}).strict();
export type RecurringTransactionStream = z.infer<typeof RecurringTransactionStreamSchema>;

export const MerchantSchema = z.object({
  name: z.string(),
  id: z.string(),
  transactionsCount: z.number(),
  logoUrl: z.string().nullable(),
  recurringTransactionStream: RecurringTransactionStreamSchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type Merchant = z.infer<typeof MerchantSchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
  __typename: z.string().optional(),
}).strict();
export type Tag = z.infer<typeof TagSchema>;

export const GoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  __typename: z.string().optional(),
}).strict();
export type Goal = z.infer<typeof GoalSchema>;

export const AttachmentSchema = z.object({
  id: z.string(),
  __typename: z.string().optional(),
}).strict();
export type Attachment = z.infer<typeof AttachmentSchema>;

