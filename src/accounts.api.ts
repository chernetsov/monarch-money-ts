import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
  GetAccountsResponseSchema,
  type Account,
  type GetAccountsResponse,
  type AccountFiltersInput,
} from './accounts.types.js';

/**
 * Get accounts list with flexible filters.
 * Pass undefined or empty object for no filters.
 */
export async function getAccounts(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  filters?: AccountFiltersInput
): Promise<Account[]> {
  const query = gql`
    query Web_GetAccounts($filters: AccountFilters) {
      accounts(filters: $filters) {
        id
        syncDisabled
        isHidden
        isAsset
        includeInNetWorth
        includeBalanceInNetWorth
        order
        type { name display __typename }
        displayName
        displayBalance
        signedBalance
        updatedAt
        icon
        logoUrl
        displayLastUpdatedAt
        limit
        mask
        subtype { display __typename }
        credential {
          id
          updateRequired
          dataProvider
          disconnectedFromDataProviderAt
          syncDisabledAt
          syncDisabledReason
          __typename
        }
        institution {
          id
          logo
          name
          status
          plaidStatus
          newConnectionsDisabled
          hasIssuesReported
          url
          hasIssuesReportedMessage
          transactionsStatus
          balanceStatus
          __typename
        }
        ownedByUser { id displayName profilePictureUrl __typename }
        __typename
      }
    }
  `;

  const variables = { filters: filters ?? {} } as Record<string, unknown>;
  const response = await client.request<GetAccountsResponse>(query, auth, GetAccountsResponseSchema, variables);
  return response.accounts;
}
