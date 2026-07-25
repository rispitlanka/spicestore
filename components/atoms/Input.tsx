import React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, disabled, type = 'text', ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="w-full space-y-1 font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#1C2521]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={cn(
            'w-full min-h-[44px] rounded-[4px] border border-[#E7ECE8] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1C2521] placeholder-[#6B7570] transition-colors focus:border-[#2F6B3C] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
            error && 'border-rose-500 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-600 font-normal">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#6B7570] font-normal">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
