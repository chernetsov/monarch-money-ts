import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
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
  client: MonarchGraphQLClient
): Promise<TransactionRule[]> {
  const query = gql`
    query GetTransactionRules {
      transactionRules {
        ${TRANSACTION_RULE_FIELDS}
      }
    }
  `;

  const response = await client.request(
    query,
    auth,
    GetTransactionRulesResponseSchema
  );
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
  options?: PreviewTransactionRuleOptions
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
    variables
  );
  return response.transactionRulePreview;
}

