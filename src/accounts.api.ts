import { gql } from 'graphql-request';
import type { AuthProvider } from './auth.js';
import { MonarchGraphQLClient } from './graphql.js';
import { MonarchMutationError } from './common.types.js';
import {
  GetAccountsResponseSchema,
  type Account,
  type GetAccountsResponse,
  type AccountFiltersInput,
  ForceRefreshAccountsResponseSchema,
  GetAccountsSyncStatusResponseSchema,
  type AccountsRefreshResult,
  type AccountsRefreshStatus,
  type AccountsRefreshStatusInput,
  type ForceRefreshAccountsResponse,
  type GetAccountsSyncStatusResponse,
  type RefreshAccountsInput,
  type RequestAccountsRefreshInput,
} from './accounts.types.js';

/**
 * Get accounts list with flexible filters.
 * Pass undefined or empty object for no filters.
 */
export async function getAccounts(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  filters?: AccountFiltersInput,
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
        type {
          name
          display
          __typename
        }
        displayName
        displayBalance
        signedBalance
        updatedAt
        icon
        logoUrl
        displayLastUpdatedAt
        limit
        mask
        subtype {
          display
          __typename
        }
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
        ownedByUser {
          id
          displayName
          profilePictureUrl
          __typename
        }
        __typename
      }
    }
  `;

  const variables = { filters: filters ?? {} } as Record<string, unknown>;
  const response = await client.request<GetAccountsResponse>(
    query,
    auth,
    GetAccountsResponseSchema,
    variables,
  );
  return response.accounts;
}

/**
 * Ask Monarch to refresh balances and transactions for accounts from their institutions.
 * Resolves to true when the refresh was started; throws `MonarchMutationError` otherwise.
 */
export async function requestAccountsRefresh(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input: RequestAccountsRefreshInput,
): Promise<true> {
  const mutation = gql`
    mutation Common_ForceRefreshAccountsMutation($input: ForceRefreshAccountsInput!) {
      forceRefreshAccounts(input: $input) {
        success
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

  const response = await client.request<ForceRefreshAccountsResponse>(
    mutation,
    auth,
    ForceRefreshAccountsResponseSchema,
    { input: { accountIds: input.accountIds } },
  );

  const { success, errors } = response.forceRefreshAccounts;
  if (errors) {
    throw MonarchMutationError.fromPayload(errors);
  }
  if (!success) {
    throw new MonarchMutationError('Account refresh request failed', null, []);
  }
  return true;
}

/**
 * Check whether a prior account refresh has finished.
 *
 * @param input - Optional account IDs to check; all accounts are checked when omitted
 */
export async function getAccountsRefreshStatus(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: AccountsRefreshStatusInput,
): Promise<AccountsRefreshStatus> {
  const query = gql`
    query ForceRefreshAccountsQuery {
      accounts {
        id
        hasSyncInProgress
        __typename
      }
    }
  `;

  const response = await client.request<GetAccountsSyncStatusResponse>(
    query,
    auth,
    GetAccountsSyncStatusResponseSchema,
  );

  const wanted = input?.accountIds?.length ? new Set(input.accountIds) : null;
  const accounts = wanted
    ? response.accounts.filter((account) => wanted.has(account.id))
    : response.accounts;
  const pendingAccountIds = accounts
    .filter((account) => account.hasSyncInProgress)
    .map((account) => account.id);

  return { complete: pendingAccountIds.length === 0, pendingAccountIds, accounts };
}

/**
 * Whether a prior account refresh has finished for the given (or all) accounts.
 */
export async function isAccountsRefreshComplete(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  accountIds?: string[],
): Promise<boolean> {
  const status = await getAccountsRefreshStatus(auth, client, { accountIds });
  return status.complete;
}

/**
 * Request an account refresh and optionally wait for it to complete.
 * Refreshes all accounts when `accountIds` is omitted.
 *
 * @example
 * ```typescript
 * const result = await refreshAccounts(auth, client, { wait: true, timeoutSeconds: 300 });
 * if (!result.complete) console.log('Still syncing:', result.pendingAccountIds);
 * ```
 */
export async function refreshAccounts(
  auth: AuthProvider,
  client: MonarchGraphQLClient,
  input?: RefreshAccountsInput,
): Promise<AccountsRefreshResult> {
  const accountIds =
    input?.accountIds ?? (await getAccounts(auth, client)).map((account) => account.id);
  if (accountIds.length === 0) {
    throw new Error('No accounts to refresh');
  }

  const startedAt = Date.now();
  await requestAccountsRefresh(auth, client, { accountIds });

  if (!input?.wait) {
    return {
      accountIds,
      requested: true,
      waited: false,
      complete: null,
      pendingAccountIds: [],
      elapsedSeconds: (Date.now() - startedAt) / 1000,
    };
  }

  const timeoutMs = (input.timeoutSeconds ?? 300) * 1000;
  const delayMs = (input.delaySeconds ?? 10) * 1000;
  let status: AccountsRefreshStatus;
  do {
    await sleep(delayMs);
    status = await getAccountsRefreshStatus(auth, client, { accountIds });
  } while (!status.complete && Date.now() - startedAt < timeoutMs);

  return {
    accountIds,
    requested: true,
    waited: true,
    complete: status.complete,
    pendingAccountIds: status.pendingAccountIds,
    elapsedSeconds: (Date.now() - startedAt) / 1000,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
