'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = 'md',
  className,
}) => {
  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(value + 1)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const num = parseInt(e.target.value, 10)
    if (isNaN(num)) return
    if (num >= min && num <= max) {
      onChange(num)
    } else if (num < min) {
      onChange(min)
    } else if (num > max) {
      onChange(max)
    }
  }

  const boxHeight = size === 'sm' ? 'min-h-[44px] sm:min-h-0 h-8 sm:h-8' : 'min-h-[44px] sm:min-h-0 h-9 sm:h-9'
  const buttonWidth = size === 'sm' ? 'min-w-[44px] sm:min-w-0 w-8 text-xs sm:text-xs' : 'min-w-[44px] sm:min-w-0 w-9 text-sm sm:text-sm'
  const inputWidth = size === 'sm' ? 'w-10 text-xs sm:text-xs' : 'w-12 text-sm sm:text-sm'

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[4px] border border-[#E7ECE8] bg-white select-none font-sans',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={cn(
          'inline-flex items-center justify-center font-normal text-[#1C2521] border-r border-[#E7ECE8] hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation',
          boxHeight,
          buttonWidth
        )}
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        className={cn(
          'text-center font-medium text-[#1C2521] bg-white border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          boxHeight,
          inputWidth
        )}
      />
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={cn(
          'inline-flex items-center justify-center font-normal text-[#1C2521] border-l border-[#E7ECE8] hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer touch-manipulation',
          boxHeight,
          buttonWidth
        )}
      >
        +
      </button>
    </div>
  )
}
