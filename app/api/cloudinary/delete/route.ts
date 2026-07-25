import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
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

    if (user) {
      const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)
      const { data: adminRow } = await adminSupabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!adminRow) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
      }
    }

    // 2. Parse request payload
    const body = await request.json()
    const { public_id } = body

    if (!public_id || typeof public_id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing public_id in request body' },
        { status: 400 }
      )
    }

    // 3. Configure Cloudinary SDK
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    })

    // 4. Destroy asset on Cloudinary
    const result = await cloudinary.uploader.destroy(public_id)

    return NextResponse.json({
      success: true,
      public_id,
      result,
    })
  } catch (err: unknown) {
    console.error('Error deleting Cloudinary image:', err)
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
