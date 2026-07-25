import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import fs from 'node:fs'
import path from 'node:path'
import { getSiteSettings } from '@/lib/settings'

export async function POST() {
  try {
    revalidatePath('/', 'layout')

    // Also sync favicon_url to /public/favicon.ico if configured
    try {
      const settings = await getSiteSettings()
      const faviconUrl = settings.site_identity?.favicon_url?.trim()
      if (faviconUrl && (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://'))) {
        const res = await fetch(faviconUrl)
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())
          const publicFaviconPath = path.join(process.cwd(), 'public', 'favicon.ico')
          fs.writeFileSync(publicFaviconPath, buffer)
        }
      }
    } catch (favErr) {
      console.warn('Favicon sync failed:', favErr)
    }

    return NextResponse.json({ success: true, revalidated: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to revalidate settings path'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
