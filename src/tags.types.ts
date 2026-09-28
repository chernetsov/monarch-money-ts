import { z } from 'zod';
import { MutationErrorSchema } from './common.types.js';

// ---------------- Transaction Tag ----------------

/**
 * Household transaction tag with usage count.
 * Transactions embed the lighter `Tag` from `common.types.ts`.
 */
export const TransactionTagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    order: z.number(),
    transactionCount: z.number(),
    __typename: z.string().optional(),
  })
  .strict();
export type TransactionTag = z.infer<typeof TransactionTagSchema>;

export const TRANSACTION_TAG_FIELDS = `
  id
  name
  color
  order
  transactionCount
  __typename
`;

export const GetTransactionTagsResponseSchema = z
  .object({
    householdTransactionTags: z.array(TransactionTagSchema),
  })
  .strict();
export type GetTransactionTagsResponse = z.infer<typeof GetTransactionTagsResponseSchema>;

// ---------------- Create Tag ----------------

export const CreateTransactionTagResponseSchema = z
  .object({
    createTransactionTag: z
      .object({
        tag: TransactionTagSchema.nullable(),
        errors: z
          .object({
            message: z.string().nullable(),
            __typename: z.string().optional(),
          })
          .strict()
          .nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type CreateTransactionTagResponse = z.infer<typeof CreateTransactionTagResponseSchema>;

// ---------------- Set Transaction Tags ----------------

export const TransactionTagAssignmentSchema = z
  .object({
    id: z.string(),
    tags: z.array(
      z
        .object({
          id: z.string(),
          __typename: z.string().optional(),
        })
        .strict(),
    ),
    __typename: z.string().optional(),
  })
  .strict();
export type TransactionTagAssignment = z.infer<typeof TransactionTagAssignmentSchema>;

export const SetTransactionTagsResponseSchema = z
  .object({
    setTransactionTags: z
      .object({
        errors: MutationErrorSchema.nullable(),
        transaction: TransactionTagAssignmentSchema.nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type SetTransactionTagsResponse = z.infer<typeof SetTransactionTagsResponseSchema>;

// ---------------- Input Types ----------------

export const GetTransactionTagsInputSchema = z
  .object({
    /** Filter tags by name */
    search: z.string().optional(),
    /** Maximum number of tags to return */
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type GetTransactionTagsInput = z.infer<typeof GetTransactionTagsInputSchema>;

export const CreateTransactionTagInputSchema = z
  .object({
    name: z.string().min(1),
    /** Six-digit hex RGB color including the leading '#', e.g. "#19D2A5" */
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  })
  .strict();
export type CreateTransactionTagInput = z.infer<typeof CreateTransactionTagInputSchema>;

export const SetTransactionTagsInputSchema = z
  .object({
    transactionId: z.string().min(1),
    /** Replaces all tags on the transaction. An empty array removes all tags. */
    tagIds: z.array(z.string().min(1)),
  })
  .strict();
export type SetTransactionTagsInput = z.infer<typeof SetTransactionTagsInputSchema>;

export const DeleteTransactionTagInputSchema = z
  .object({
    tagId: z.string().min(1),
  })
  .strict();
export type DeleteTransactionTagInput = z.infer<typeof DeleteTransactionTagInputSchema>;

export const DeleteTransactionTagResponseSchema = z
  .object({
    deleteTransactionTag: z
      .object({
        errors: MutationErrorSchema.nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type DeleteTransactionTagResponse = z.infer<typeof DeleteTransactionTagResponseSchema>;
