import { z } from 'zod';
import { MutationErrorSchema, UserSummarySchema } from './common.types.js';

// ---------------- Accounts (from Web_GetAccountsPage fragments) ----------------

export const AccountTypeSchema = z
  .object({
    name: z.string(),
    display: z.string(),
    group: z.string().optional(),
    __typename: z.string().optional(),
  })
  .strict();

export const AccountCredentialSchema = z
  .object({
    id: z.string(),
    updateRequired: z.boolean(),
    dataProvider: z.string().optional(),
    disconnectedFromDataProviderAt: z.string().nullable(),
    syncDisabledAt: z.string().nullable(),
    syncDisabledReason: z.string().nullable(),
    __typename: z.string().optional(),
  })
  .strict();

// Accept unknown object for plaidStatus, but keep strictness elsewhere
export const InstitutionPlaidStatusSchema = z.unknown().optional();

export const InstitutionSchema = z
  .object({
    id: z.string(),
    logo: z.string().nullable(),
    name: z.string(),
    status: z.string().nullable(),
    plaidStatus: InstitutionPlaidStatusSchema,
    newConnectionsDisabled: z.boolean(),
    hasIssuesReported: z.boolean(),
    url: z.string().nullable(),
    hasIssuesReportedMessage: z.string().nullable(),
    transactionsStatus: z.string().nullable(),
    balanceStatus: z.string().nullable(),
    __typename: z.string().optional(),
  })
  .strict();

export const AccountSchema = z
  .object({
    id: z.string(),
    syncDisabled: z.boolean(),
    isHidden: z.boolean(),
    isAsset: z.boolean(),
    includeInNetWorth: z.boolean(),
    includeBalanceInNetWorth: z.boolean(),
    order: z.number(),
    type: AccountTypeSchema,
    displayName: z.string(),
    displayBalance: z.number(),
    signedBalance: z.number(),
    updatedAt: z.string(),
    icon: z.string(),
    logoUrl: z.string(),
    displayLastUpdatedAt: z.string(),
    limit: z.number().nullable(),
    mask: z.string().nullable(),
    subtype: z
      .object({
        display: z.string(),
        __typename: z.string().optional(),
      })
      .strict(),
    credential: AccountCredentialSchema.nullable(),
    institution: InstitutionSchema,
    ownedByUser: UserSummarySchema.nullable(),
    __typename: z.string().optional(),
  })
  .strict();
export type Account = z.infer<typeof AccountSchema>;

/**
 * Lightweight account summary embedded in transactions.
 * For full account details, use getAccounts().
 */
export const AccountSummarySchema = z
  .object({
    id: z.string(),
    displayName: z.string(),
    icon: z.string(),
    logoUrl: z.string(),
    __typename: z.string().optional(),
  })
  .strict();
export type AccountSummary = z.infer<typeof AccountSummarySchema>;

export const ACCOUNT_SUMMARY_FIELDS = `
  id
  displayName
  icon
  logoUrl
  __typename
`;

export const GetAccountsResponseSchema = z
  .object({
    accounts: z.array(AccountSchema),
  })
  .strict();
export type GetAccountsResponse = z.infer<typeof GetAccountsResponseSchema>;

// Filters input (aligns with AccountFilters seen in traffic)
export const AccountFiltersInputSchema = z
  .object({
    accountType: z.string().optional(),
    includeManual: z.boolean().optional(),
    includeHidden: z.boolean().optional(),
    ignoreHiddenFromNetWorth: z.boolean().optional(),
  })
  .catchall(z.unknown());

export type AccountFiltersInput = z.infer<typeof AccountFiltersInputSchema>;

// ---------------- Accounts Refresh ----------------

export const RequestAccountsRefreshInputSchema = z
  .object({
    accountIds: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type RequestAccountsRefreshInput = z.infer<typeof RequestAccountsRefreshInputSchema>;

export const ForceRefreshAccountsResponseSchema = z
  .object({
    forceRefreshAccounts: z
      .object({
        success: z.boolean(),
        errors: MutationErrorSchema.nullable(),
        __typename: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type ForceRefreshAccountsResponse = z.infer<typeof ForceRefreshAccountsResponseSchema>;

export const AccountSyncStatusSchema = z
  .object({
    id: z.string(),
    hasSyncInProgress: z.boolean(),
    __typename: z.string().optional(),
  })
  .strict();
export type AccountSyncStatus = z.infer<typeof AccountSyncStatusSchema>;

export const GetAccountsSyncStatusResponseSchema = z
  .object({
    accounts: z.array(AccountSyncStatusSchema),
  })
  .strict();
export type GetAccountsSyncStatusResponse = z.infer<typeof GetAccountsSyncStatusResponseSchema>;

export const AccountsRefreshStatusInputSchema = z
  .object({
    /** Account IDs to check. Omit to check all accounts. */
    accountIds: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type AccountsRefreshStatusInput = z.infer<typeof AccountsRefreshStatusInputSchema>;

export const AccountsRefreshStatusSchema = z
  .object({
    complete: z.boolean(),
    pendingAccountIds: z.array(z.string()),
    accounts: z.array(AccountSyncStatusSchema),
  })
  .strict();
export type AccountsRefreshStatus = z.infer<typeof AccountsRefreshStatusSchema>;

export const RefreshAccountsInputSchema = z
  .object({
    /** Account IDs to refresh. Omit to refresh all accounts. */
    accountIds: z.array(z.string().min(1)).min(1).optional(),
    /** Poll until the refresh completes or the timeout elapses */
    wait: z.boolean().optional(),
    /** Maximum seconds to wait when `wait` is true (default 300) */
    timeoutSeconds: z.number().positive().optional(),
    /** Seconds between status checks when `wait` is true (default 10) */
    delaySeconds: z.number().min(0).optional(),
  })
  .strict();
export type RefreshAccountsInput = z.infer<typeof RefreshAccountsInputSchema>;

export const AccountsRefreshResultSchema = z
  .object({
    accountIds: z.array(z.string()),
    requested: z.literal(true),
    waited: z.boolean(),
    /** null when `wait` was false */
    complete: z.boolean().nullable(),
    pendingAccountIds: z.array(z.string()),
    elapsedSeconds: z.number(),
  })
  .strict();
export type AccountsRefreshResult = z.infer<typeof AccountsRefreshResultSchema>;
