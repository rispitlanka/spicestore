import { createClient } from '@supabase/supabase-js'
import { getSiteSettings } from '@/lib/settings'
import {
  orderPlaced,
  orderConfirmed,
  orderShipped,
  orderDelivered,
  orderCancelled,
  EmailEventType,
  OrderEmailData,
  OrderEmailItem,
} from './templates'

export async function sendOrderEmail(
  orderId: string,
  eventType: EmailEventType
): Promise<{ success: boolean; error?: string; logId?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let recipientEmail: string | null = null
  let errorMessage: string | null = null
  let isSuccess = false

  try {
    if (!orderId) {
      throw new Error('Order ID is required to send email notification.')
    }

    // 1. Fetch Order details
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        country:countries(name, code),
        customer_profiles(full_name, phone)
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !orderData) {
      throw new Error(orderErr?.message || `Order with ID "${orderId}" not found.`)
    }

    // Determine recipient email
    recipientEmail = orderData.guest_email?.trim() || null

    if (!recipientEmail && orderData.customer_id) {
      const { data: authUserData } = await supabase.auth.admin.getUserById(orderData.customer_id)
      if (authUserData?.user?.email) {
        recipientEmail = authUserData.user.email.trim()
      }
    }

    if (!recipientEmail) {
      throw new Error('No recipient email address found for this order.')
    }

    // 2. Fetch Order Items
    const { data: itemsData, error: itemsErr } = await supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        unit_price,
        unit_weight_kg,
        product:products(name),
        variation:product_variations(attributes, sku)
      `)
      .eq('order_id', orderId)

    if (itemsErr) {
      console.warn('Error loading order items for email:', itemsErr.message)
    }

    const formattedItems: OrderEmailItem[] = (itemsData || []).map((item: any) => {
      let varTitle = ''
      if (item.variation?.attributes && typeof item.variation.attributes === 'object') {
        varTitle = Object.values(item.variation.attributes).filter(Boolean).join(' / ')
      }

      return {
        id: item.id,
        quantity: item.quantity,
        unit_price: Number(item.unit_price || 0),
        unit_weight_kg: Number(item.unit_weight_kg || 0),
        product_name: item.product?.name || 'Item',
        variation_title: varTitle || undefined,
        sku: item.variation?.sku || undefined,
      }
    })

    // 3. Fetch Settings
    const settings = await getSiteSettings()

    // 4. Build Email Template
    const orderDataFormatted: OrderEmailData = {
      ...orderData,
      country_name: orderData.country?.name,
    }

    let templateResult: { subject: string; html: string }

    switch (eventType) {
      case 'orderPlaced':
        templateResult = orderPlaced(orderDataFormatted, formattedItems, settings)
        break
      case 'orderConfirmed':
        templateResult = orderConfirmed(orderDataFormatted, formattedItems, settings)
        break
      case 'orderShipped':
        templateResult = orderShipped(orderDataFormatted, formattedItems, settings)
        break
      case 'orderDelivered':
        templateResult = orderDelivered(orderDataFormatted, formattedItems, settings)
        break
      case 'orderCancelled':
        templateResult = orderCancelled(orderDataFormatted, formattedItems, settings)
        break
      default:
        throw new Error(`Unsupported email event type: "${eventType}"`)
    }

    // 5. Check Brevo API Key
    const apiKey = process.env.BREVO_API_KEY?.trim()
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'noreply@yarlsamayal.com'
    const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'Yarl Samayal'

    const isApiKeyPlaceholder =
      !apiKey ||
      apiKey === 'your_brevo_api_key' ||
      apiKey === 'xkeysib-placeholder' ||
      apiKey.length < 10

    if (isApiKeyPlaceholder) {
      throw new Error('BREVO_API_KEY is not configured in environment variables.')
    }

    // 6. Send email via Brevo REST API (https://api.brevo.com/v3/smtp/email)
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: orderData.guest_name || 'Customer' }],
        subject: templateResult.subject,
        htmlContent: templateResult.html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Brevo API Error (${response.status}): ${errorText}`)
    }

    isSuccess = true
  } catch (err: any) {
    errorMessage = err?.message || String(err)
    console.error(`[sendOrderEmail] Error sending ${eventType} email for order ${orderId}:`, errorMessage)
    isSuccess = false
  }

  // 7. Record status in order_email_log table
  try {
    const { data: logData, error: logErr } = await supabase
      .from('order_email_log')
      .insert({
        order_id: orderId,
        event_type: eventType,
        status: isSuccess ? 'sent' : 'failed',
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (logErr) {
      console.error('[sendOrderEmail] Failed to write into order_email_log table:', logErr.message)
    }

    return {
      success: isSuccess,
      error: errorMessage || undefined,
      logId: logData?.id,
    }
  } catch (logCatchErr: any) {
    console.error('[sendOrderEmail] Exception logging email status:', logCatchErr?.message)
    return {
      success: isSuccess,
      error: errorMessage || undefined,
    }
  }
}
