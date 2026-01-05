import { describe, it, expect } from 'vitest'
import { getIntegrationContext } from './test-utils.js'
import { getTransaction, getTransactions, updateTransaction } from './transactions.api.js'
import { getBudgetCategories } from './categories.api.js'
import { MonarchMutationError, MonarchGraphQLError } from './common.types.js'

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

  it('gets a single transaction by ID', async () => {
    const { auth, client } = getIntegrationContext()

    // First get a transaction ID from the list
    const listResult = await getTransactions(auth, client, { limit: 1 })
    expect(listResult.transactions.length).toBeGreaterThan(0)
    const txnId = listResult.transactions[0].id

    // Fetch the single transaction
    const txn = await getTransaction(auth, client, { id: txnId })

    // Validate basic fields
    expect(txn.id).toBe(txnId)
    expect(typeof txn.amount).toBe('number')
    expect(typeof txn.pending).toBe('boolean')
    expect(typeof txn.date).toBe('string')
    expect(typeof txn.isRecurring).toBe('boolean')
    expect(typeof txn.needsReview).toBe('boolean')
    expect(typeof txn.isSplitTransaction).toBe('boolean')

    // Validate nested objects
    expect(txn.account).toHaveProperty('id')
    expect(txn.account).toHaveProperty('displayName')
    expect(txn.category).toHaveProperty('id')
    expect(txn.category).toHaveProperty('name')
    expect(txn.merchant).toHaveProperty('id')
    expect(txn.merchant).toHaveProperty('name')

    // Validate detail-only fields
    expect(txn).toHaveProperty('originalDate')
    expect(txn).toHaveProperty('hasSplitTransactions')
    expect(txn).toHaveProperty('isManual')
    expect(txn).toHaveProperty('updatedByRetailSync')
    
    // These should be defined (even if null/empty)
    if (txn.hasSplitTransactions) {
      expect(Array.isArray(txn.splitTransactions)).toBe(true)
    }
  })

  it('updates transaction category', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]
    const originalCategoryId = txn.category.id

    // Get categories to find a different one
    const { categories } = await getBudgetCategories(auth, client)
    const differentCategory = categories.find(c => c.id !== originalCategoryId && !c.isDisabled)
    expect(differentCategory).toBeDefined()

    // Update to a different category
    const updated = await updateTransaction(auth, client, {
      id: txn.id,
      category: differentCategory!.id,
      isRecommendedCategory: false
    })

    expect(updated.id).toBe(txn.id)
    expect(updated.category.id).toBe(differentCategory!.id)
    expect(updated.category.name).toBe(differentCategory!.name)
    expect(updated).toHaveProperty('amount')
    expect(updated).toHaveProperty('merchant')
    expect(updated).toHaveProperty('account')

    // Restore original category
    const restored = await updateTransaction(auth, client, {
      id: txn.id,
      category: originalCategoryId,
      isRecommendedCategory: false
    })

    expect(restored.category.id).toBe(originalCategoryId)
  })

  it('throws MonarchGraphQLError for invalid category', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to attempt to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]

    // Try to update with a non-existent category ID
    const fakeCategoryId = '999999999999999999'

    try {
      await updateTransaction(auth, client, {
        id: txn.id,
        category: fakeCategoryId,
        isRecommendedCategory: false
      })
      expect.fail('Expected an error to be thrown')
    } catch (e) {
      // The API returns GraphQL-level errors for invalid category IDs
      expect(e).toBeInstanceOf(MonarchGraphQLError)
      const error = e as MonarchGraphQLError
      
      expect(error.name).toBe('MonarchGraphQLError')
      expect(typeof error.message).toBe('string')
      expect(error.message.length).toBeGreaterThan(0)
      
      // Structured error data should be accessible
      expect(error.status).toBe(200)
      expect(Array.isArray(error.errors)).toBe(true)
      expect(error.errors.length).toBeGreaterThan(0)
      expect(error.errors[0]).toHaveProperty('message')
      
      // Path should indicate which operation failed
      expect(error.path).toEqual(['updateTransaction'])
    }
  })

  it('marks transaction as reviewed', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]

    // Mark as reviewed
    const reviewed = await updateTransaction(auth, client, {
      id: txn.id,
      reviewed: true
    })

    expect(reviewed.id).toBe(txn.id)
    expect(reviewed.needsReview).toBe(false)
    expect(reviewed.reviewedAt).not.toBeNull()
    expect(typeof reviewed.reviewedAt).toBe('string')
    expect(reviewed.reviewedByUser).not.toBeNull()
    expect(reviewed.reviewedByUser).toHaveProperty('id')
    expect(reviewed.reviewedByUser).toHaveProperty('displayName')
  })

  it('marks transaction as needing review', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]

    // First mark as reviewed
    await updateTransaction(auth, client, {
      id: txn.id,
      reviewed: true
    })

    // Then mark as needing review
    const needsReview = await updateTransaction(auth, client, {
      id: txn.id,
      needsReview: true
    })

    expect(needsReview.id).toBe(txn.id)
    expect(needsReview.needsReview).toBe(true)
  })

  it('updates transaction with generic updateTransaction', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]
    const originalCategoryId = txn.category.id

    // Get categories to find a different one
    const { categories } = await getBudgetCategories(auth, client)
    const differentCategory = categories.find(c => c.id !== originalCategoryId && !c.isDisabled)
    expect(differentCategory).toBeDefined()

    // Update category using generic updateTransaction
    const updated = await updateTransaction(auth, client, {
      id: txn.id,
      category: differentCategory!.id,
      isRecommendedCategory: false
    })

    expect(updated.id).toBe(txn.id)
    expect(updated.category.id).toBe(differentCategory!.id)
    expect(updated.category.name).toBe(differentCategory!.name)

    // Restore original category
    await updateTransaction(auth, client, {
      id: txn.id,
      category: originalCategoryId,
      isRecommendedCategory: false
    })
  })

  it('updates transaction notes', async () => {
    const { auth, client } = getIntegrationContext()

    // Get a transaction to update
    const txnResult = await getTransactions(auth, client, { limit: 1 })
    expect(txnResult.transactions.length).toBeGreaterThan(0)
    const txn = txnResult.transactions[0]
    const originalNotes = txn.notes

    // Update notes
    const testNote = `Test note ${Date.now()}`
    const updated = await updateTransaction(auth, client, {
      id: txn.id,
      notes: testNote
    })

    expect(updated.id).toBe(txn.id)
    expect(updated.notes).toBe(testNote)

    // Restore original notes
    await updateTransaction(auth, client, {
      id: txn.id,
      notes: originalNotes || ''
    })
  })
})

