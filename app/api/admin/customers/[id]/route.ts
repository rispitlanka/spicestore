import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: adminRow } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Handle Guest Customer by ID string starting with guest_ or query param
    const isGuest = id.startsWith('guest_')

    if (isGuest) {
      const decodedEmail = decodeURIComponent(id.replace('guest_', '')).toLowerCase().trim()

      const { data: guestOrders, error: ordersErr } = await adminSupabase
        .from('orders')
        .select(`
          *,
          country:countries(id, name, code),
          order_items(
            id,
            quantity,
            unit_price,
            unit_weight_kg,
            product:products(id, name, slug)
          )
        `)
        .is('customer_id', null)
        .ilike('guest_email', decodedEmail)
        .order('created_at', { ascending: false })

      if (ordersErr) {
        throw ordersErr
      }

      if (!guestOrders || guestOrders.length === 0) {
        return NextResponse.json({ error: 'Guest customer not found' }, { status: 404 })
      }

      const latestOrder = guestOrders[0]
      const validOrders = guestOrders.filter((o) => o.status.toLowerCase() !== 'cancelled')

      const totalSpend = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      const orderCount = validOrders.length
      const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0

      return NextResponse.json({
        customer: {
          id,
          full_name: latestOrder.guest_name || 'Guest Customer',
          email: latestOrder.guest_email || decodedEmail,
          phone: latestOrder.guest_phone || null,
          default_address_line1: latestOrder.address_line1 || null,
          default_address_line2: latestOrder.address_line2 || null,
          default_city: latestOrder.city || null,
          default_district: latestOrder.district || null,
          default_postal_code: latestOrder.postal_code || null,
          default_country_id: latestOrder.country_id || null,
          signup_date: guestOrders[guestOrders.length - 1].created_at,
          last_order_date: latestOrder.created_at,
          is_guest: true,
        },
        stats: {
          total_spend: Number(totalSpend.toFixed(2)),
          order_count: orderCount,
          average_order_value: Number(avgOrderValue.toFixed(2)),
        },
        orders: guestOrders,
      })
    }

    // ------------------------------------------------------------------------
    // REGISTERED CUSTOMER DETAILS
    // ------------------------------------------------------------------------
    const { data: profile, error: profErr } = await adminSupabase
      .from('customer_profiles')
      .select('id, full_name, phone, default_address_line1, default_address_line2, default_city, default_district, default_postal_code, default_country_id, created_at')
      .eq('id', id)
      .maybeSingle()

    if (profErr) {
      throw profErr
    }

    if (!profile) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 })
    }

    // Fetch Auth User email & signup metadata
    let email = 'N/A'
    let authCreatedAt = profile.created_at

    try {
      const { data: authUserData } = await adminSupabase.auth.admin.getUserById(id)
      if (authUserData?.user) {
        email = authUserData.user.email || 'N/A'
        authCreatedAt = authUserData.user.created_at || profile.created_at
      }
    } catch (e) {
      console.warn('Could not fetch auth user by ID:', e)
    }

    // Fetch full order history for customer
    const { data: customerOrders, error: ordersErr } = await adminSupabase
      .from('orders')
      .select(`
        *,
        country:countries(id, name, code),
        order_items(
          id,
          quantity,
          unit_price,
          unit_weight_kg,
          product:products(id, name, slug)
        )
      `)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })

    if (ordersErr) {
      throw ordersErr
    }

    const validOrders = (customerOrders || []).filter(
      (o) => o.status.toLowerCase() !== 'cancelled'
    )
    const totalSpend = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
    const orderCount = validOrders.length
    const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0

    return NextResponse.json({
      customer: {
        id: profile.id,
        full_name: profile.full_name,
        email,
        phone: profile.phone,
        default_address_line1: profile.default_address_line1,
        default_address_line2: profile.default_address_line2,
        default_city: profile.default_city,
        default_district: profile.default_district,
        default_postal_code: profile.default_postal_code,
        default_country_id: profile.default_country_id,
        signup_date: authCreatedAt,
        last_order_date: customerOrders?.[0]?.created_at || null,
        is_guest: false,
      },
      stats: {
        total_spend: Number(totalSpend.toFixed(2)),
        order_count: orderCount,
        average_order_value: Number(avgOrderValue.toFixed(2)),
      },
      orders: customerOrders || [],
    })
  } catch (err: unknown) {
    console.error('Error in /api/admin/customers/[id]:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

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

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)

    const { data: adminRow } = await adminSupabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!adminRow) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    if (id.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'Guest customer profiles cannot be directly edited.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      full_name,
      phone,
      default_address_line1,
      default_address_line2,
      default_city,
      default_district,
      default_postal_code,
      default_country_id,
    } = body

    const { data: updatedProfile, error: updateErr } = await adminSupabase
      .from('customer_profiles')
      .update({
        full_name: full_name ?? undefined,
        phone: phone ?? undefined,
        default_address_line1: default_address_line1 ?? undefined,
        default_address_line2: default_address_line2 ?? undefined,
        default_city: default_city ?? undefined,
        default_district: default_district ?? undefined,
        default_postal_code: default_postal_code ?? undefined,
        default_country_id: default_country_id ?? undefined,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      throw updateErr
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    })
  } catch (err: unknown) {
    console.error('Error updating customer profile:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
