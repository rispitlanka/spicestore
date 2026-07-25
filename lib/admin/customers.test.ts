import { describe, it, expect } from 'vitest'
import {
  filterCustomers,
  sortCustomers,
  computeCustomerSummaryStats,
  CustomerAggregate,
} from './customers'

describe('Admin Customer Management Helpers', () => {
  const sampleCustomers: CustomerAggregate[] = [
    {
      id: 'usr_1',
      full_name: 'Alice Cooper',
      email: 'alice@example.com',
      phone: '+1 555-0101',
      signup_date: '2026-01-15T10:00:00Z',
      order_count: 5,
      total_spend: 250.5,
      average_order_value: 50.1,
      is_guest: false,
    },
    {
      id: 'usr_2',
      full_name: 'Bob Marley',
      email: 'bob@example.com',
      phone: '+1 555-0202',
      signup_date: '2026-03-20T10:00:00Z',
      order_count: 1,
      total_spend: 30.0,
      average_order_value: 30.0,
      is_guest: false,
    },
    {
      id: 'guest_charlie@example.com',
      full_name: 'Charlie Brown',
      email: 'charlie@example.com',
      phone: '+1 555-0303',
      signup_date: '2026-02-10T10:00:00Z',
      order_count: 3,
      total_spend: 180.0,
      average_order_value: 60.0,
      is_guest: true,
    },
  ]

  describe('filterCustomers', () => {
    it('returns all customers when search query is empty', () => {
      const res = filterCustomers(sampleCustomers, '')
      expect(res.length).toBe(3)
    })

    it('filters by customer name case-insensitively', () => {
      const res = filterCustomers(sampleCustomers, 'alice')
      expect(res.length).toBe(1)
      expect(res[0].full_name).toBe('Alice Cooper')
    })

    it('filters by email address', () => {
      const res = filterCustomers(sampleCustomers, 'charlie@example.com')
      expect(res.length).toBe(1)
      expect(res[0].id).toBe('guest_charlie@example.com')
    })

    it('filters by phone number', () => {
      const res = filterCustomers(sampleCustomers, '0202')
      expect(res.length).toBe(1)
      expect(res[0].full_name).toBe('Bob Marley')
    })

    it('returns empty array when query does not match any customer', () => {
      const res = filterCustomers(sampleCustomers, 'nonexistent')
      expect(res.length).toBe(0)
    })
  })

  describe('sortCustomers', () => {
    it('sorts by total_spend descending', () => {
      const res = sortCustomers(sampleCustomers, 'total_spend', 'desc')
      expect(res.map((c) => c.total_spend)).toEqual([250.5, 180.0, 30.0])
    })

    it('sorts by total_spend ascending', () => {
      const res = sortCustomers(sampleCustomers, 'total_spend', 'asc')
      expect(res.map((c) => c.total_spend)).toEqual([30.0, 180.0, 250.5])
    })

    it('sorts by order_count descending', () => {
      const res = sortCustomers(sampleCustomers, 'order_count', 'desc')
      expect(res.map((c) => c.order_count)).toEqual([5, 3, 1])
    })

    it('sorts by signup_date descending (newest first)', () => {
      const res = sortCustomers(sampleCustomers, 'signup_date', 'desc')
      expect(res.map((c) => c.id)).toEqual(['usr_2', 'guest_charlie@example.com', 'usr_1'])
    })
  })

  describe('computeCustomerSummaryStats', () => {
    it('correctly aggregates metrics for customer list', () => {
      const stats = computeCustomerSummaryStats(sampleCustomers)
      expect(stats.totalCount).toBe(3)
      expect(stats.totalSpend).toBe(460.5)
      expect(stats.avgSpend).toBe(153.5)
      expect(stats.repeatBuyers).toBe(2) // Alice (5) and Charlie (3)
    })

    it('handles empty customer list gracefully', () => {
      const stats = computeCustomerSummaryStats([])
      expect(stats.totalCount).toBe(0)
      expect(stats.totalSpend).toBe(0)
      expect(stats.avgSpend).toBe(0)
      expect(stats.repeatBuyers).toBe(0)
    })
  })
})
