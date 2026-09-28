import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import type { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import {
  CreateTransactionTagResponseSchema,
  DeleteTransactionTagResponseSchema,
  type DeleteTransactionTagInput,
  type DeleteTransactionTagResponse,
  GetTransactionTagsResponseSchema,
  SetTransactionTagsResponseSchema,
  TRANSACTION_TAG_FIELDS,
  type CreateTransactionTagInput,
  type CreateTransactionTagResponse,
  type GetTransactionTagsInput,
  type GetTransactionTagsResponse,
  type SetTransactionTagsInput,
  type SetTransactionTagsResponse,
  type TransactionTag,
  type TransactionTagAssignment,
} from './tags.types.js';

/**
 * List all transaction tags configured in the household.
 *
 * @example
 * ```typescript
 * const tags = await getTransactionTags(auth, client);
 * ```
 */
export async function getTransactionTags(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: GetTransactionTagsInput,
): Promise<TransactionTag[]> {
  const query = gql`
    query GetHouseholdTransactionTags(
      $search: String
      $limit: Int
      $bulkParams: BulkTransactionDataParams
    ) {
      householdTransactionTags(search: $search, limit: $limit, bulkParams: $bulkParams) {
        ${TRANSACTION_TAG_FIELDS}
      }
    }
  `;

  const response = await client.request<GetTransactionTagsResponse>(
    query,
    auth,
    GetTransactionTagsResponseSchema,
    { search: input?.search, limit: input?.limit },
  );
  return response.householdTransactionTags;
}

/**
 * Create a new transaction tag.
 *
 * @example
 * ```typescript
 * const tag = await createTransactionTag(auth, client, { name: 'Reimbursable', color: '#19D2A5' });
 * ```
 */
export async function createTransactionTag(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: CreateTransactionTagInput,
): Promise<TransactionTag> {
  const mutation = gql`
    mutation Common_CreateTransactionTag($input: CreateTransactionTagInput!) {
      createTransactionTag(input: $input) {
        tag {
          ${TRANSACTION_TAG_FIELDS}
        }
        errors {
          message
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<CreateTransactionTagResponse>(
    mutation,
    auth,
    CreateTransactionTagResponseSchema,
    { input: { name: input.name, color: input.color } },
  );

  const { tag, errors } = response.createTransactionTag;
  if (errors) {
    throw new MonarchMutationError(errors.message ?? 'Tag creation failed', null, []);
  }
  if (!tag) {
    throw new MonarchMutationError('Tag creation failed: no tag returned', null, []);
  }
  return tag;
}

/**
 * Replace the tags on a transaction. An empty `tagIds` array removes all tags.
 *
 * @example
 * ```typescript
 * await setTransactionTags(auth, client, { transactionId: 'TRANSACTION_ID', tagIds: ['123'] });
 * ```
 */
export async function setTransactionTags(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: SetTransactionTagsInput,
): Promise<TransactionTagAssignment> {
  const mutation = gql`
    mutation Web_SetTransactionTags($input: SetTransactionTagsInput!) {
      setTransactionTags(input: $input) {
        errors {
          fieldErrors {
            field
            messages
            __typename
          }
          message
          code
          __typename
        }
        transaction {
          id
          tags {
            id
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<SetTransactionTagsResponse>(
    mutation,
    auth,
    SetTransactionTagsResponseSchema,
    { input: { transactionId: input.transactionId, tagIds: input.tagIds } },
  );

  const { transaction, errors } = response.setTransactionTags;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!transaction) {
    throw new MonarchMutationError('Setting tags failed: no transaction returned', null, []);
  }
  return transaction;
}

/**
 * Delete a transaction tag. The tag is removed from every transaction that has it.
 *
 * @example
 * ```typescript
 * await deleteTransactionTag(auth, client, { tagId: 'TAG_ID' });
 * ```
 */
export async function deleteTransactionTag(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: DeleteTransactionTagInput,
): Promise<true> {
  const mutation = gql`
    mutation Common_DeleteHouseholdTransactionTag($tagId: ID!) {
      deleteTransactionTag(tagId: $tagId) {
        errors {
          fieldErrors {
            field
            messages
            __typename
          }
          message
          code
          __typename
        }
        __typename
      }
    }
  `;

  const response = await client.request<DeleteTransactionTagResponse>(
    mutation,
    auth,
    DeleteTransactionTagResponseSchema,
    { tagId: input.tagId },
  );

  const { errors } = response.deleteTransactionTag;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  return true;
}
