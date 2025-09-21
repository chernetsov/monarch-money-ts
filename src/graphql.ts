// src/new/graphql.ts - MonarchGraphQLClient wrapper
import { GraphQLClient } from 'graphql-request';
import { buildAuthHeaders, type AuthProvider } from './auth.js';
import type { ZodType } from 'zod';

export class MonarchGraphQLClient {

  private readonly client: GraphQLClient;

  constructor(endpoint: string = "https://api.monarchmoney.com/graphql") {
    this.client = new GraphQLClient(endpoint);
  }

  private isAuthError(err: unknown): boolean {
    const anyErr = err as any;
    const status = anyErr?.response?.status ?? anyErr?.response?.http?.status;
    if (status === 401 || status === 403) return true;
    const messages: string[] = Array.isArray(anyErr?.response?.errors)
      ? anyErr.response.errors.map((e: any) => e?.message).filter(Boolean)
      : [];
    const msg = [anyErr?.message, ...messages].join(' ').toLowerCase();
    return /unauthoriz|auth|token|forbidden/.test(msg);
  }

  async request<T>(
    query: string,
    auth: AuthProvider,
    schema: ZodType<T, any, any>,
    variables?: Record<string, unknown>
  ): Promise<T> {
    try {
      const token = await auth.getToken();
      const headers = buildAuthHeaders(token);
      const raw = await this.client.request<any>(query, variables as any, headers);
      const data = schema.parse(raw);
      return data as T;
    } catch (err) {
      if (this.isAuthError(err)) {
        try {
          await auth.invalidate();
          const token = await auth.getToken();
          const headers = buildAuthHeaders(token);
          const raw = await this.client.request<any>(query, variables as any, headers);
          const data = schema.parse(raw);
          return data as T;
        } catch (retryErr) {
          throw this.wrapError(retryErr);
        }
      }
      throw this.wrapError(err);
    }
  }

  private wrapError(err: unknown): Error {
    const anyErr = err as any;
    const response = anyErr?.response;
    if (response) {
      const status = response.status ?? response.http?.status ?? 'unknown';
      const messages = Array.isArray(response.errors)
        ? response.errors.map((e: any) => e?.message).filter(Boolean).join('; ')
        : anyErr?.message;
      return new Error(`GraphQL ${status}: ${messages || 'request failed'}`);
    }
    if (anyErr instanceof Error) {
      return new Error(`GraphQL request failed: ${anyErr.message}`);
    }
    return new Error('GraphQL request failed with an unknown error');
  }
  
}


