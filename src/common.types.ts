import { z } from 'zod';

// ---------------- API Errors ----------------

/**
 * GraphQL error location in the query.
 */
export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

/**
 * Structured GraphQL error from the API response.
 */
export interface GraphQLErrorDetail {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: (string | number)[];
}

/**
 * Error thrown when a GraphQL request fails at the resolver level.
 * Preserves the structured error information from the GraphQL response.
 * 
 * @example
 * ```typescript
 * try {
 *   await updateTransactionCategory(auth, client, input);
 * } catch (e) {
 *   if (e instanceof MonarchGraphQLError) {
 *     console.log(e.status);   // 200
 *     console.log(e.errors);   // [{ message: "...", path: ["updateTransaction"] }]
 *     console.log(e.path);     // ["updateTransaction"] - first error's path
 *   }
 * }
 * ```
 */
export class MonarchGraphQLError extends Error {
  readonly status: number | string;
  readonly errors: GraphQLErrorDetail[];
  readonly path?: (string | number)[];

  constructor(message: string, status: number | string, errors: GraphQLErrorDetail[]) {
    super(message);
    this.name = 'MonarchGraphQLError';
    this.status = status;
    this.errors = errors;
    this.path = errors[0]?.path;
  }
}

/**
 * Field-level error from a mutation response.
 */
export interface FieldError {
  field: string;
  messages: string[];
}

/**
 * Structured error thrown when a Monarch API mutation fails with business logic errors.
 * Exposes the error code, message, and field-level errors for programmatic handling.
 * 
 * @example
 * ```typescript
 * try {
 *   await updateTransactionCategory(auth, client, input);
 * } catch (e) {
 *   if (e instanceof MonarchMutationError) {
 *     console.log(e.code);        // e.g., "INVALID_INPUT"
 *     console.log(e.fieldErrors); // [{ field: "category", messages: ["Invalid category"] }]
 *   }
 * }
 * ```
 */
export class MonarchMutationError extends Error {
  readonly code: string | null;
  readonly fieldErrors: FieldError[];

  constructor(message: string, code: string | null, fieldErrors: FieldError[]) {
    super(message);
    this.name = 'MonarchMutationError';
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Zod schema for mutation error responses from the GraphQL API.
 * Used to validate the `errors` field in mutation responses.
 */
export const MutationErrorSchema = z.object({
  fieldErrors: z.array(z.object({
    field: z.string(),
    messages: z.array(z.string()),
    __typename: z.string().optional(),
  })),
  message: z.string(),
  code: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();
export type MutationError = z.infer<typeof MutationErrorSchema>;

// ---------------- Shared Domain Objects ----------------
// Types that don't have a dedicated domain module yet

export const RecurringTransactionStreamSchema = z.object({
  frequency: z.string(),
  isActive: z.boolean(),
  __typename: z.string().optional(),
}).strict();
export type RecurringTransactionStream = z.infer<typeof RecurringTransactionStreamSchema>;

export const RECURRING_TRANSACTION_STREAM_FIELDS = `
  frequency
  isActive
  __typename
`;

export const MerchantSchema = z.object({
  name: z.string(),
  id: z.string(),
  transactionsCount: z.number(),
  logoUrl: z.string().nullable(),
  recurringTransactionStream: RecurringTransactionStreamSchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type Merchant = z.infer<typeof MerchantSchema>;

export const MERCHANT_FIELDS = `
  name
  id
  transactionsCount
  logoUrl
  recurringTransactionStream {
    ${RECURRING_TRANSACTION_STREAM_FIELDS}
  }
  __typename
`;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  order: z.number(),
  __typename: z.string().optional(),
}).strict();
export type Tag = z.infer<typeof TagSchema>;

export const TAG_FIELDS = `
  id
  name
  color
  order
  __typename
`;

/**
 * Lightweight goal summary embedded in transactions.
 * For full goal details, use a dedicated goals API.
 */
export const GoalSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  __typename: z.string().optional(),
}).strict();
export type GoalSummary = z.infer<typeof GoalSummarySchema>;

export const GOAL_SUMMARY_FIELDS = `
  id
  name
  __typename
`;

/**
 * Lightweight attachment summary embedded in transactions.
 * For full attachment details (url, filename, etc.), use a dedicated attachments API.
 */
export const AttachmentSummarySchema = z.object({
  id: z.string(),
  __typename: z.string().optional(),
}).strict();
export type AttachmentSummary = z.infer<typeof AttachmentSummarySchema>;

export const ATTACHMENT_SUMMARY_FIELDS = `
  id
  __typename
`;

/**
 * Lightweight user summary for household member references.
 * Embedded in transactions and accounts when showing ownership.
 */
export const UserSummarySchema = z.object({
  id: z.string(),
  displayName: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const USER_SUMMARY_FIELDS = `
  id
  displayName
  profilePictureUrl
  __typename
`;

