import { describe, it, expect } from 'vitest'
import { getIntegrationContext } from './test-utils.js'
import { getPortfolio } from './portfolio.api.js'

describe('integration: portfolio', () => {
  it('gets portfolio with holdings', async () => {
    const { auth, client } = getIntegrationContext()
    const portfolio = await getPortfolio(auth, client)
    
    expect(portfolio).toHaveProperty('aggregateHoldings')
    expect(portfolio.aggregateHoldings).toHaveProperty('edges')
    expect(Array.isArray(portfolio.aggregateHoldings.edges)).toBe(true)
    
    if (portfolio.aggregateHoldings.edges.length > 0) {
      const holding = portfolio.aggregateHoldings.edges[0].node
      expect(holding).toHaveProperty('id')
      expect(holding).toHaveProperty('holdings')
      expect(Array.isArray(holding.holdings)).toBe(true)
    }
  })

  it('gets portfolio with performance when date range provided', async () => {
    const { auth, client } = getIntegrationContext()
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const portfolio = await getPortfolio(auth, client, { startDate, endDate })
    
    expect(portfolio).toHaveProperty('aggregateHoldings')
    // Performance may or may not be present depending on holdings
    if (portfolio.performance) {
      expect(portfolio.performance).toHaveProperty('totalValue')
      expect(portfolio.performance).toHaveProperty('historicalChart')
    }
  })
})

