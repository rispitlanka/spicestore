import { SiteSettings, DEFAULT_SETTINGS } from '@/lib/settings'
import { formatAddress, formatOrderId } from '@/lib/utils'

export interface OrderEmailItem {
  id: string
  quantity: number
  unit_price: number
  unit_weight_kg?: number
  product_name?: string
  variation_title?: string
  sku?: string
}

export interface OrderEmailData {
  id: string
  order_number?: string | null
  customer_id?: string | null
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  address_line1: string
  address_line2?: string | null
  city: string
  district?: string | null
  postal_code?: string | null
  country_name?: string | null
  country?: { name?: string | null; code?: string | null } | null
  subtotal: number
  discount_amount: number
  shipping_cost: number
  total_amount: number
  display_currency_code?: string | null
  exchange_rate_used?: number | null
  total_amount_display?: number | null
  payment_method?: string | null
  status: string
  created_at?: string
  customer_profiles?: {
    full_name?: string | null
    email?: string | null
  } | null
}

export type EmailEventType =
  | 'orderPlaced'
  | 'orderConfirmed'
  | 'orderShipped'
  | 'orderDelivered'
  | 'orderCancelled'

function formatMoney(amount: number, currencyCode: string = 'USD'): string {
  const code = (currencyCode || 'USD').toUpperCase()
  const num = Number(amount || 0)

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${code} ${num.toFixed(2)}`
  }
}

function renderBaseTemplate(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings,
  statusHeading: string,
  statusMessage: string,
  badgeBg: string = '#2F6B3C'
): string {
  const effectiveSettings = settings || DEFAULT_SETTINGS
  const siteTitle = effectiveSettings.site_identity?.site_title || 'Yarl Samayal'
  const logoUrl = effectiveSettings.site_identity?.logo_url

  const orderNumStr = formatOrderId(data.id, data.order_number)
  const currencyCode = data.display_currency_code || effectiveSettings.store_currency?.code || 'USD'
  const rate = Number(data.exchange_rate_used) || 1.0

  const subtotalDisplay = data.subtotal * rate
  const discountDisplay = (data.discount_amount || 0) * rate
  const shippingDisplay = (data.shipping_cost || 0) * rate
  const totalDisplay = data.total_amount_display ?? (data.total_amount * rate)

  const customerName =
    data.customer_profiles?.full_name || data.guest_name || 'Valued Customer'
  const formattedAddress = formatAddress(data).replace(/\n/g, '<br/>')

  const contactEmail = effectiveSettings.footer_contact?.email || 'info@yarlsamayal.com'
  const contactPhone = effectiveSettings.footer_contact?.phone || '+94 77 123 4567'
  const contactAddress = effectiveSettings.footer_contact?.address || 'Main Street, Jaffna, Sri Lanka'

  const itemRowsHtml = items
    .map((item) => {
      const name = item.product_name || 'Product'
      const variant = item.variation_title ? `<br/><span style="color:#6B7570;font-size:12px;">${item.variation_title}</span>` : ''
      const itemPrice = item.unit_price * rate
      const lineTotal = itemPrice * item.quantity

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #E7ECE8; font-size: 14px; color: #1C2521;">
            <strong>${name}</strong>${variant}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E7ECE8; font-size: 14px; color: #1C2521; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E7ECE8; font-size: 14px; color: #1C2521; text-align: right; white-space: nowrap;">
            ${formatMoney(itemPrice, currencyCode)}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #E7ECE8; font-size: 14px; color: #1C2521; text-align: right; font-weight: 600; white-space: nowrap;">
            ${formatMoney(lineTotal, currencyCode)}
          </td>
        </tr>
      `
    })
    .join('')

  const logoHeaderHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${siteTitle}" style="max-height: 48px; max-width: 200px; object-fit: contain; display: block;" />`
    : `<h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #1C2521; letter-spacing: -0.5px;">${siteTitle}</h1>`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusHeading} - ${orderNumStr}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C2521; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F6F4; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E7ECE8; border-radius: 4px; overflow: hidden;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #E7ECE8; background-color: #FFFFFF;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    ${logoHeaderHtml}
                  </td>
                  <td align="right" style="font-size: 13px; color: #6B7570; font-weight: 500;">
                    Order <strong>${orderNumStr}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Banner Message -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #FFFFFF;">
              <div style="display: inline-block; padding: 4px 12px; background-color: ${badgeBg}; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 2px; margin-bottom: 16px;">
                ${data.status}
              </div>
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1C2521;">
                Hello ${customerName},
              </h2>
              <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #4A5568;">
                ${statusMessage}
              </p>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #E7ECE8; border-radius: 4px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #F4F6F4;">
                    <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6B7570; text-align: left; font-weight: 600;">Item</th>
                    <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6B7570; text-align: center; font-weight: 600;">Qty</th>
                    <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6B7570; text-align: right; font-weight: 600;">Price</th>
                    <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6B7570; text-align: right; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown & Address Grid -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Shipping Address -->
                  <td valign="top" style="width: 50%; padding-right: 16px;">
                    <div style="background-color: #F4F6F4; padding: 16px; border-radius: 4px; border: 1px solid #E7ECE8; height: 100%;">
                      <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #6B7570; font-weight: 700; letter-spacing: 0.5px;">Delivery Address</h4>
                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1C2521;">
                        <strong>${customerName}</strong><br/>
                        ${formattedAddress}
                      </p>
                    </div>
                  </td>

                  <!-- Totals -->
                  <td valign="top" style="width: 50%; padding-left: 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #4A5568;">
                      <tr>
                        <td style="padding: 4px 0;">Subtotal:</td>
                        <td align="right" style="padding: 4px 0; color: #1C2521;">${formatMoney(subtotalDisplay, currencyCode)}</td>
                      </tr>
                      ${
                        discountDisplay > 0
                          ? `
                      <tr>
                        <td style="padding: 4px 0; color: #2F6B3C;">Discount:</td>
                        <td align="right" style="padding: 4px 0; color: #2F6B3C;">-${formatMoney(discountDisplay, currencyCode)}</td>
                      </tr>
                      `
                          : ''
                      }
                      <tr>
                        <td style="padding: 4px 0;">Shipping:</td>
                        <td align="right" style="padding: 4px 0; color: #1C2521;">${formatMoney(shippingDisplay, currencyCode)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0 4px 0; border-top: 1px solid #E7ECE8; font-weight: 700; color: #1C2521; font-size: 16px;">Total:</td>
                        <td align="right" style="padding: 10px 0 4px 0; border-top: 1px solid #E7ECE8; font-weight: 700; color: #2F6B3C; font-size: 16px;">${formatMoney(totalDisplay, currencyCode)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 4px; font-size: 11px; color: #6B7570; text-align: right;">
                          Payment: ${data.payment_method || 'Cash on Delivery'}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #1C2521; color: #E7ECE8; font-size: 12px; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 6px 0; font-weight: 600; font-size: 13px; color: #FFFFFF;">${siteTitle}</p>
              <p style="margin: 0 0 6px 0;">${contactAddress}</p>
              <p style="margin: 0 0 12px 0;">Email: <a href="mailto:${contactEmail}" style="color: #68D391; text-decoration: none;">${contactEmail}</a> | Phone: ${contactPhone}</p>
              <p style="margin: 0; color: #A0AEC0; font-size: 11px;">&copy; ${new Date().getFullYear()} ${siteTitle}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export function orderPlaced(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings
): { subject: string; html: string } {
  const orderNumStr = formatOrderId(data.id, data.order_number)
  const subject = `Order Confirmation ${orderNumStr} - Yarl Samayal`
  const html = renderBaseTemplate(
    data,
    items,
    settings,
    'Order Placed',
    `Thank you for your order! We have received your order <strong>${orderNumStr}</strong> and are currently preparing your authentic Jaffna delicacies.`,
    '#2F6B3C'
  )
  return { subject, html }
}

export function orderConfirmed(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings
): { subject: string; html: string } {
  const orderNumStr = formatOrderId(data.id, data.order_number)
  const subject = `Order Confirmed ${orderNumStr} - Yarl Samayal`
  const html = renderBaseTemplate(
    data,
    items,
    settings,
    'Order Confirmed',
    `Great news! Your order <strong>${orderNumStr}</strong> has been officially confirmed by our team and is being processed for fulfillment.`,
    '#2F6B3C'
  )
  return { subject, html }
}

export function orderShipped(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings
): { subject: string; html: string } {
  const orderNumStr = formatOrderId(data.id, data.order_number)
  const subject = `Your Order ${orderNumStr} is on its way!`
  const html = renderBaseTemplate(
    data,
    items,
    settings,
    'Order Shipped',
    `Your order <strong>${orderNumStr}</strong> is on its way! We have dispatched your package and it will be delivered to your delivery address soon.`,
    '#2B6CB0'
  )
  return { subject, html }
}

export function orderDelivered(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings
): { subject: string; html: string } {
  const orderNumStr = formatOrderId(data.id, data.order_number)
  const subject = `Order Delivered ${orderNumStr} - Yarl Samayal`
  const html = renderBaseTemplate(
    data,
    items,
    settings,
    'Order Delivered',
    `Your order <strong>${orderNumStr}</strong> has arrived — we hope you enjoy authentic flavors of Jaffna! Thank you for shopping with us.`,
    '#2F6B3C'
  )
  return { subject, html }
}

export function orderCancelled(
  data: OrderEmailData,
  items: OrderEmailItem[],
  settings: SiteSettings
): { subject: string; html: string } {
  const orderNumStr = formatOrderId(data.id, data.order_number)
  const subject = `Order Cancelled ${orderNumStr} - Yarl Samayal`
  const html = renderBaseTemplate(
    data,
    items,
    settings,
    'Order Cancelled',
    `Your order <strong>${orderNumStr}</strong> has been cancelled. If you believe this is in error or have any questions, please contact our support team.`,
    '#C53030'
  )
  return { subject, html }
}
