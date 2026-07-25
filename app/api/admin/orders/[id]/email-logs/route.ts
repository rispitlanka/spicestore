import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const orderId = resolvedParams?.id

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('order_email_log')
      .select('*')
      .eq('order_id', orderId)
      .order('sent_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error('API /api/admin/orders/[id]/email-logs error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 }
    )
  }
}
