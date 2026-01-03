import { z } from 'zod';
import { UserSummarySchema, type UserSummary } from './common.types.js';

// ---------------- Accounts (from Web_GetAccountsPage fragments) ----------------

export const AccountTypeSchema = z.object({
  name: z.string(),
  display: z.string(),
  group: z.string().optional(),
  __typename: z.string().optional(),
}).strict();

export const AccountCredentialSchema = z.object({
  id: z.string(),
  updateRequired: z.boolean(),
  dataProvider: z.string().optional(),
  disconnectedFromDataProviderAt: z.string().nullable(),
  syncDisabledAt: z.string().nullable(),
  syncDisabledReason: z.string().nullable(),
  __typename: z.string().optional(),
}).strict();

// Accept unknown object for plaidStatus, but keep strictness elsewhere
export const InstitutionPlaidStatusSchema = z.unknown().optional();

export const InstitutionSchema = z.object({
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
}).strict();

export const AccountSchema = z.object({
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
  subtype: z.object({
    display: z.string(),
    __typename: z.string().optional(),
  }).strict(),
  credential: AccountCredentialSchema.nullable(),
  institution: InstitutionSchema,
  ownedByUser: UserSummarySchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type Account = z.infer<typeof AccountSchema>;

/**
 * Lightweight account summary embedded in transactions.
 * For full account details, use getAccounts().
 */
export const AccountSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  icon: z.string(),
  logoUrl: z.string(),
  __typename: z.string().optional(),
}).strict();
export type AccountSummary = z.infer<typeof AccountSummarySchema>;

export const ACCOUNT_SUMMARY_FIELDS = `
  id
  displayName
  icon
  logoUrl
  __typename
`;

export const GetAccountsResponseSchema = z.object({
  accounts: z.array(AccountSchema),
}).strict();
export type GetAccountsResponse = z.infer<typeof GetAccountsResponseSchema>;

// Filters input (aligns with AccountFilters seen in traffic)
export type AccountFiltersInput = Partial<{
  accountType: string;
  includeManual: boolean;
  includeHidden: boolean;
  ignoreHiddenFromNetWorth: boolean;
}> & Record<string, unknown>;
