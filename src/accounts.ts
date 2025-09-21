// src/new/accounts.ts - Accounts API with explicit per-request auth
import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
  GetAccountsResponseSchema,
  type Account,
  type GetAccountsResponse,
  type AccountFiltersInput,
  GetHoldingsResponseSchema,
  type GetHoldingsResponse,
  type AggregateHolding,
  type PortfolioInput
} from './accounts-types.js';

/**
 * Get rich accounts list with flexible filters (aligns with AccountFilters in traffic).
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
        ownedByUser { id name profilePictureUrl __typename }
        __typename
      }
    }
  `;

  const variables = { filters: filters ?? {} } as Record<string, unknown>;
  const response = await client.request<GetAccountsResponse>(query, auth, GetAccountsResponseSchema, variables);
  return response.accounts;
}



/**
 * Get account holdings aggregated by security (aligns with Web_GetHoldings in traffic).
 * Provide filters via PortfolioInput: accountIds, date range, includeHiddenHoldings, etc.
 */
export async function getHoldings(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: PortfolioInput
): Promise<AggregateHolding[]> {
  const query = gql`
    query Web_GetPortfolio($portfolioInput: PortfolioInput) {
      portfolio(input: $portfolioInput) {
        aggregateHoldings {
          edges {
            node {
              id
              quantity
              basis
              totalValue
              securityPriceChangeDollars
              securityPriceChangePercent
              lastSyncedAt
              holdings {
                id
                type
                typeDisplay
                name
                ticker
                closingPrice
                isManual
                closingPriceUpdatedAt
                costBasis
                quantity
                __typename
              }
              security {
                id
                name
                type
                ticker
                typeDisplay
                currentPrice
                currentPriceUpdatedAt
                closingPrice
                oneDayChangePercent
                oneDayChangeDollars
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const variables = { portfolioInput: input ?? {} } as Record<string, unknown>;
  const response = await client.request<GetHoldingsResponse>(query, auth, GetHoldingsResponseSchema, variables);
  // Flatten connection
  return response.portfolio.aggregateHoldings.edges.map((edge) => edge.node);
}
