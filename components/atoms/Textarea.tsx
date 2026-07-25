import React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, disabled, rows = 3, ...props }, ref) => {
    const generatedId = React.useId()
    const textareaId = id || generatedId

    return (
      <div className="w-full space-y-1 font-sans">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[#1C2521]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full rounded-[4px] border border-[#E7ECE8] bg-white px-3 py-2.5 text-base sm:text-sm text-[#1C2521] placeholder-[#6B7570] transition-colors focus:border-[#2F6B3C] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60',
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

Textarea.displayName = 'Textarea'
