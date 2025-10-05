import { describe, it, expect } from 'vitest'
import { getIntegrationContext } from './test-utils.js'
import { getAccounts, getHoldings } from './accounts.js'

describe('integration: accounts', () => {
  it('gets accounts (no filters)', async () => {
    const { auth, client } = getIntegrationContext()
    const accounts = await getAccounts(auth, client)
    expect(Array.isArray(accounts)).toBe(true)
    if (accounts.length > 0) {
      expect(accounts[0]).toHaveProperty('id')
      expect(accounts[0]).toHaveProperty('displayName')
    }
  })

  it('gets rich accounts with multiple types (no filters)', async () => {
    const { auth, client } = getIntegrationContext()
    const accounts = await getAccounts(auth, client)
    expect(Array.isArray(accounts)).toBe(true)
    if (accounts.length > 0) {
      expect(accounts[0]).toHaveProperty('id')
      expect(accounts[0]).toHaveProperty('displayName')
      expect(accounts[0]).toHaveProperty('type')
    }
  })

  it('gets brokerage accounts via filters', async () => {
    const { auth, client } = getIntegrationContext()
    const accounts = await getAccounts(auth, client, { accountType: 'brokerage', includeManual: true, includeHidden: false, ignoreHiddenFromNetWorth: true })
    expect(Array.isArray(accounts)).toBe(true)
  })

  it('gets holdings for at least one account (portfolio view)', async () => {
    const { auth, client } = getIntegrationContext()
    const holdings = await getHoldings(auth, client, { /* empty defaults */ })
    expect(Array.isArray(holdings)).toBe(true)
    if (holdings.length > 0) {
      expect(holdings[0]).toHaveProperty('id')
      expect(holdings[0]).toHaveProperty('holdings')
      expect(Array.isArray(holdings[0].holdings)).toBe(true)
    }
  })
})
