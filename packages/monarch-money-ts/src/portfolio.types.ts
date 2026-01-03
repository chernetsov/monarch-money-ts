import { z } from 'zod';

// ---------------- Holdings ----------------

export const HoldingSchema = z.object({
  id: z.string(),
  type: z.string(),
  typeDisplay: z.string(),
  name: z.string(),
  ticker: z.string().nullable(),
  closingPrice: z.number(),
  isManual: z.boolean().optional(),
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

export const HOLDING_FIELDS = `
  id
  type
  typeDisplay
  name
  ticker
  closingPrice
  closingPriceUpdatedAt
  quantity
  value
  account {
    id
    mask
    icon
    logoUrl
    institution { id name __typename }
    type { name display __typename }
    subtype { name display __typename }
    displayName
    currentBalance
    __typename
  }
  __typename
`;

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

export const SECURITY_FIELDS = `
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
`;

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

export const AGGREGATE_HOLDING_FIELDS = `
  id
  quantity
  basis
  totalValue
  securityPriceChangeDollars
  securityPriceChangePercent
  lastSyncedAt
  holdings { ${HOLDING_FIELDS} }
  security { ${SECURITY_FIELDS} }
  __typename
`;

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

// ---------------- Performance ----------------

export const HistoricalChartPointSchema = z.object({
  date: z.string(),
  returnPercent: z.number(),
  __typename: z.string().optional(),
}).strict();
export type HistoricalChartPoint = z.infer<typeof HistoricalChartPointSchema>;

export const BenchmarkSecuritySchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  oneDayChangePercent: z.number(),
  __typename: z.string().optional(),
}).strict();
export type BenchmarkSecurity = z.infer<typeof BenchmarkSecuritySchema>;

export const BenchmarkSchema = z.object({
  security: BenchmarkSecuritySchema,
  historicalChart: z.array(HistoricalChartPointSchema),
  __typename: z.string().optional(),
}).strict();
export type Benchmark = z.infer<typeof BenchmarkSchema>;

export const PerformanceSchema = z.object({
  totalValue: z.number(),
  totalBasis: z.number(),
  totalChangePercent: z.number(),
  totalChangeDollars: z.number(),
  oneDayChangePercent: z.number(),
  historicalChart: z.array(HistoricalChartPointSchema),
  benchmarks: z.array(BenchmarkSchema),
  __typename: z.string().optional(),
}).strict();
export type Performance = z.infer<typeof PerformanceSchema>;

export const PERFORMANCE_FIELDS = `
  totalValue
  totalBasis
  totalChangePercent
  totalChangeDollars
  oneDayChangePercent
  historicalChart { date returnPercent __typename }
  benchmarks {
    security { id ticker name oneDayChangePercent __typename }
    historicalChart { date returnPercent __typename }
    __typename
  }
  __typename
`;

// ---------------- Portfolio ----------------

export const PortfolioSchema = z.object({
  performance: PerformanceSchema.nullable().optional(),
  aggregateHoldings: AggregateHoldingConnectionSchema,
  __typename: z.string().optional(),
}).strict();
export type Portfolio = z.infer<typeof PortfolioSchema>;

export const GetPortfolioResponseSchema = z.object({
  portfolio: PortfolioSchema,
}).strict();
export type GetPortfolioResponse = z.infer<typeof GetPortfolioResponseSchema>;

// ---------------- Input ----------------

/**
 * Input for portfolio queries.
 * - accountIds: filter to specific accounts
 * - startDate/endDate: date range for performance chart (YYYY-MM-DD)
 * - includeHiddenHoldings: include hidden holdings
 * - topMoversLimit: limit for top movers (used by web UI)
 */
export type PortfolioInput = Partial<{
  accountIds: string[];
  includeHiddenHoldings: boolean;
  startDate: string;
  endDate: string;
  topMoversLimit: number;
}> & Record<string, unknown>;

