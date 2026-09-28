import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import {
  CreateTransactionRuleResponseSchema,
  type CreateTransactionRuleInput,
  type CreateTransactionRuleResponse,
  DeleteTransactionRuleResponseSchema,
  type DeleteTransactionRuleResponse,
  TRANSACTION_RULE_FIELDS,
  GetTransactionRulesResponseSchema,
  type TransactionRule,
  type TransactionRulePreviewInput,
  type PreviewTransactionRuleOptions,
  PreviewTransactionRuleResponseSchema,
  type TransactionRulePreview,
  RULE_PREVIEW_RESULT_FIELDS,
} from './rules.types.js';

/**
 * Get all transaction rules for the household.
 * Rules are returned in order of priority (lower order = higher priority).
 */
export async function getTransactionRules(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
): Promise<TransactionRule[]> {
  const query = gql`
    query GetTransactionRules {
      transactionRules {
        ${TRANSACTION_RULE_FIELDS}
      }
    }
  `;

  const response = await client.request(query, auth, GetTransactionRulesResponseSchema);
  return response.transactionRules;
}

/**
 * Preview which transactions would be affected by a rule and what changes would be applied.
 * Useful for testing rule criteria before creating or updating a rule.
 *
 * @param auth - Auth provider for the request
 * @param client - GraphQL client
 * @param rule - Rule definition to preview
 * @param options - Pagination options (offset, limit defaults to 30)
 * @returns Preview results with matched transactions and proposed changes
 */
export async function previewTransactionRule(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  rule: TransactionRulePreviewInput,
  options?: PreviewTransactionRuleOptions,
): Promise<TransactionRulePreview> {
  const query = gql`
    query PreviewTransactionRule($rule: TransactionRulePreviewInput!, $offset: Int, $limit: Int) {
      transactionRulePreview(input: $rule) {
        totalCount
        results(offset: $offset, limit: $limit) {
          ${RULE_PREVIEW_RESULT_FIELDS}
        }
        __typename
      }
    }
  `;

  const variables = {
    rule,
    offset: options?.offset,
    limit: options?.limit ?? 30,
  } as Record<string, unknown>;

  const response = await client.request(
    query,
    auth,
    PreviewTransactionRuleResponseSchema,
    variables,
  );
  return response.transactionRulePreview;
}

/**
 * Creates a transaction rule and returns it.
 * The create mutation returns only errors, so the new rule is found by diffing rule IDs.
 *
 * @example
 * ```typescript
 * const rule = await createTransactionRule(auth, client, {
 *   merchantCriteria: [{ operator: 'contains', value: 'terrazzo' }],
 *   setCategoryAction: 'CATEGORY_ID',
 * });
 * ```
 */
export async function createTransactionRule(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: CreateTransactionRuleInput,
): Promise<TransactionRule> {
  const mutation = gql`
    mutation Common_CreateTransactionRuleMutationV2($input: CreateTransactionRuleInput!) {
      createTransactionRuleV2(input: $input) {
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

  const before = new Set((await getTransactionRules(auth, client)).map((r) => r.id));
  const response = await client.request<CreateTransactionRuleResponse>(
    mutation,
    auth,
    CreateTransactionRuleResponseSchema,
    { input },
  );

  const { errors } = response.createTransactionRuleV2;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }

  const created = (await getTransactionRules(auth, client)).find((r) => !before.has(r.id));
  if (!created) {
    throw new MonarchMutationError('Rule creation failed: new rule not found', null, []);
  }
  return created;
}

/**
 * Delete a transaction rule. Transactions it already changed keep their values.
 *
 * @example
 * ```typescript
 * await deleteTransactionRule(auth, client, 'RULE_ID');
 * ```
 */
export async function deleteTransactionRule(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  ruleId: string,
): Promise<true> {
  const mutation = gql`
    mutation Common_DeleteTransactionRule($id: ID!) {
      deleteTransactionRule(id: $id) {
        deleted
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

  const response = await client.request<DeleteTransactionRuleResponse>(
    mutation,
    auth,
    DeleteTransactionRuleResponseSchema,
    { id: ruleId },
  );

  // Monarch reports `deleted: false` even when the rule is removed; only errors are reliable.
  const { errors } = response.deleteTransactionRule;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  return true;
}
