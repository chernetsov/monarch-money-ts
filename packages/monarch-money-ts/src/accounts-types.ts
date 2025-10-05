import { z } from 'zod';

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

export const OwnedByUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePictureUrl: z.string().nullable(),
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
  ownedByUser: OwnedByUserSchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type Account = z.infer<typeof AccountSchema>;

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

// ---------------- Holdings / Portfolio (from Web_GetHoldings) ----------------

export const HoldingSchema = z.object({
  id: z.string(),
  type: z.string(),
  typeDisplay: z.string(),
  name: z.string(),
  ticker: z.string().nullable(),
  closingPrice: z.number(),
  isManual: z.boolean(),
  closingPriceUpdatedAt: z.string().nullable(),
  quantity: z.number(),
  // Present on account-level holdings view; absent on portfolio view
  costBasis: z.number().nullable().optional(),
  // Present on portfolio (investments) view
  value: z.number().optional(),
  // Attached account info on portfolio (investments) view
  account: z.object({
    id: z.string(),
    mask: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    institution: z.object({ id: z.string(), name: z.string(), __typename: z.string().optional() }).strict().optional(),
    type: z.object({ name: z.string(), display: z.string(), __typename: z.string().optional() }).strict().optional(),
    subtype: z.object({ name: z.string(), display: z.string(), __typename: z.string().optional() }).strict().optional(),
    displayName: z.string().optional(),
    currentBalance: z.number().optional(),
    __typename: z.string().optional(),
  }).optional(),
  __typename: z.string().optional(),
}).strict();
export type Holding = z.infer<typeof HoldingSchema>;

export const SecuritySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  ticker: z.string().nullable(),
  typeDisplay: z.string(),
  currentPrice: z.number(),
  currentPriceUpdatedAt: z.string().nullable(),
  closingPrice: z.number(),
  oneDayChangePercent: z.number().nullable(),
  oneDayChangeDollars: z.number().nullable(),
  __typename: z.string().optional(),
}).strict();
export type Security = z.infer<typeof SecuritySchema>;

export const AggregateHoldingSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  basis: z.number(),
  totalValue: z.number(),
  securityPriceChangeDollars: z.number().nullable(),
  securityPriceChangePercent: z.number().nullable(),
  lastSyncedAt: z.string(),
  holdings: z.array(HoldingSchema),
  security: SecuritySchema.nullable(),
  __typename: z.string().optional(),
}).strict();
export type AggregateHolding = z.infer<typeof AggregateHoldingSchema>;

export const AggregateHoldingEdgeSchema = z.object({
  node: AggregateHoldingSchema,
  __typename: z.string().optional(),
}).strict();
export type AggregateHoldingEdge = z.infer<typeof AggregateHoldingEdgeSchema>;

export const AggregateHoldingConnectionSchema = z.object({
  edges: z.array(AggregateHoldingEdgeSchema),
  __typename: z.string().optional(),
}).strict();
export type AggregateHoldingConnection = z.infer<typeof AggregateHoldingConnectionSchema>;

export const PortfolioSchema = z.object({
  performance: z.object({
    totalValue: z.number(),
    totalBasis: z.number(),
    totalChangePercent: z.number(),
    totalChangeDollars: z.number(),
    oneDayChangePercent: z.number(),
    historicalChart: z.array(z.object({
      date: z.string(),
      returnPercent: z.number(),
      __typename: z.string().optional(),
    }).strict()),
    benchmarks: z.array(z.object({
      security: z.object({
        id: z.string(),
        ticker: z.string(),
        name: z.string(),
        oneDayChangePercent: z.number(),
        __typename: z.string().optional(),
      }).strict(),
      historicalChart: z.array(z.object({
        date: z.string(),
        returnPercent: z.number(),
        __typename: z.string().optional(),
      }).strict()),
      __typename: z.string().optional(),
    }).strict()),
    __typename: z.string().optional(),
  }).optional(),
  aggregateHoldings: AggregateHoldingConnectionSchema,
  __typename: z.string().optional(),
}).strict();
export type Portfolio = z.infer<typeof PortfolioSchema>;

export const GetHoldingsResponseSchema = z.object({
  portfolio: PortfolioSchema,
}).strict();
export type GetHoldingsResponse = z.infer<typeof GetHoldingsResponseSchema>;

// Input observed in traffic for Web_GetHoldings
export type PortfolioInput = Partial<{
  accountIds: string[];
  includeHiddenHoldings: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  topMoversLimit: number;
}> & Record<string, unknown>;
