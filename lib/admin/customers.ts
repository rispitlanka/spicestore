export interface CustomerAggregate {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  signup_date: string
  order_count: number
  total_spend: number
  average_order_value: number
  is_guest: boolean
}

export function filterCustomers<T extends { full_name?: string | null; email?: string; phone?: string | null }>(
  customers: T[],
  searchQuery: string
): T[] {
  if (!searchQuery.trim()) return customers
  const q = searchQuery.toLowerCase().trim()
  return customers.filter((c) => {
    const nameMatch = c.full_name?.toLowerCase().includes(q) || false
    const emailMatch = c.email?.toLowerCase().includes(q) || false
    const phoneMatch = c.phone?.toLowerCase().includes(q) || false
    return nameMatch || emailMatch || phoneMatch
  })
}

export function sortCustomers<T extends CustomerAggregate>(
  customers: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
  const list = [...customers]
  list.sort((a, b) => {
    let valA: string | number = 0
    let valB: string | number = 0

    if (sortBy === 'total_spend') {
      valA = a.total_spend
      valB = b.total_spend
    } else if (sortBy === 'order_count') {
      valA = a.order_count
      valB = b.order_count
    } else if (sortBy === 'name') {
      valA = a.full_name || a.email
      valB = b.full_name || b.email
    } else {
      // Default: signup_date
      valA = new Date(a.signup_date).getTime()
      valB = new Date(b.signup_date).getTime()
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }
    return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
  })
  return list
}

export function computeCustomerSummaryStats(customers: CustomerAggregate[]) {
  const totalCount = customers.length
  const totalSpend = customers.reduce((sum, c) => sum + (c.total_spend || 0), 0)
  const avgSpend = totalCount > 0 ? totalSpend / totalCount : 0
  const repeatBuyers = customers.filter((c) => c.order_count > 1).length

  return {
    totalCount,
    totalSpend: Number(totalSpend.toFixed(2)),
    avgSpend: Number(avgSpend.toFixed(2)),
    repeatBuyers,
  }
}
