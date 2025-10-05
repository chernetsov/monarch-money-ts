import { describe, it, expect } from 'vitest'
import { getIntegrationContext } from './test-utils.js'
import { getTransactions } from './transactions.js'

describe('integration: transactions', () => {
  it('gets transactions (no filters)', async () => {
    const { auth, client } = getIntegrationContext()
    const result = await getTransactions(auth, client)
    expect(Array.isArray(result.transactions)).toBe(true)
    expect(typeof result.totalCount).toBe('number')
    expect(typeof result.totalSelectableCount).toBe('number')
    if (result.transactions.length > 0) {
      expect(result.transactions[0]).toHaveProperty('id')
      expect(result.transactions[0]).toHaveProperty('amount')
      expect(result.transactions[0]).toHaveProperty('date')
      expect(result.transactions[0]).toHaveProperty('merchant')
      expect(result.transactions[0]).toHaveProperty('category')
      expect(result.transactions[0]).toHaveProperty('account')
    }
  })

  it('gets transactions with pagination', async () => {
    const { auth, client } = getIntegrationContext()
    const result = await getTransactions(auth, client, {
      limit: 10,
      offset: 0,
      orderBy: 'date'
    })
    expect(Array.isArray(result.transactions)).toBe(true)
    expect(result.transactions.length).toBeLessThanOrEqual(10)
  })

  it('gets transactions with date filter', async () => {
    const { auth, client } = getIntegrationContext()
    const result = await getTransactions(auth, client, {
      limit: 25,
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-10-31',
        transactionVisibility: 'non_hidden_transactions_only'
      }
    })
    expect(Array.isArray(result.transactions)).toBe(true)
    if (result.transactions.length > 0) {
      const txn = result.transactions[0]
      expect(txn).toHaveProperty('id')
      expect(txn).toHaveProperty('merchant')
      expect(txn.merchant).toHaveProperty('name')
      expect(txn).toHaveProperty('category')
      expect(txn.category).toHaveProperty('name')
      expect(txn.category).toHaveProperty('group')
      expect(txn.category.group).toHaveProperty('type')
    }
  })

  it('validates transaction structure', async () => {
    const { auth, client } = getIntegrationContext()
    const result = await getTransactions(auth, client, { limit: 1 })
    if (result.transactions.length > 0) {
      const txn = result.transactions[0]
      expect(typeof txn.id).toBe('string')
      expect(typeof txn.amount).toBe('number')
      expect(typeof txn.pending).toBe('boolean')
      expect(typeof txn.date).toBe('string')
      expect(typeof txn.isRecurring).toBe('boolean')
      expect(typeof txn.needsReview).toBe('boolean')
      expect(typeof txn.isSplitTransaction).toBe('boolean')
      expect(txn.account).toHaveProperty('displayName')
      expect(txn.category).toHaveProperty('icon')
      expect(Array.isArray(txn.tags)).toBe(true)
      expect(Array.isArray(txn.attachments)).toBe(true)
    }
  })
})

