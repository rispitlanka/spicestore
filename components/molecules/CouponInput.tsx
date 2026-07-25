'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '../atoms/Input'
import { Button } from '../atoms/Button'

export interface CouponInputProps extends React.HTMLAttributes<HTMLDivElement> {
  onApply: (code: string) => Promise<{ success: boolean; message?: string } | boolean | void> | void
  onRemove?: () => void
  appliedCode?: string | null
  discountText?: string | null
  disabled?: boolean
  placeholder?: string
}

export const CouponInput: React.FC<CouponInputProps> = ({
  onApply,
  onRemove,
  appliedCode,
  discountText,
  disabled = false,
  placeholder = 'Enter coupon code',
  className,
  ...props
}) => {
  const [code, setCode] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [status, setStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleApplyAction = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const trimmed = code.trim()
    if (!trimmed || disabled || isLoading) return

    setIsLoading(true)
    setStatus(null)

    try {
      const result = await onApply(trimmed)

      if (typeof result === 'object' && result !== null) {
        if (result.success) {
          setStatus({
            type: 'success',
            message: result.message || `Coupon "${trimmed.toUpperCase()}" applied!`,
          })
          setCode('')
        } else {
          setStatus({
            type: 'error',
            message: result.message || 'Invalid or expired coupon code.',
          })
        }
      } else if (result === false) {
        setStatus({
          type: 'error',
          message: 'Invalid or expired coupon code.',
        })
      } else {
        setStatus({
          type: 'success',
          message: `Coupon "${trimmed.toUpperCase()}" applied!`,
        })
        setCode('')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply coupon.'
      setStatus({
        type: 'error',
        message: errorMessage,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleApplyAction()
    }
  }

  const handleClearStatus = () => {
    setStatus(null)
  }

  if (appliedCode) {
    return (
      <div className={cn('flex flex-col gap-1.5 font-sans', className)}>
        <div className="flex items-center justify-between p-3 bg-white border border-[#E7ECE8] rounded-[4px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2F6B3C]">
              Coupon {appliedCode.toUpperCase()} applied
            </span>
            {discountText && <span className="text-xs text-[#6B7570]">({discountText})</span>}
          </div>

          {onRemove && (
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5 font-sans', className)} {...props}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (status) handleClearStatus()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 uppercase text-sm"
        />
        <Button
          type="button"
          onClick={handleApplyAction}
          variant="secondary"
          size="md"
          disabled={!code.trim() || disabled || isLoading}
          isLoading={isLoading}
          className="shrink-0"
        >
          Apply
        </Button>
      </div>

      {status && (
        <div
          className={cn(
            'text-xs font-normal mt-0.5',
            status.type === 'success' ? 'text-[#2F6B3C]' : 'text-rose-600'
          )}
        >
          {status.message}
        </div>
      )}
    </div>
  )
}
