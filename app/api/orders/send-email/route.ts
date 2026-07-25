import { NextResponse } from 'next/server'
import { sendOrderEmail } from '@/lib/email/sendOrderEmail'
import { EmailEventType } from '@/lib/email/templates'

const VALID_EVENT_TYPES: EmailEventType[] = [
  'orderPlaced',
  'orderConfirmed',
  'orderShipped',
  'orderDelivered',
  'orderCancelled',
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, eventType } = body || {}

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Order ID is required.' },
        { status: 400 }
      )
    }

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: `Invalid or missing eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await sendOrderEmail(orderId, eventType)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('API /api/orders/send-email error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error sending email.' },
      { status: 500 }
    )
  }
}
