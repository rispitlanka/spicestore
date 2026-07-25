import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

    // 1. Verify Authentication & Admin Role
    const supabaseSSR = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    })

    const {
      data: { user },
    } = await supabaseSSR.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin Client with Service Role (bypasses RLS to access auth.users and aggregate across system)
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: adminRow } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const customerType = searchParams.get('type') || 'registered' // 'registered' | 'guest'
    const searchQuery = searchParams.get('search')?.toLowerCase().trim() || ''
    const sortBy = searchParams.get('sortBy') || 'signup_date' // 'signup_date' | 'total_spend' | 'order_count' | 'name'
    const sortOrder = searchParams.get('sortOrder') || 'desc' // 'asc' | 'desc'

    // Fetch auth users to map emails and metadata
    const { data: authUsersData } = await adminSupabase.auth.admin.listUsers()
    const authUsersMap = new Map<string, { email: string; created_at: string }>()
    if (authUsersData?.users) {
      authUsersData.users.forEach((u) => {
        authUsersMap.set(u.id, {
          email: u.email || '',
          created_at: u.created_at,
        })
      })
    }

    if (customerType === 'guest') {
      // ----------------------------------------------------------------------
      // GUEST CUSTOMERS AGGREGATION
      // Group orders where customer_id IS NULL by guest_email
      // ----------------------------------------------------------------------
      const { data: guestOrders, error: guestErr } = await adminSupabase
        .from('orders')
        .select('id, guest_name, guest_email, guest_phone, total_amount, status, created_at')
        .is('customer_id', null)
        .not('guest_email', 'is', null)
        .order('created_at', { ascending: false })

      if (guestErr) {
        throw guestErr
      }

      // Aggregate by guest email
      const guestMap = new Map<
        string,
        {
          id: string
          guest_email: string
          guest_name: string | null
          guest_phone: string | null
          signup_date: string
          last_order_date: string
          order_count: number
          total_spend: number
          average_order_value: number
          is_guest: boolean
        }
      >()

      ;(guestOrders || []).forEach((o) => {
        const email = o.guest_email?.trim().toLowerCase()
        if (!email) return

        const isNonCancelled = o.status.toLowerCase() !== 'cancelled'
        const existing = guestMap.get(email)

        if (!existing) {
          guestMap.set(email, {
            id: `guest_${encodeURIComponent(email)}`,
            guest_email: o.guest_email || email,
            guest_name: o.guest_name || null,
            guest_phone: o.guest_phone || null,
            signup_date: o.created_at, // First order date
            last_order_date: o.created_at,
            order_count: isNonCancelled ? 1 : 0,
            total_spend: isNonCancelled ? Number(o.total_amount) || 0 : 0,
            average_order_value: 0,
            is_guest: true,
          })
        } else {
          if (!existing.guest_name && o.guest_name) existing.guest_name = o.guest_name
          if (!existing.guest_phone && o.guest_phone) existing.guest_phone = o.guest_phone
          if (new Date(o.created_at) < new Date(existing.signup_date)) {
            existing.signup_date = o.created_at
          }
          if (new Date(o.created_at) > new Date(existing.last_order_date)) {
            existing.last_order_date = o.created_at
          }
          if (isNonCancelled) {
            existing.order_count += 1
            existing.total_spend += Number(o.total_amount) || 0
          }
        }
      })

      let guestList = Array.from(guestMap.values()).map((g) => ({
        ...g,
        total_spend: Number(g.total_spend.toFixed(2)),
        average_order_value:
          g.order_count > 0 ? Number((g.total_spend / g.order_count).toFixed(2)) : 0,
      }))

      // Apply Search Filter
      if (searchQuery) {
        guestList = guestList.filter((g) => {
          const nameMatch = g.guest_name?.toLowerCase().includes(searchQuery)
          const emailMatch = g.guest_email.toLowerCase().includes(searchQuery)
          const phoneMatch = g.guest_phone?.toLowerCase().includes(searchQuery)
          return nameMatch || emailMatch || phoneMatch
        })
      }

      // Apply Sorting
      guestList.sort((a, b) => {
        let valA: number | string = 0
        let valB: number | string = 0

        if (sortBy === 'total_spend') {
          valA = a.total_spend
          valB = b.total_spend
        } else if (sortBy === 'order_count') {
          valA = a.order_count
          valB = b.order_count
        } else if (sortBy === 'name') {
          valA = a.guest_name || a.guest_email
          valB = b.guest_name || b.guest_email
        } else {
          // Default: signup_date (first order date)
          valA = new Date(a.signup_date).getTime()
          valB = new Date(b.signup_date).getTime()
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
      })

      return NextResponse.json({
        customers: guestList,
        total_count: guestList.length,
        type: 'guest',
      })
    }

    // ------------------------------------------------------------------------
    // REGISTERED CUSTOMERS AGGREGATION
    // ------------------------------------------------------------------------
    const { data: profiles, error: profErr } = await adminSupabase
      .from('customer_profiles')
      .select('id, full_name, phone, default_address_line1, default_address_line2, default_city, default_district, default_postal_code, default_country_id, created_at')
      .order('created_at', { ascending: false })

    if (profErr) {
      throw profErr
    }

    // Fetch order aggregation for registered customers
    const { data: registeredOrders, error: regOrdersErr } = await adminSupabase
      .from('orders')
      .select('id, customer_id, total_amount, status, created_at')
      .not('customer_id', 'is', null)

    if (regOrdersErr) {
      throw regOrdersErr
    }

    // Build order aggregate map per customer_id
    const orderAggMap = new Map<
      string,
      { order_count: number; total_spend: number; last_order_date: string | null }
    >()
    ;(registeredOrders || []).forEach((o) => {
      if (!o.customer_id) return
      const isNonCancelled = o.status.toLowerCase() !== 'cancelled'
      const existing = orderAggMap.get(o.customer_id)
      if (!existing) {
        orderAggMap.set(o.customer_id, {
          order_count: isNonCancelled ? 1 : 0,
          total_spend: isNonCancelled ? Number(o.total_amount) || 0 : 0,
          last_order_date: o.created_at,
        })
      } else {
        if (isNonCancelled) {
          existing.order_count += 1
          existing.total_spend += Number(o.total_amount) || 0
        }
        if (new Date(o.created_at) > new Date(existing.last_order_date || 0)) {
          existing.last_order_date = o.created_at
        }
      }
    })

    let registeredList = (profiles || []).map((p) => {
      const authInfo = authUsersMap.get(p.id)
      const email = authInfo?.email || 'N/A'
      const signupDate = authInfo?.created_at || p.created_at
      const agg = orderAggMap.get(p.id) || {
        order_count: 0,
        total_spend: 0,
        last_order_date: null,
      }

      const totalSpend = Number(agg.total_spend.toFixed(2))
      const avgOrderValue =
        agg.order_count > 0 ? Number((totalSpend / agg.order_count).toFixed(2)) : 0

      return {
        id: p.id,
        full_name: p.full_name,
        email,
        phone: p.phone,
        default_address_line1: p.default_address_line1,
        default_address_line2: p.default_address_line2,
        default_city: p.default_city,
        default_district: p.default_district,
        default_postal_code: p.default_postal_code,
        default_country_id: p.default_country_id,
        signup_date: signupDate,
        last_order_date: agg.last_order_date,
        order_count: agg.order_count,
        total_spend: totalSpend,
        average_order_value: avgOrderValue,
        is_guest: false,
      }
    })

    // Apply Search Filter
    if (searchQuery) {
      registeredList = registeredList.filter((c) => {
        const nameMatch = c.full_name?.toLowerCase().includes(searchQuery)
        const emailMatch = c.email.toLowerCase().includes(searchQuery)
        const phoneMatch = c.phone?.toLowerCase().includes(searchQuery)
        return nameMatch || emailMatch || phoneMatch
      })
    }

    // Apply Sorting
    registeredList.sort((a, b) => {
      let valA: number | string = 0
      let valB: number | string = 0

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

    return NextResponse.json({
      customers: registeredList,
      total_count: registeredList.length,
      type: 'registered',
    })
  } catch (err: unknown) {
    console.error('Error in /api/admin/customers:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
