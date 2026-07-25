'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/context/CurrencyContext'
import { formatCurrencyAmount } from '@/lib/currency'

export interface PriceTagProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numeric price amount. Assumed to be in BASE currency (e.g. USD) unless explicit `currency` is passed. */
  amount: number
  /** Optional explicit currency code (e.g. 'LKR', 'USD'). If passed, amount is rendered in this currency without conversion. */
  currency?: string
  /** Optional symbol override (e.g. '$', 'Rs', '£') */
  currencySymbol?: string
  /** Optional locale for formatting */
  locale?: string
  /** Optional original/compare-at price amount (in base currency if no explicit `currency` is set) */
  originalAmount?: number
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg'
}

export const PriceTag: React.FC<PriceTagProps> = ({
  amount,
  currency,
  currencySymbol,
  locale = 'en-US',
  originalAmount,
  size = 'md',
  className,
  ...props
}) => {
  const { convertAmount } = useCurrency()

  // Format main amount
  let formattedMain = ''
  let formattedOriginal = ''

  if (currency) {
    // Explicit currency passed (e.g. historical order view where total_amount_display is already in target currency)
    formattedMain = formatCurrencyAmount(amount, currency, currencySymbol)
    if (originalAmount !== undefined) {
      formattedOriginal = formatCurrencyAmount(originalAmount, currency, currencySymbol)
    }
  } else {
    // Dynamic conversion from base currency to shopper's selected currency
    const mainConverted = convertAmount(amount)
    formattedMain = currencySymbol
      ? formatCurrencyAmount(mainConverted.amount, mainConverted.currency, currencySymbol)
      : mainConverted.formatted

    if (originalAmount !== undefined) {
      const origConverted = convertAmount(originalAmount)
      formattedOriginal = currencySymbol
        ? formatCurrencyAmount(origConverted.amount, origConverted.currency, currencySymbol)
        : origConverted.formatted
    }
  }

  const mainSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  const originalSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  const hasDiscount = originalAmount !== undefined && originalAmount > amount

  return (
    <div className={cn('inline-flex items-baseline gap-2 font-sans', className)} {...props}>
      <span className={cn('text-[#2F6B3C] font-medium tracking-tight', mainSizes[size])}>
        {formattedMain}
      </span>
      {hasDiscount && (
        <span className={cn('text-[#6B7570] line-through font-normal', originalSizes[size])}>
          {formattedOriginal}
        </span>
      )}
    </div>
  )
}
