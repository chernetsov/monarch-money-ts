import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import {
  GetPortfolioResponseSchema,
  type GetPortfolioResponse,
  type Portfolio,
  type PortfolioInput,
  AGGREGATE_HOLDING_FIELDS,
  PERFORMANCE_FIELDS,
} from './portfolio.types.js';

/**
 * Get full portfolio: performance metrics + aggregate holdings.
 * Use for investments dashboard views.
 *
 * @param input - Optional filters: accountIds, date range, includeHiddenHoldings
 * @returns Portfolio with performance and aggregateHoldings
 */
export async function getPortfolio(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: PortfolioInput
): Promise<Portfolio> {
  const query = gql`
    query Web_GetPortfolio($portfolioInput: PortfolioInput) {
      portfolio(input: $portfolioInput) {
        performance { ${PERFORMANCE_FIELDS} }
        aggregateHoldings {
          edges {
            node { ${AGGREGATE_HOLDING_FIELDS} }
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;

  const variables = { portfolioInput: input ?? {} } as Record<string, unknown>;
  const response = await client.request<GetPortfolioResponse>(query, auth, GetPortfolioResponseSchema, variables);
  return response.portfolio;
}

